# SE Quota Tracker: Data Source & Discrepancy Analysis

**Purpose:** This document explains exactly where the Closed Won (CW) numbers come from in the SE Quota Tracker, how they are extracted and transformed, and lists every known potential source of discrepancy if your numbers don't match the CRO dashboard or other systems also using BigQuery.

---

## 1. Data Source

### Table
- **BigQuery:** `edw-simprogroup-propagation.sp_group.group_sales_opportunity`
- **Dataset:** `sp_group`
- **Project:** `edw-simprogroup-propagation`

### Exact SQL Query
```sql
SELECT
  sales_region,
  owner_name                              AS ae_name,
  FORMAT_DATE('%Y-%m', close_date)        AS month,
  SUM(CAST(CW_MRR_amount_USD AS FLOAT64)) AS cw_usd
FROM `edw-simprogroup-propagation.sp_group.group_sales_opportunity`
WHERE closed_won   = 1
  AND owner_name  IS NOT NULL
  AND close_date >= @y_start
  AND close_date <= @y_end
  AND sales_region IN UNNEST(@regions)
GROUP BY sales_region, owner_name, month
```

**Runtime Parameters:**
- `y_start` = `'2026-01-01'`
- `y_end` = `'2026-12-31'`
- `regions` = array of 5 BQ region labels (see Region Mapping below)

---

## 2. Filters Applied

Every row returned by the query must satisfy ALL of these conditions:

### Filter 1: `closed_won = 1`
- **Type:** Integer equality (not boolean)
- **Meaning:** Only opportunities with deal status = "closed won"
- **Edge cases to consider:**
  - Partially-won deals may not have `closed_won = 1`
  - Renegotiated or re-closed deals might be counted multiple times if there are separate rows
  - The definition of "closed won" is whatever Salesforce + BQ ETL defines it as

### Filter 2: `owner_name IS NOT NULL`
- **Type:** Null check
- **Meaning:** Only rows where the opportunity has an owner assigned
- **Impact:** Any unowned opportunities (likely rare, but possible) are excluded
- **Discrepancy source:** If the CRO dashboard does NOT filter on null owner, it will have higher totals

### Filter 3: `close_date >= '2026-01-01' AND close_date <= '2026-12-31'`
- **Type:** Date range filter on calendar year 2026
- **Meaning:** Only deals that CLOSED in 2026
- **Critical detail:** This is `close_date`, NOT `created_date` or `booking_date`
  - A deal booked in 2025 but closed in 2026 IS included
  - A deal booked in 2026 but not yet closed IS excluded
- **Sync frequency:** This range is fixed; prior-year deals are not synced, future deals are excluded until they close

### Filter 4: `sales_region IN UNNEST(@regions)`
- **Type:** Array membership filter
- **Meaning:** Only the 5 BQ region labels listed in Region Mapping (below) are included
- **Impact:** Two regions are EXCLUDED:
  - `AroFlo ANZ` (no app users in this region)
  - `SimPro Other` (catch-all for unmapped regions)

**Exclusion Impact:** If the CRO dashboard includes AroFlo or SimPro Other, or if deals are incorrectly tagged to those regions in BQ, discrepancies will appear.

---

## 3. Dollar Amount Field: CW_MRR_amount_USD

### Field Definition
- **Name:** `CW_MRR_amount_USD`
- **Type:** Numeric (converted to FLOAT64 in the query)
- **Unit:** USD Monthly Recurring Revenue
- **Aggregation:** Summed per (region, owner_name, month)

### What This Means
- **MRR** = Monthly Recurring Revenue, not total contract value, ACV, ARR, or one-time fees
- This is the monthly committed revenue from the won deal
- Example: A 12-month contract for $12,000 shows as $1,000 MRR

### Critical Discrepancy Source
**This is likely the #1 reason for number mismatches:**

If the CRO dashboard uses a different field — such as:
- `total_contract_value` (sum of all months at once)
- `arr_amount_usd` (annualized)
- `acv_amount_usd` (annual contract value, may differ from ARR)
- `one_time_revenue` (upfront fees)
- Any other revenue field

...then the numbers will NOT match. The CRO dashboard would be larger (if using ACV/ARR) or structured entirely differently.

**Action:** Confirm with your data warehouse team that the CRO dashboard is also using `CW_MRR_amount_USD` for this comparison.

---

## 4. Region Mapping: BQ → App

The app reads `sales_region` from BigQuery and maps it to an internal region key, then stores and displays the `regionName` (human-friendly label).

| App Region Key | BQ sales_region | Display Name | Status |
|---|---|---|---|
| `UK` | `SimPro EU` | Simpro UK | Synced |
| `BigChange` | `BigChange EU` | BigChange UK | Synced |
| `US` | `SimPro NA` | Simpro North America | Synced |
| `ANZ` | `SimPro ANZ` | Simpro ANZ | Synced |
| `ClockShark` | `ClockShark NA` | ClockShark North America | Synced |

