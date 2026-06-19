'use strict';

// 2nd-gen Cloud Functions (Cloud Run based — no App Engine dependency).
const { onSchedule }        = require('firebase-functions/v2/scheduler');
const { onCall, HttpsError } = require('firebase-functions/v2/https');
const { setGlobalOptions }  = require('firebase-functions/v2');
const admin       = require('firebase-admin');
const { BigQuery } = require('@google-cloud/bigquery');

admin.initializeApp();
const db = admin.firestore();

// All functions run in us-central1.
setGlobalOptions({ region: 'us-central1' });

// BigQuery client — uses the function's runtime service account credentials.
// For 2nd-gen the runtime SA is the compute service account
//   113593790107-compute@developer.gserviceaccount.com
// which must be granted BigQuery Data Viewer + Job User on
//   edw-simprogroup-propagation.
const bq = new BigQuery();

const BQ_TABLE = 'edw-simprogroup-propagation.sp_group.group_sales_opportunity';

const QUARTERS = {
  Q1: { start: '2026-01-01', end: '2026-03-31' },
  Q2: { start: '2026-04-01', end: '2026-06-30' },
  Q3: { start: '2026-07-01', end: '2026-09-30' },
  Q4: { start: '2026-10-01', end: '2026-12-31' },
};

const ADMIN_EMAILS = [
  'brad.towers@simprogroup.com',
  'thilo.schatz@simprogroup.com',
  'thilo.schatz@simpro.us',
];

// Maps an app profile.region to its BigQuery sales_region label and the
// app-facing region name used on auto-added AE rows.
const REGION_MAP = {
  UK:         { bq: 'SimPro EU',     appName: 'Simpro UK (VB)' },
  BigChange:  { bq: 'BigChange EU',  appName: 'BigChange UK' },
  US:         { bq: 'SimPro NA',     appName: 'Simpro North America' },
  ANZ:        { bq: 'SimPro ANZ',    appName: 'Simpro ANZ' },
  ClockShark: { bq: 'ClockShark NA', appName: 'ClockShark North America' },
};

function currentQuarter() {
  const today = new Date().toISOString().slice(0, 10);
  for (const [key, qd] of Object.entries(QUARTERS)) {
    if (today >= qd.start && today <= qd.end) return { key, ...qd };
  }
  return null;
}

async function runSync() {
  const qtr = currentQuarter();
  if (!qtr) {
    console.warn('No active quarter for today — skipping sync');
    return { skipped: true };
  }

  console.log(`Starting BQ region sync for ${qtr.key} (${qtr.start} → ${qtr.end})`);

  // All BQ regions we sync (AroFlo deliberately excluded — no SEs there).
  const bqRegions = Object.values(REGION_MAP).map(m => m.bq);

  // 1. Query BigQuery — total Closed Won MRR (USD) per AE (owner_name), per region.
  const query = `
    SELECT
      sales_region,
      owner_name                              AS ae_name,
      SUM(CAST(CW_MRR_amount_USD AS FLOAT64)) AS cw_usd,
      COUNT(*)                                AS deal_count
    FROM \`${BQ_TABLE}\`
    WHERE closed_won   = 1
      AND owner_name  IS NOT NULL
      AND close_date >= @q_start
      AND close_date <= @q_end
      AND sales_region IN UNNEST(@regions)
    GROUP BY sales_region, owner_name
  `;

  const [rows] = await bq.query({
    query,
    params: { q_start: qtr.start, q_end: qtr.end, regions: bqRegions },
    types:  { q_start: 'STRING',  q_end: 'STRING', regions: ['STRING'] },
  });

  console.log(`BQ returned ${rows.length} AE rows across ${bqRegions.length} region(s)`);

  // 2. Group AE rows by BQ region.
  const byBqRegion = {};
  for (const row of rows) {
    const region = row.sales_region;
    if (!byBqRegion[region]) byBqRegion[region] = [];
    byBqRegion[region].push({
      name:  (row.ae_name || '').trim(),
      cwUSD: Number(row.cw_usd) || 0,
    });
  }

  const regionsSynced = [];
  const aesAdded      = [];

  // 3. Write one regionPools doc per app region (regionKey_quarter).
  for (const [regionKey, map] of Object.entries(REGION_MAP)) {
    const aeRows = byBqRegion[map.bq] || [];
    if (!aeRows.length) {
      console.warn(`No BQ data for region "${map.bq}" (${regionKey}) this quarter`);
    }

    const aes = aeRows
      .sort((a, b) => b.cwUSD - a.cwUSD)
      .map(r => ({ name: r.name, cwUSD: r.cwUSD, aeRegion: map.appName }));

    aes.forEach(a => aesAdded.push(a.name));

    await db.collection('regionPools').doc(`${regionKey}_${qtr.key}`).set({
      region:     regionKey,
      regionName: map.appName,
      quarter:    qtr.key,
      aes,
      totalCwUSD: aes.reduce((s, a) => s + a.cwUSD, 0),
      lastBqSync: admin.firestore.FieldValue.serverTimestamp(),
    });

    regionsSynced.push(regionKey);
  }

  await writeSyncLog(qtr.key, regionsSynced, aesAdded, rows.length);

  console.log(`Sync done: ${regionsSynced.length} region pool(s) written, ${aesAdded.length} AE row(s)`);
  return { regionsSynced: regionsSynced.length, aesSynced: aesAdded.length, quarter: qtr.key };
}

function writeSyncLog(quarter, regionsSynced, aesAdded, totalRows) {
  return db.collection('syncLog').doc('latest').set({
    syncedAt:   admin.firestore.FieldValue.serverTimestamp(),
    quarter,
    regionsSynced,
    aesAdded,
    totalRows,
  });
}

// ── Scheduled: daily at 2 am UTC (2nd-gen, uses Cloud Scheduler directly) ────
exports.bqDailySync = onSchedule(
  { schedule: '0 2 * * *', timeZone: 'UTC' },
  async () => { await runSync(); }
);

// ── Callable: admin manual trigger (2nd-gen) ─────────────────────────────────
exports.bqManualSync = onCall(async (request) => {
  const email = request.auth && request.auth.token && request.auth.token.email;
  if (!email || !ADMIN_EMAILS.includes(email)) {
    throw new HttpsError('permission-denied', 'Admin access required');
  }
  return runSync();
});
