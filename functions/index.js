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

// Comp runs on monthly MRR. We sync every month of this year in one pass.
const SYNC_YEAR  = '2026';
const YEAR_START = SYNC_YEAR + '-01-01';
const YEAR_END   = SYNC_YEAR + '-12-31';

const ADMIN_EMAILS = [
  'brad.towers@simprogroup.com',
  'thilo.schatz@simprogroup.com',
  'thilo.schatz@simpro.us',
];

// Maps an app profile.region to its BigQuery sales_region label and the
// app-facing region name used on auto-added AE rows.
const REGION_MAP = {
  UK:         { bq: 'SimPro EU',     appName: 'Simpro UK' },
  BigChange:  { bq: 'BigChange EU',  appName: 'BigChange UK' },
  US:         { bq: 'SimPro NA',     appName: 'Simpro North America' },
  ANZ:        { bq: 'SimPro ANZ',    appName: 'Simpro ANZ' },
  ClockShark: { bq: 'ClockShark NA', appName: 'ClockShark North America' },
};

async function runSync() {
  console.log(`Starting BQ monthly region sync for ${SYNC_YEAR}`);

  // BQ region label → app region key + display name (AroFlo excluded).
  const bqToRegion = {};
  Object.entries(REGION_MAP).forEach(([key, m]) => { bqToRegion[m.bq] = { key, appName: m.appName }; });
  const bqRegions = Object.values(REGION_MAP).map(m => m.bq);

  // 1. One query: Closed Won MRR (USD) per AE, per region, per month of the year.
  const query = `
    SELECT
      sales_region,
      owner_name                              AS ae_name,
      FORMAT_DATE('%Y-%m', close_date)        AS month,
      SUM(CAST(CW_MRR_amount_USD AS FLOAT64)) AS cw_usd
    FROM \`${BQ_TABLE}\`
    WHERE closed_won   = 1
      AND owner_name  IS NOT NULL
      AND close_date >= @y_start
      AND close_date <= @y_end
      AND sales_region IN UNNEST(@regions)
    GROUP BY sales_region, owner_name, month
  `;

  const [rows] = await bq.query({
    query,
    params: { y_start: YEAR_START, y_end: YEAR_END, regions: bqRegions },
    types:  { y_start: 'STRING',   y_end: 'STRING', regions: ['STRING'] },
  });

  console.log(`BQ returned ${rows.length} AE-month rows`);

  // 2. Group by app region key → month → AE list.
  const byRegionMonth = {};
  for (const row of rows) {
    const r = bqToRegion[row.sales_region];
    if (!r) continue;
    const month = row.month;
    (byRegionMonth[r.key] = byRegionMonth[r.key] || {});
    (byRegionMonth[r.key][month] = byRegionMonth[r.key][month] || []);
    byRegionMonth[r.key][month].push({
      name:  (row.ae_name || '').trim(),
      cwUSD: Number(row.cw_usd) || 0,
    });
  }

  // 3. Write one regionPools doc per region per month with data: {regionKey}_{YYYY-MM}.
  const monthsSet = {};
  const regionsSet = {};
  let docCount = 0, aeRowCount = 0;

  for (const [regionKey, map] of Object.entries(REGION_MAP)) {
    const months = byRegionMonth[regionKey] || {};
    for (const [month, aeRows] of Object.entries(months)) {
      const aes = aeRows
        .sort((a, b) => b.cwUSD - a.cwUSD)
        .map(r => ({ name: r.name, cwUSD: r.cwUSD, aeRegion: map.appName }));
      await db.collection('regionPools').doc(`${regionKey}_${month}`).set({
        region:     regionKey,
        regionName: map.appName,
        month,
        aes,
        totalCwUSD: aes.reduce((s, a) => s + a.cwUSD, 0),
        lastBqSync: admin.firestore.FieldValue.serverTimestamp(),
      });
      docCount++;
      aeRowCount += aes.length;
      monthsSet[month] = true;
      regionsSet[regionKey] = true;
    }
  }

  const monthsSynced  = Object.keys(monthsSet).sort();
  const regionsSynced = Object.keys(regionsSet);
  await writeSyncLog(monthsSynced, regionsSynced, aeRowCount, rows.length);

  console.log(`Sync done: ${docCount} region-month pool(s), ${aeRowCount} AE row(s), months ${monthsSynced.join(', ')}`);
  return { pools: docCount, aesSynced: aeRowCount, months: monthsSynced.length };
}

function writeSyncLog(monthsSynced, regionsSynced, aesAdded, totalRows) {
  return db.collection('syncLog').doc('latest').set({
    syncedAt:    admin.firestore.FieldValue.serverTimestamp(),
    monthsSynced,
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