### Excluded Regions
- **`AroFlo ANZ`** — Explicitly excluded in code (comment: "AroFlo excluded"); no app users in this region
- **`SimPro Other`** — Not in the mapping; deals tagged to this BQ region are excluded from the app

**Discrepancy source:** If you see deals in the CRO dashboard tagged to AroFlo or SimPro Other, they will NOT appear in the Quota Tracker.

---

## 5. Attribution Logic: How Deals Are Assigned

### By AE (owner_name)
- The query groups by **`owner_name`** — the Salesforce field for the Account Executive who owns the opportunity
- Each AE's CW is summed per month per region
- In the UI, AE names appear in a sortable, read-only table

### NOT by sales_engineer
- The `sales_engineer` field in BQ is **not used** for attribution
- **Reason:** In practice, `sales_engineer` is often NULL or contains raw Salesforce User IDs (e.g., `0052u000000otg3AAA`) instead of human names
- **Implication:** If the CRO dashboard attributes deals to SEs by the `sales_engineer` field, and you're comparing CW per SE, the numbers will differ

### Date Attribution: close_date
- Each deal is attributed to the **month it closed** (the `close_date` field)
- Not the month it was booked, created, or won internally
- Format: `YYYY-MM` (e.g., `2026-06` for June 2026)

**Discrepancy source:** If the CRO dashboard uses a different date field (e.g., booking date, decision date), monthly totals will shift.

---

## 6. Currency Handling: No Live FX Conversion

### Data Pipeline
- **In BQ:** Amounts are already in USD (`CW_MRR_amount_USD`); the query does not perform any FX conversion
- **In Firestore:** Amounts are stored as-is in USD in the `totalCwUSD` and `aes[].cwUSD` fields
- **In the UI:** All amounts are displayed with a `$` symbol and no FX adjustment

### Why No Conversion?
- The assumption is that all `CW_MRR_amount_USD` values in BQ are pre-converted to USD
- If deals are booked in GBP, AUD, or other currencies, the BQ ETL layer is responsible for converting them to USD at the time of close

### FX Rate Field in the UI
- The UI has an `fxRate` input field (visible in the left sidebar under "Comp Plan")
- **This field is disabled** (`disabled=true` in HTML)
- **It is hardcoded to 1.0** and only affects display labels, not calculations
- **Legacy artifact:** This field was used in an old editable AE pool model; it has no effect on BQ-synced data

**Implication:** If you need to apply post-sync FX conversion (e.g., to normalize non-USD amounts that slipped through), it would require code changes to the frontend or a pre-processing step in the Cloud Function.

---

## 7. Sync Process & Timing

### Schedule
- **Frequency:** Nightly at **2:00 AM UTC** via Cloud Scheduler
- **Mechanism:** Firebase Cloud Function `bqDailySync` (2nd-gen)
- **Manual trigger:** Admins can click "Sync Now" in the Team View tab to refresh immediately

### What Gets Synced
- One Firestore document per region per month
- Document ID: `{regionKey}_{YYYY-MM}` (e.g., `UK_2026-06`)
- Document structure:
  ```json
  {
    "region": "UK",
    "regionName": "Simpro UK",
    "month": "2026-06",
    "aes": [
      { "name": "AE Name", "cwUSD": 12345.67, "aeRegion": "Simpro UK" },
      ...
    ],
    "totalCwUSD": 999999.99,
    "lastBqSync": <server-timestamp>
  }
  ```
- AE rows are sorted descending by `cwUSD` (highest CW first)

### Staleness
- **Best case:** Data synced within the last 2 hours (if you sync right after 2 AM UTC)
- **Worst case:** Data up to 24 hours stale (if you sync just before 2 AM UTC)
- **Time zone:** All timestamps are in UTC; the sync happens regardless of your local time zone

**Discrepancy source:** If you compare the Quota Tracker to a live query of BQ or another system syncing on a different schedule, you may see different numbers for deals that closed very recently.

---

## 8. Monthly-Only Data Model

The app operates exclusively on a **monthly grain**, not quarterly or annual:

- One Firestore doc per region per **month**
- All quota calculations are for a monthly period (quota ÷ 3 from quarterly entries)
- Commission is earned and estimated independently each month
- The month selector (Jan–Dec 2026) drives all views

**Why this matters for discrepancies:**
- If the CRO dashboard reports by quarter or fiscal period, and you're comparing monthly breakdowns, you'll need to aggregate
- Monthly totals should sum to quarterly/annual totals, but not vice versa without understanding the CRO's grouping logic

---

## 9. Potential Discrepancy Sources: Prioritized Checklist

Use this list to debug mismatches between the Quota Tracker and the CRO dashboard (or any other BQ query):

### 1. **Dollar Amount Field** ⚠️ MOST LIKELY
- [ ] Confirm CRO uses `CW_MRR_amount_USD`, NOT `total_contract_value`, `arr_amount_usd`, `acv_amount_usd`, etc.
- [ ] If CRO uses a different field, that's your discrepancy (not a bug)

### 2. **Date Field**
- [ ] Confirm both use `close_date`, NOT `created_date`, `booking_date`, or `last_modified_date`
- [ ] Monthly breakdowns will shift if different date fields are used

### 3. **Region Filter**
- [ ] Check if CRO dashboard includes `AroFlo ANZ` or `SimPro Other`
- [ ] The Quota Tracker explicitly excludes these; if the CRO includes them, you'll see a gap

### 4. **Ownership Attribution**
- [ ] Confirm CRO groups by `owner_name` (AE), NOT `sales_engineer` (often NULL in BQ)
- [ ] If CRO uses `sales_engineer`, SE-level totals will differ

### 5. **Sync Staleness**
- [ ] Check when each system last synced
- [ ] Deals that closed in the last 24 hours may not yet appear in the Quota Tracker
- [ ] Use "Sync Now" (admin only) to force an immediate refresh

### 6. **closed_won Filter**
- [ ] Confirm both systems filter `closed_won = 1` (integer equality)
- [ ] Edge case: deals with partial closes or renegotiations may be counted differently

### 7. **Date Range / Year Scope**
- [ ] The Quota Tracker only syncs calendar year 2026 (2026-01-01 to 2026-12-31)
- [ ] Prior-year deals and future deals are excluded
- [ ] If CRO dashboard includes deals from 2025 or 2027, that's your discrepancy

### 8. **Null owner_name Handling**
- [ ] The Quota Tracker excludes deals where `owner_name IS NULL`
- [ ] If the CRO dashboard has logic to assign null-owner deals to a default AE or team, totals will differ

### 9. **FX Conversion**
- [ ] The Quota Tracker assumes all amounts in BQ are pre-converted to USD
- [ ] If non-USD deals exist in BQ and the CRO applies runtime FX, check if BQ ETL is converting them

---

## 10. How to Debug a Discrepancy

### Step 1: Isolate the Scope
1. **Pick one month** (e.g., June 2026)
2. **Pick one region** (e.g., UK)
3. Get the Quota Tracker total (visible in the UI)
4. Run a manual BQ query with identical filters

### Step 2: Manual BQ Query
```sql
SELECT
  owner_name,
  SUM(CAST(CW_MRR_amount_USD AS FLOAT64)) AS cw_usd
FROM `edw-simprogroup-propagation.sp_group.group_sales_opportunity`
WHERE closed_won = 1
  AND owner_name IS NOT NULL
  AND close_date >= '2026-06-01'
  AND close_date <= '2026-06-30'
  AND sales_region = 'SimPro EU'  -- for UK region
GROUP BY owner_name
ORDER BY cw_usd DESC
```

Compare the total in this query to the Quota Tracker's June UK total.

### Step 3: Identify the Delta
- **Exactly matches:** No data pipeline issue; check the CRO query for filter differences
- **Off by field type:** Likely using a different amount field (ACV, ARR, contract value, etc.)
- **Off by region:** Check that BQ region label matches the app's mapping
- **Off by date:** Confirm you're filtering on the correct date field
- **Off by AE:** Check if the CRO attributes to a different field (sales_engineer vs owner_name)

### Step 4: Ask the Data Warehouse Team
- What fields and filters does the CRO dashboard query use?
- Is `closed_won = 1` an integer or boolean in their version?
- Are they excluding any regions?
- Do they apply FX conversion at query time or in ETL?

---

## 11. Files & Code References

| File | Lines | Purpose |
|---|---|---|
| `functions/index.js` | 46–74 | BQ query definition |
| `functions/index.js` | 97–116 | Firestore write logic |
| `public/index.html` | 1148–1201 | `loadPool()` — fetch and read Firestore |
| `public/index.html` | 1344–1365 | `loadIcMonthlyData()` — load 12 months for charts |
| `public/index.html` | 1744–1836 | `buildAETable()` — render AE pool in UI |
| `public/index.html` | 1988–2077 | `recalc()` — calculate KPIs from pool |

---

## Summary

The SE Quota Tracker pulls **Monthly Recurring Revenue (MRR) in USD** for **closed deals (closed_won = 1)** attributed to an **Account Executive (owner_name)** in one of **5 mapped regions**, grouped by the **month it closed**, and updated nightly at **2 AM UTC**.

If your Quota Tracker numbers don't match another system, the most likely culprits are:
1. Different amount field (MRR vs ACV/ARR/contract value)
2. Different date field (close_date vs booking/creation date)
3. Different region or ownership grouping
4. Sync timing (data is up to 24 hours behind)

Use the checklist in Section 9 to systematically rule out each possibility.
