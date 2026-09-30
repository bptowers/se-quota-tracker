# SE Attainment Tracker — Comprehensive User Guide

**A complete reference guide for the Simpro Group SE Attainment Tracker application.**

**App URL:** https://se-quota-tracker.web.app

**Last Updated:** July 2026

---

## Table of Contents

1. [Overview](#overview)
2. [Key Concepts & Commission Model](#key-concepts--commission-model)
3. [Data Sources & Flow](#data-sources--flow)
4. [Data Accuracy & Reconciliation](#data-accuracy--reconciliation)
5. [Getting Started](#getting-started)
6. [My Dashboard](#my-dashboard)
7. [Team View (Leaders/Admins)](#team-view-leadersadmins)
8. [Report Tab (Admins Only)](#report-tab-admins-only)
9. [Calculations & Formulas](#calculations--formulas)
10. [FAQ & Troubleshooting](#faq--troubleshooting)
11. [Glossary](#glossary)

---

## Overview

The SE Attainment Tracker is a real-time attainment and commission tracking tool for Simpro Group Sales Engineers. It pulls actual Closed Won revenue from BigQuery (our data warehouse) and calculates commission payouts based on each SE's individual comp plan.

**Key features:**
- Real-time Closed Won data synced nightly from BigQuery
- Monthly attainment tracking against team and personal quotas
- Monthly commission estimates based on each month's attainment
- Personal dashboard for each SE with commission projections
- Admin tools for team oversight, quota management, and payroll audits
- Full-year commission breakdown report showing the app's month-by-month estimate for each SE; Finance certifies actual payments

**Who can access what:**
- **Sales Engineers (ICs):** My Dashboard only — your own region's attainment and commission
- **Leaders/Admins:** All features — team overview, quota management, per-SE viewing, full commission report
- **Brad Towers (CEO/Leadership):** All features + global cross-region view

**Currency, units & estimates:**
- All figures are in **USD**. Quotas are *issued* in USD and converted to local currency by the company at payout — a banner across the top of the app states this.
- Closed Won is measured as **monthly recurring revenue (MRR)**. The company's CRO reporting tool shows the same deals in **ARR** (Annual Recurring Revenue ≈ MRR × 12), so a figure here will look ~12× smaller than the same figure in the CRO tool — that is expected, not an error.
- Every number is an **estimate for planning**. Actual commission is certified by Finance and may vary.

---

## Key Concepts & Commission Model

### 1. Monthly Commission Model

The tracker estimates each month's commission independently from that month's regional Closed Won, the selected SE's personal monthly quota, and monthly commission target. Regional quotas are used only for team and leader rollups.

**Formula:**
```
Monthly Attainment = Monthly Closed Won ÷ Monthly Quota
Estimated [Earning Month] Commission = min(Monthly Attainment, 200%) × Monthly Commission Target
```

Commission starts with the first dollar of attainment and is capped at 200% of the monthly commission target. The figure remains an estimate until Finance certifies it.

### 2. Individual vs. Team Attainment

**IC attainment (what appears on an SE dashboard):**
- Uses the selected SE's **regional Closed Won pool** as the numerator
- Uses that SE's **personal monthly quota** as the denominator
- Formula: `Region Closed Won (USD) ÷ SE Personal Monthly Quota`
- SEs in the same region share the Closed Won numerator, but their attainment percentages can differ if their personal quotas differ

**Team and leader rollups:**
- Use the same regional Closed Won data against the admin-managed **regional monthly quota**
- These rollups are operational views and do not replace the selected SE's personal quota in IC commission calculations

**Region CW Pool:**
- Combines Closed Won from all AEs (Account Executives) in that region
- AE names and Closed Won amounts come from BigQuery
- Updated nightly via Cloud Function sync

### 3. Commission Start & Cap

**No floor:** Commission starts at the first dollar of attainment. Under the current app model, 25% attainment estimates 25% of the monthly commission target.

**200% commission-target cap:** Monthly commission maxes out at 2× the monthly commission target. Attainment above 200% does not increase the monthly estimate.
- Example: If the monthly commission target is $900 and monthly attainment is 250%, the estimate is $1,800, not $2,250.

### 4. OTE (On-Target Earnings)

**Annual Total OTE:** Your total annual on-target cash earnings (base plus variable). Set once during onboarding.

**Monthly Commission Target:** Calculated automatically as `Annual Total OTE × 30% ÷ 12`
- The 30% represents the commission-eligible portion (rest is base salary)
- Used as the multiplier for monthly commission payout
- Example: Annual Total OTE $36,000 → Monthly Commission Target = $36,000 × 0.30 ÷ 12 = $900/month

### 5. Quota Structure

**Quarterly quotas:** Entered once per SE (or per region for centralized management)
- Stored in Firestore as `{ Q1: $X, Q2: $Y, Q3: $Z, Q4: $W }`
- Admin can edit region quotas in Team View; individual SEs can edit personal quotas in onboarding

**Monthly quota:** Automatically calculated as `Quarterly Quota ÷ 3`
- Distributes the quarterly target evenly across 3 months
- Used for monthly attainment % calculation

### 6. Monthly Commission Rate

The tracker applies the same monthly attainment percentage to the monthly commission target, capped at 200%. Quarterly and annual summaries are the sum of the monthly estimates in those periods.

---

## Data Sources & Flow

### 1. Closed Won Data (BigQuery)

**Source Table:** `edw-simprogroup-propagation.sp_group.group_sales_opportunity`

**Query:**
```sql
SELECT
  sales_region,
  owner_name (AE name),
  FORMAT_DATE('%Y-%m', close_date) (Month),
  SUM(CAST(CW_MRR_amount_USD AS FLOAT64)) (Closed Won USD)
FROM [table]
WHERE
  closed_won = 1 (status filter)
  AND owner_name IS NOT NULL (has owner)
  AND close_date >= '2026-01-01' AND close_date <= '2026-12-31' (year filter)
  AND sales_region IN ('SimPro EU', 'BigChange EU', 'SimPro NA', 'SimPro ANZ', 'ClockShark NA')
GROUP BY sales_region, owner_name, month
```

**Key Points:**
- **MRR only** — Monthly Recurring Revenue, not ACV or contract value
- **Closed Won filter** — only deals with status = won, not pipeline or proposals
- **Initial Sales only** — confirmed by Revenue Operations (no expansions)
- **By month** — grouped by close date, not booking or signature date
- **By AE name** — not by Sales Engineer (SE field is often NULL)

### 2. Region Mapping (BQ → App)

| App Region Key | BigQuery sales_region | Display Name |
|---|---|---|
| `UK` | SimPro EU | Simpro UK |
| `BigChange` | BigChange EU | BigChange UK |
| `US` | SimPro NA | Simpro North America |
| `ANZ` | SimPro ANZ | Simpro ANZ |
| `ClockShark` | ClockShark NA | ClockShark North America |

**Excluded regions:**
- AroFlo ANZ — no app users
- SimPro Other — unmapped deals

### 3. Firestore Data Model

#### regionPools Collection
**Document ID:** `{regionKey}_{YYYY-MM}` (e.g., `UK_2026-06`)

**Structure:**
```json
{
  "region": "UK",
  "regionName": "Simpro UK",
  "month": "2026-06",
  "aes": [
    { "name": "AE Full Name", "cwUSD": 12345.67, "aeRegion": "Simpro UK" },
    { "name": "Another AE", "cwUSD": 98765.43, "aeRegion": "Simpro UK" }
  ],
  "totalCwUSD": 111111.10,
  "lastBqSync": <Firestore Timestamp>
}
```

**Written by:** Cloud Function `bqDailySync` (runs nightly at 2 AM UTC)
**Read by:** All dashboard views for attainment calculation

#### regionConfig Collection
**Document ID:** One per region (e.g., `UK`, `BigChange`)

**Structure:**
```json
{
  "quotas": {
    "Q1": 250000,
    "Q2": 300000,
    "Q3": 275000,
    "Q4": 350000
  },
  "updatedBy": "brad.towers@simprogroup.com",
  "updatedAt": <Firestore Timestamp>
}
```

**Written by:** Admin through Team View quota editor
**Fallback:** If not set, uses `DEFAULT_REGION_QUOTAS` constant

#### users Collection
**Document ID:** Hashed user email (e.g., `user_abc123def456`)

**Structure:**
```json
{
  "uid": "user_abc123def456",
  "email": "austin.huddleson@simprogroup.com",
  "displayName": "Austin Huddleson",
  "region": "US",
  "currency": "$",
  "fx": 1.0,
  "annualOTE": 36000,
  "monthlyOTE": 900,
  "quotas": {
    "Q1": 75000,
    "Q2": 85000,
    "Q3": 80000,
    "Q4": 100000
  },
  "onboarded": true,
  "isAdmin": false,
  "firebaseUid": "firebase_uid_string"
}
```

**Written by:** User during onboarding and profile updates
**Read by:** Dashboard for personal commission calculation

### 4. Data Sync Flow

```
BigQuery (nightly 2 AM UTC)
    ↓
Cloud Function bqDailySync
    ↓
regionPools/{regionKey}_{YYYY-MM} docs written to Firestore
    ↓
App loads regionPools on dashboard init
    ↓
User views attainment % and monthly commission estimates are calculated locally
```

**Manual refresh:** Admins can click "Sync Now" to trigger immediate sync

---

## Data Accuracy & Reconciliation

The tracker is a faithful mirror of the BigQuery warehouse (`group_sales_opportunity`). Validated July 2026:

- Every region's Closed Won in the app matches the warehouse **to the dollar, month by month** — no deals are dropped or double-counted. Attribution is by the warehouse's `sales_region` label (not name-matching), so nothing is lost to a spelling mismatch.
- The app measures **MRR**; the CRO tool shows **ARR**. When comparing them, ARR ≈ MRR × 12, and the ratio varies slightly by region (≈ 11.7–12.3) because the CRO annualises by contract term/fees rather than a flat ×12.
- The warehouse is a nightly-propagated copy, so a live CRO figure can run slightly ahead of the app until the next sync.

**Bottom line:** if a number here differs from the CRO tool, the difference is upstream (units or sync timing), not a calculation error in the app. One exclusion by design: deals with no assigned owner are not counted.

---

## Getting Started

### Sign In

> **📷 Screenshot: The Google sign-in / landing page**
>
> *Paste your screenshot here, then delete this placeholder line.*

1. Go to **https://se-quota-tracker.web.app**
2. Click **Sign in with Google**
3. Choose your work Google account from the approved domains:
   - simprogroup.com
   - simpro.us
   - simpro.au
   - simpro.nz
   - bigchange.com
   - clockshark.com

### First-Time Onboarding

> **📷 Screenshot: The onboarding wizard (name + regions, then OTE & quarterly quotas)**
>
> *Paste your screenshot here, then delete this placeholder line.*

You'll be guided through a one-time setup:

**Step 1: Personal Info**
- **Name:** Your full name (auto-filled from Google)
- **Regions you support:** Tick **one or more** of UK, BigChange, ANZ, US, or ClockShark (this is a multi-select — most SEs pick one)
  - Determines which region's Closed Won pool feeds your attainment %; if you support more than one, your attainment combines all of them
  - The **first** region ticked sets your currency symbol and default quota prefill (e.g. ANZ prefills the ANZ Initial Sale MRR quotas)
  - Admins can view any region; ICs see their own region(s) only

**Step 2: Compensation Plan**
- **Annual Total OTE:** Your total on-target cash earnings (base plus variable; e.g., $36,000)
  - Stored as-is; Monthly Commission Target is calculated as Annual Total OTE × 0.30 ÷ 12
  - You can edit this anytime; changes save automatically
- **Quarterly Quotas (Q1–Q4):** Your region's revenue targets in USD
  - Stored per SE and used as the authoritative quota for that SE's dashboard, charts, scenarios, and history
  - Region-level quotas remain available for team and leader rollups
  - Monthly quota auto-calculated as Quarterly ÷ 3

**Step 3: Launch Dashboard**
- Click "Launch Dashboard" to save and proceed to your dashboard
- You can re-run onboarding anytime via "Reset Profile" button

---

## My Dashboard

### Layout Overview

> **📷 Screenshot: Your full My Dashboard (whole screen)**
>
> *Paste your screenshot here, then delete this placeholder line.*

The dashboard has several sections:

0. **Disclaimer banner** — an amber bar across the top of every tab: *"Quotas are issued in USD and converted to local currency by the company. Results shown are estimates only — actual payments may vary."*
1. **Top bar** — 4 KPI tiles (attainment %, commission $, region CW, days left)
2. **Left sidebar** — Comp plan inputs (OTE, quotas, month selector) and the **Getting Paid** card
3. **Center** — Quota progress bar, charts, AE pool, commission card
4. **Right sidebar** — Quarterly summary, scenario modeler, threshold calculator

### Getting Paid — Payment Schedule

> **📷 Screenshot: The Getting Paid card in the left sidebar**
>
> *Paste your screenshot here, then delete this placeholder line.*

A reference card in the left sidebar showing when commission is paid after each month closes:

| Region | Payment timing |
| --- | --- |
| ANZ | +45 days after month-end |
| UK, US, BigChange & ClockShark | +30 days after month-end |

These are indicative payout lags based on the employee's payroll/home region—not every revenue region included in their commission scope. Finance certifies the final amount and payroll date.

### Top Bar KPIs

> **📷 Screenshot: The four KPI tiles across the top bar**
>
> *Paste your screenshot here, then delete this placeholder line.*

#### 1. Attainment to Quota

**What it shows:** Your selected SE attainment percentage for the selected month, using regional Closed Won against that SE's personal quota.

**How it's calculated:**
```
Attainment % = Region Closed Won (USD) ÷ SE Personal Monthly Quota × 100
```

**Example:**
- Region CW this month: $45,000
- SE personal monthly quota: $50,000
- Attainment: 45,000 ÷ 50,000 = 90%

**Color coding:**
- 🟢 Green (100%+): Quota Hit
- 🔵 Blue (80–99%): On Track
- ⚪ Gray (<80%): Building
- 🟣 Purple (200%+): Capped

**Subtitle:** Shows "$X earned of $Y quota" (regional CW and the selected SE's personal quota for the month)

#### 2. Estimated [Earning Month] Commission

**What it shows:** Your estimated commission payout for the selected month.

**How it's calculated:** Uses the selected month's Closed Won and monthly quota (see [Calculations & Formulas](#calculations--formulas)).

**Label:** The heading names the earning month. The subtitle states both periods explicitly—for example, **"Earned in June 2026 · Expected July 2026 payment."** Payment timing follows the selected employee's payroll/home region.

**Example:**
- Monthly Commission Target: $900
- July attainment: 80%
- Estimated July commission: $900 × 0.80 = $720
- Expected payment month for UK, US, BigChange, and ClockShark: August
- ANZ: expected about 45 days after month-end

#### 3. Net Topline

**What it shows:** Total Closed Won from all AEs in your region for the selected month.

**How it's calculated:**
```
Region Net Topline = SUM(all AE Closed Won for the month)
```

**Data source:** BigQuery, via regionPools Firestore doc

#### 4. Days Remaining

**What it shows:** Calendar days left in the selected month.

**How it's calculated:** Current date vs. end-of-month (28, 29, 30, or 31)

---

### Left Sidebar — Comp Plan Panel

#### Annual Total OTE
- Editable text field
- Your total annual on-target cash earnings (base plus variable)
- Automatically saved to your Firestore profile when you change it

#### Monthly Commission Target (Read-only)
- Auto-calculated as `Annual Total OTE × 0.30 ÷ 12`
- The commission multiplier for monthly calculations

#### Monthly Quota (Read-only)
- Current month's quota target
- Sourced from your selected SE profile in IC views; team and leader rollups use regionConfig
- Calculated as Quarterly Quota ÷ 3

#### Monthly Quotas 2026 (Collapsible sidebar)
- Expands to show all 12 months' quotas for reference
- Each month's quota = its quarter's quota ÷ 3

#### Reset Profile Button
- Restarts onboarding if you need to change your region or OTE
- Clears all local edits; you'll re-enter your comp plan

---

### Month Selector

**Location:** Top-right of the dashboard, next to view buttons

**Function:** Choose which month to view
- Default: Current month
- All 12 months of 2026 available
- Changes update all dashboard metrics, charts, and cards to that month's data

---

### Quota Progress Bar

**What it shows:** Visual progress toward monthly quota

**How it's calculated:**
```
Bar width % = min(Region CW ÷ SE Personal Monthly Quota, 100%) × 100
```

**Markers:**
- 80% line: "On Track" threshold (orange)
- 100% line: "Quota Hit" threshold (green)
- Actual CW label shown numerically

---

### 2026 Monthly Attainment Chart

> **📷 Screenshot: The 2026 Monthly Attainment chart**
>
> *Paste your screenshot here, then delete this placeholder line.*

**Type:** Stacked bar chart, 12 months

**Y-axis:** Attainment % (0–140%, with 100% and 200% cap reference lines)
- Dashed green line at 100% (quota target)

**X-axis:** Months (Jan–Dec)

**Bar colors:**
- 🟢 Green (≥100%): Quota Hit
- 🟠 Orange (80–99%): On Track
- 🔵 Blue (<80%): Building
- ⚪ Gray (no data): Future month

**Hover tooltip:**
- Month name
- Region CW for that month
- Monthly quota
- Attainment %
- Estimated monthly commission

**How it's built:**
1. Load all 12 months of region CW data from regionPools
2. For each month, calculate attainment % and monthly commission
3. Plot attainment as bar height, color by status

---

### AE Revenue Pool

> **📷 Screenshot: The AE Revenue Pool table (expanded)**
>
> *Paste your screenshot here, then delete this placeholder line.*

**What it shows:** All Account Executives in your region and their Closed Won for the selected month.

**Table columns:**
- **AE:** Account Executive name (from BigQuery owner_name)
- **Closed Won (USD):** Sum of MRR for that AE this month

**Sync note:** Shows "Synced [time]" at the top, indicating freshness

**How it's built:**
1. Load regionPools doc for region + month
2. Read `aes[]` array and sort descending by cwUSD
3. Render table with names and amounts

**Data source:** BigQuery, synced nightly

---

### Commission Earned This Month

> **📷 Screenshot: The Commission Earned This Month card**
>
> *Paste your screenshot here, then delete this placeholder line.*

**What it shows:** Three commission-related metrics for the selected month

**Metric 1: Progress bar**
```
Bar width % = Commission Earned ÷ Monthly Commission Target × 100
```
- Fills green as commission accumulates toward your monthly commission target
- Capped at 100% (never exceeds 100% visual width)

**Metric 2: Earned amount ($)**
- Your commission payout for the selected month
- Calculated independently from that month's attainment

**Metric 3: If you maintain current pace**
- Projected end-of-month commission if attainment holds steady
- Formula: `Current Attainment % × Monthly Commission Target`

**Metric 4: If you hit 100% quota**
- Commission if region hits exactly 100% attainment
- Formula: `1.0 × Monthly Commission Target` = `Monthly Commission Target`

---

### Quarterly Summary (Right Sidebar)

> **📷 Screenshot: The Quarterly Summary panel**
>
> *Paste your screenshot here, then delete this placeholder line.*

**What it shows:** Commission earned in each quarter (Q1–Q4) plus annual totals

**For elapsed quarters:**
- **Q1–Q4 rows** show:
  - Total Closed Won (sum of 3 months)
  - Quarterly quota (from user profile)
  - Attainment % = QTD CW ÷ Quarterly Quota
  - Commission = sum of the monthly commission estimates in the quarter

**For future quarters:**
- Shows "Pending" in gray (no data yet)

**Annual row:**
- **YTD (Year-to-Date) Commission:** Sum of all elapsed quarter commissions
- **Projected Annual Commission:** YTD Commission × (4 ÷ number of elapsed quarters)
  - E.g., if it's end of Q2 and YTD = $3,600, projected annual = $3,600 × 2 = $7,200

**How quarterly commission is calculated:**
```
Quarterly Commission = Month 1 Commission + Month 2 Commission + Month 3 Commission
```

---

### Scenario Modeler (Right Sidebar)

> **📷 Screenshot: The Scenario Modeler (what-if) panel**
>
> *Paste your screenshot here, then delete this placeholder line.*

**What it shows:** "What-if" commission projections for the current month

**Inputs:**
- Text field to enter a projected Closed Won amount (pre-filled with actual CW)

**Outputs (recalculate as you type):**

**1. This month:**
- Attainment % at your projected CW
- Estimated monthly commission

**2. This quarter:**
- Combines the monthly commission estimates within the selected quarter
- Shows total quarterly commission to date

**3. Annual run-rate:**
- Projects full-year commission assuming every month matches the attainment % you enter
- Formula: `Projected Attainment % × Annual Commission Target`, capped monthly at 200%

**Use case:** Explore how much CW you need to hit $X commission, or what you'd earn if you over/under-performed.

---

### Threshold Calculator (Right Sidebar)

**What it shows:** CW milestones and what you need to reach them

**Milestones:**
- 50% Quota
- 80% Quota
- 100% Quota (monthly commission target)
- 150% Quota (stretch)
- 200% Quota (capped)

**For each milestone:**
- **"Need $X more"**: Additional CW required from today to hit that milestone
- **"Earn $Y commission"**: Commission paid if you hit that milestone
- **✓ symbol**: Shows if you've already exceeded this milestone

**How it's calculated:**
```
For each milestone:
  Target CW = (Milestone % ÷ 100) × Monthly Quota
  CW Gap = max(0, Target CW - Current Month CW)
  Commission at Milestone = min(Milestone %, 200%) × Monthly Commission Target
```

---

### Admin View Differences (Leaders/Admins)

If you're an admin (determined by Firestore profile `isAdmin: true`), you see:

#### Region Selector Dropdown
- **All Regions:** Global view combining all 5 regions
  - Shows total CW and total quota across all regions
  - Commission tools hidden (no per-SE commission calculation)
  - Useful for exec overview
- **Single region (UK, BigChange, etc.):** Region-specific dashboard
- **Global:** Only available to Brad Towers (CEO); combines his comp plan scope

#### View As Dropdown
- Switch to **Leader** or **IC** (Individual Contributor) mode
- In **IC** mode, also see **SE name picker** to view any SE's dashboard
- Useful for one-on-ones or auditing

---

## Team View (Leaders/Admins)

**Access:** Admins only; click "Team View" in top navigation

**Purpose:** Oversight of all regions and SEs, quota management, and detailed drill-downs

### Top: Quarter Forecast — Pace to Quota

> **📷 Screenshot: The Quarter Forecast — Pace to Quota board (Team View)**
>
> *Paste your screenshot here, then delete this placeholder line.*

A RevOps-focused board at the very top of Team View that answers *"where will we land this quarter?"* For each region (and a **Global** rollup) it shows:

- **QTD Actual** — Closed Won so far this quarter
- **Projected (quarter-end)** — quarter-to-date run-rate: `QTD ÷ days elapsed × days in quarter`
- **% to Quota** — projected attainment against the region quota
- **Gap to 100%** — dollars still needed to hit quota
- **Status** — 🟢 On track (≥100%), 🟠 Watch (≥80%), 🔴 At risk (<80%), or "set quota" if no quota is configured

**Smart early-quarter handling:** run-rate is meaningless in the first ~2 weeks of a quarter, so until then the board shows the **just-completed quarter as Final** (real, settled numbers) and flips to a live projection once the new quarter has enough data. A **"✓ Reconciled to source · synced …"** stamp shows the numbers tie to the BigQuery warehouse.

### Top: Regional Quotas Editor

> **📷 Screenshot: The Regional Quotas editor**
>
> *Paste your screenshot here, then delete this placeholder line.*

**What it shows:** Quarterly quotas for each of the 5 regions

**Editable fields:**
- Q1, Q2, Q3, Q4 (USD) for each region

**How it works:**
1. If region quotas are empty, auto-seeds from all SE personal quotas (averaged or summed)
2. Admin edits quarterly targets
3. Clicks **Save** to persist to Firestore `regionConfig`
4. Team and leader rollup attainment recalculates immediately; IC calculations continue to use each selected SE's personal quota

**Stored in:** Firestore `regionConfig/{regionKey}`

### Region Cards

> **📷 Screenshot: The region cards grid in Team View**
>
> *Paste your screenshot here, then delete this placeholder line.*

**What each card shows:**
- **Region name** (Simpro UK, BigChange UK, etc.)
- **Attainment %** for the selected month
- **Attainment color badge** (green/orange/blue/purple)
- **Closed Won / Quota** (e.g., "$145k / $200k")
- **Number of AEs** in that region
- **Number of SEs** assigned to that region

**How it's calculated:**
```
Region Attainment % = Region CW ÷ Region Quota × 100
```

**Click to drill in:** Opens detailed region view (see below)

### Region Drill-Down View

> **📷 Screenshot: A region drill-down (KPIs, SEs, AE pool)**
>
> *Paste your screenshot here, then delete this placeholder line.*

**What it shows:** Full detail for a single region

#### Region KPIs
- **Attainment %** and progress bar
- **Closed Won** (total for the month)
- **Quota** (monthly quota for this region)
- **Gap to Quota** (how much more CW needed to hit 100%)
- **Gap to 200% Cap** (how much CW needed to hit the 200% attainment cap)

#### Sales Engineers in Region
**Table showing each SE:**
- **Name**
- **Title** (e.g., "Senior Sales Engineer")
- **Monthly Commission Target** (calculated from their annual total OTE)
- **Attainment %** (regional Closed Won divided by that SE's personal monthly quota)
- **Est. Commission** (using that SE-specific monthly attainment)

**Note:** SEs without OTE set show "—"

#### AE Revenue Pool
**Same as on personal dashboard:**
- All AEs in the region for the selected month
- Names and Closed Won amounts
- Sorted descending by CW

### BQ Sync Panel

**What it shows:** Last BigQuery sync details

**Displayed info:**
- **Synced at:** Timestamp of last sync
- **Regions synced:** Which regions had data loaded
- **AE rows added:** Number of AE records from BQ
- **Errors:** Any issues encountered

**Manual "Sync Now" button:** Admins can click to trigger immediate refresh (instead of waiting for 2 AM UTC nightly sync)

---

## Report Tab (Admins Only)

**Access:** Admins only; click "Report" in top navigation

**Purpose:** Comprehensive full-year commission breakdown — a payroll audit tool showing what each SE should have earned month-by-month.

### Report Overview

> **📷 Screenshot: The Report tab (chart + attainment summary)**
>
> *Paste your screenshot here, then delete this placeholder line.*

**What it shows:**
1. **Team KPIs** (top): Team size, avg attainment YTD, months at quota, regions with data
2. **Monthly Attainment Chart**: Attainment % by SE across last 3 elapsed months
3. **Team Attainment Summary Table**: One row per SE, showing last 3 months' attainment % and status badge
4. **Individual SE Cards**: One card per SE (expandable) showing YTD commission and per-month detail
5. **2026 Commission Breakdown** (bottom): Full-year, month-by-month commission report

### Date & Context

**Report Date:** Generated date shown at top (e.g., "June 19, 2026")

**Sample View Badge:** Indicates this is a sample/demo view (not yet live data)

### Filter Bar

**SE Selector Dropdown:**
- Default: "All SEs"
- Filters the attainment chart and summary table to a single SE

**Active when:** Admin selects an SE name
- Chart title updates to "{SE Name} — last X months"
- Summary table shows only that SE's row

### Team KPIs Grid

**4 metrics displayed:**
1. **Team Size**: Number of SEs in the report (16 ICs across 5 regions)
2. **Avg Attainment (YTD)**: Average of all SE-month attainment % for elapsed months
3. **Months at Quota**: Count of (SE, month) pairs where attainment ≥ 100%
4. **Regions Live**: Number of regionPools docs with data in Firestore

---

### Monthly Attainment Chart

**Type:** Grouped bar chart

**What it shows:** Attainment % for each SE across last 3 elapsed months
- One bar per SE
- One group per month
- Y-axis: Attainment % (0–140%, with 100% and 200% cap lines)
- X-axis: Last 3 months (e.g., May, Jun, Jul 2026)

**Bar colors:**
- 🟢 Green (≥100%)
- 🟠 Orange (80–99%)
- 🔵 Blue (<80%)

**Hover tooltip:**
- SE name
- Attainment % for that month
- Estimated monthly commission

---

### Team Attainment Summary Table

**One row per SE (16 ICs)**

**Columns:**
- **SE Name**: Full name
- **Title**: Role (e.g., "Senior Sales Engineer")
- **Region**: Assigned region
- **Last 3 months**: Attainment % for each month, color-coded
- **Status badge**: Latest month status (Quota Hit / On Track / Building)

**Row highlights:**
- Current user (if logged in as SE) shown with blue background

---

### Individual SE Breakdown Cards

**One card per SE (collapsible)**

**Card contents:**
- **SE avatar** (initials in colored circle)
- **Name, title, manager, region**
- **YTD commission** (sum of all months to date) — currently shows "—" (note: this is a known display issue; see [Calculations & Formulas](#calculations--formulas) for the actual formula)
- **Status badge** (green/blue/gray/purple)
- **Per-month strip**: 3 columns (one per last-month) showing:
  - Attainment %
  - Progress bar (visual fill)
  - Commission earned

---

### 2026 Commission Breakdown Card (New)

**Location:** Bottom of Report tab

**Purpose:** Audit tool — detailed month-by-month commission for every SE

**SE Selector Dropdown:**
- Default: "All SEs" (summary table view)
- Select an SE name (detail card view)

#### All SEs Summary Table

**What it shows:** Commission earned per quarter per SE (2026 full year)

**Columns:**
- **SE Name**: Full name
- **Region**: Assigned region
- **Q1–Q4**: Commission earned in each quarter
- **Annual Total**: Sum of all quarters

**How commission is calculated:**

For each quarter:
1. Calculate each elapsed month's commission independently
2. Sum the monthly commissions in that quarter

**Data display:**
- Shows `—` for future quarters (no data yet)
- Shows `—` for SEs without OTE/quotas set
- Sorted by region, then SE name

#### Individual SE Detail Card

**What it shows:** Month-by-month commission breakdown for one SE

**Columns:**
- **Month**: Calendar month (e.g., "Jan 2026")
- **Basis**: "Monthly estimate"
- **Commission**: Estimated dollar amount for that month
- **Region CW**: Actual Closed Won from that SE's region that month
- **Attainment %**: Attainment for that month

**Row styling:**
- Monthly estimates use consistent blue styling

**Quarterly subtotal rows:**
- Inserted between quarters
- Shows Q1 Total, Q2 Total, etc.
- Sums the monthly commissions for that quarter

**Only shows elapsed months** (no future months)

**How data is sourced:**
1. Load regionPools docs for SE's region × all months
2. Look up SE's profile (OTE, quotas) from Firestore users collection
3. For each month, call `monthlyCommissionForSE(month, regionCW, seQuotas, seMonthlyOTE)`
4. Render table with results

---

## Calculations & Formulas

This section documents every calculation used in the app, including source data and step-by-step derivations.

### 1. Attainment Percentage

**Formula:**
```
IC Attainment % = Region Closed Won ÷ SE Personal Monthly Quota
Team/Leader Rollup Attainment % = Region Closed Won ÷ Region Monthly Quota
```

**Data sources:**
- **Region Closed Won**: `regionPools/{regionKey}_{YYYY-MM}.totalCwUSD` (from BigQuery via nightly sync)
- **IC quota**: selected SE profile `users/{userId}.quotas['Q' + Math.ceil(month/3)]` ÷ 3
- **Team/leader rollup quota**: `regionConfig/{regionKey}.quotas['Q' + Math.ceil(month/3)]` ÷ 3
  - Falls back to `DEFAULT_REGION_QUOTAS` for regional rollups if not set by admin

**Example:**
- Region: UK
- Month: June 2026 (Q2)
- regionPools.UK_2026-06.totalCwUSD = $145,000
- Selected SE profile quota Q2 = $180,000 (monthly = $60,000)
- Attainment = $145,000 ÷ $60,000 = 2.42 (242%)

**Rounding:** Displayed as percentage with 2 decimal places (242.33%)

**Capped for display:** Commission cap at 200% is applied only to commission payout, not attainment % display

---

### 2. Monthly Commission

**Function:** `monthlyCommissionForSE(month, regionMonthlyData, seQuotas, seMonthlyOTE)`

**Inputs:**
- `month`: String like "2026-01"
- `regionMonthlyData`: Object `{ '2026-01': cw_amount, '2026-02': cw_amount, ... }`
- `seQuotas`: Object `{ Q1: quota, Q2: quota, Q3: quota, Q4: quota }`
- `seMonthlyOTE`: Number (legacy variable name; value is the SE's annual total OTE × 0.30 ÷ 12)

**Step 1: Determine the applicable quarterly quota**
```
monthNumber = parseInt(month.slice(5), 10)  // e.g., "2026-06" → 6
quarterNumber = Math.ceil(monthNumber / 3)  // 6 → Q2
quarterlyQuota = seQuotas['Q' + quarterNumber]
```

**Step 2: Convert the quarterly quota to a monthly quota**
```
monthlyQuota = quarterlyQuota ÷ 3
```

**Step 3: Calculate the selected month's attainment and commission**
```
monthCW = regionMonthlyData[month]
monthlyAttainment = monthCW ÷ monthlyQuota
estimatedCommission = min(monthlyAttainment, 2.0) × seMonthlyOTE
```

**Example:**
```
monthlyQuota = $60,000
monthCW = $45,000
monthlyAttainment = $45,000 ÷ $60,000 = 75%
seMonthlyOTE = $900
estimatedCommission = 75% × $900 = $675
```

---

### 3. Monthly Commission Target

**Formula:**
```
Monthly Commission Target = Annual Total OTE × 30% ÷ 12
```

**Simplifies to:**
```
Monthly Commission Target = Annual Total OTE × 0.025
```

**Example:**
```
Annual Total OTE = $36,000
Monthly Commission Target = $36,000 × 0.30 ÷ 12 = $900
```

**Data source:** Firestore users collection, `profile.annualOTE`

**Stored as:** Firestore users collection, `profile.monthlyOTE` (auto-calculated)

---

### 4. Quarterly Commission Target

**Formula:**
```
Quarterly Commission Target = Monthly Commission Target × 3
```

**Example:**
```
Monthly Commission Target = $900
Quarterly Commission Target = $900 × 3 = $2,700
```

**Used in:** Quarterly and annual reference totals

---

### 5. Monthly Quota (from Quarterly)

**Formula:**
```
Monthly Quota = Quarterly Quota ÷ 3
```

**Example:**
```
Q2 Quota = $180,000
Jun Monthly Quota = $180,000 ÷ 3 = $60,000
```

**Data sources:**
1. **IC dashboard, charts, scenarios, history, and commission:** selected SE profile `profile.quotas['Q' + quarterNumber]`
2. **Team/leader regional rollups:** `regionConfig/{regionKey}.quotas['Q' + quarterNumber]`
3. **Regional rollup default only:** `DEFAULT_REGION_QUOTAS` when no admin-managed regional quota is set

---

### 6. Quarterly Commission Summary

**Formula:**
```
Quarterly Commission = Month 1 Commission + Month 2 Commission + Month 3 Commission
```

**Example:**
```
April Commission = $675
May Commission = $720
June Commission = $630
Q2 Commission = $675 + $720 + $630 = $2,025
```

**Used in:** Quarterly Summary card, Commission Breakdown report (for "All SEs" summary table)

---

### 7. YTD (Year-to-Date) Commission

**Formula:**
```
YTD Commission = SUM(Commission for all elapsed months)
```

**How it's calculated:**
- For each elapsed month, calculate that month's commission independently
- Sum the results from January through the current month

**Example (end of June 2026):**
```
Jan commission: $675
Feb commission: $720
Mar commission: $630
Apr commission: $710
May commission: $725
Jun commission: $645
YTD = $675 + $720 + $630 + $710 + $725 + $645 = $4,105
```

**Used in:** Quarterly Summary card, Report tab Individual SE cards (though currently displayed as "—" due to known issue)

---

### 8. Projected Annual Commission

**Formula:**
```
Projected Annual = YTD Commission × (4 ÷ Elapsed Quarters)
```

**Example (end of Q2):**
```
YTD Commission = $4,105
Elapsed Quarters = 2
Projected Annual = $4,105 × (4 ÷ 2) = $4,105 × 2 = $8,210
```

**Used in:** Quarterly Summary card (right sidebar)

---

### 9. Average Attainment (YTD)

**Formula:**
```
Avg Attainment = SUM(Attainment % for all SE-month pairs) ÷ COUNT(SE-month pairs)
```

**Example:**
```
Team has 5 SEs
Elapsed months: 6 (Jan–Jun)
Total attainment-months = 5 × 6 = 30
If sum of attainments = 27.5 (accounting for some SEs with no data):
Avg Attainment = 27.5 ÷ 30 = 91.67%
```

**Used in:** Report tab Team KPIs

---

### 10. Months at Quota

**Formula:**
```
Months at Quota = COUNT(SE-month pairs where Attainment % ≥ 100%)
```

**Example:**
```
5 SEs × 6 months = 30 possible SE-month pairs
23 pairs have attainment ≥ 100%
Months at Quota = 23
```

**Used in:** Report tab Team KPIs

---

### 11. Scenario Modeler: This Month Projection

**Formula:**
```
Projected Commission = min(Projected Attainment %, 200%) × Monthly Commission Target

Where:
Projected Attainment % = (Projected CW entered by user) ÷ Monthly Quota
```

**Example:**
```
User enters: "Projected CW = $65,000"
Monthly Quota = $60,000
Projected Attainment = $65,000 ÷ $60,000 = 108.33% (capped at 200% = 108.33% actual)
Monthly Commission Target = $900
Projected Commission = 1.0833 × $900 = $975
```

---

### 12. Scenario Modeler: This Quarter Projection

**Formula:**
```
Projected Quarterly Commission = Sum of monthly commission estimates in the selected quarter
```

**Example (for month 2 of quarter):**
```
Month 1 commission: $675
Projected Month 2 CW: $50,000
Projected Month 2 commission: $720
Projected Q2 Commission so far = $675 + $720 = $1,395
```

---

### 13. Scenario Modeler: Annual Run-rate

**Formula:**
```
Projected Annual Commission = (Projected Attainment % for current month) × Annual Commission Target

Where the current month's attainment % is extrapolated for all 12 months
Annual Commission Target = Annual Total OTE × 30%
```

**Example:**
```
User projects Month 6 CW = $65,000
Monthly Quota = $60,000
Month 6 Attainment = 108.33%
Annual Total OTE = $36,000
Annual Commission Target = $10,800
If every month matched 108.33% attainment:
Annual Commission = min(1.0833, 2.0) × $10,800 = $11,700
(The monthly calculation is capped at 200% of each month's commission target.)
```

---

### 14. Threshold Calculator: Gap to Milestone

**Formula:**
```
CW Gap = max(0, Milestone Target CW - Current Month CW)

Where:
Milestone Target CW = (Milestone % ÷ 100) × Monthly Quota
```

**Example (100% quota milestone):**
```
Monthly Quota = $60,000
Milestone = 100% → Target CW = $60,000
Current CW = $45,000
Gap = max(0, $60,000 - $45,000) = $15,000
Commission at milestone = min(1.0, 2.0) × $900 = $900
```

---

## FAQ & Troubleshooting

### Account & Access

**Q: I can't sign in. It says "Access restricted."**

A: You're using a personal Google account. Sign out and log in with your Simpro Group work account:
- simprogroup.com
- simpro.us
- simpro.au
- simpro.nz
- bigchange.com
- clockshark.com

**Q: I'm not an admin but I see the "Team View" button. Why?**

A: You must have `isAdmin: true` set in your Firestore profile (users collection). Only Simpro leadership should have this. Contact Brad Towers to correct it.

**Q: Can I change my region after onboarding?**

A: Yes. Click "Reset Profile" in the Comp Plan panel (left sidebar). This restarts onboarding, and you can select a different region.

---

### Data & Sync

**Q: The numbers look stale. When is data updated?**

A: BigQuery data syncs nightly at 2 AM UTC. If you need fresh data immediately:
1. As an admin, click "Sync Now" (Team View tab)
2. Otherwise, wait for the nightly sync (up to 24 hours)

**Q: I see different attainment % on my dashboard vs. Team View. Why?**

A: Two possibilities:
1. **Different quotas:** Your personal dashboard uses your personal quotas (set during onboarding), while Team View's regional cards use the region's centralized quota (set by admin). Neither replaces the other: personal quota is authoritative for IC calculations; regional quota is authoritative for regional rollups.
2. **Different months:** Make sure both views have the same month selected (top-right month picker).

**Q: My AE pool is empty. Where's the data?**

A: Check:
1. **Month selector** — you're looking at the current month or a past month with data (not future)
2. **Region** — as an admin, verify the "Region" dropdown (dashboard top bar) is set to the SE's region, not "All Regions"
3. **Data sync** — click "Sync Now" to refresh from BigQuery (may take a few seconds)

**Q: Commission shows "—" for an SE. Why?**

A: The SE doesn't have an OTE or quotas set. They must complete onboarding (enter Annual Total OTE and quarterly quotas) before commission can be calculated.

---

### Commission & Calculations

**Q: Why is one month's commission lower than another?**

A: Each month is calculated independently. A month with lower Closed Won or lower attainment produces a lower monthly commission estimate.

**Q: What does "Capped at 200%" mean?**

A: Monthly commission maxes out at 2× the monthly commission target. If you hit 250% monthly attainment, the estimate is limited to 200%:
```
Monthly Commission = min(250%, 200%) × Monthly Commission Target
```

**Q: How is the 30% commission-eligible portion calculated?**

A: It's baked into the OTE formula:
```
Monthly Commission Target = Annual Total OTE × 0.30 ÷ 12
```

The 30% (or 0.30) factor assumes 30% of your total comp is commission-eligible, and 70% is base salary.

**Q: Can I see what I'll earn if I hit 150% attainment?**

A: Yes, use the **Threshold Calculator** (right sidebar on your dashboard). It shows the commission at 50%, 80%, 100%, 150%, and 200% milestones.

---

### Admin & Management

**Q: How do I set region quotas?**

A: In Team View (admins only):
1. Click "Team View" in top navigation
2. Scroll to the "Regional Quotas" section at the top
3. Edit Q1–Q4 for each region
4. Click "Save"
5. Regional Team View rollups immediately recalculate using the new quotas; IC dashboards continue to use each SE's personal quota

**Q: What's the difference between personal quotas and region quotas?**

A: **Personal quotas** are set by each SE during onboarding and are authoritative for that SE's IC dashboard, charts, scenarios, history, and commission estimates. **Region quotas** are set by admin in Team View and are authoritative only for team and leader regional rollups.

**Q: Can I view another SE's dashboard?**

A: Yes, as an admin:
1. Click "View As" dropdown (top-left of dashboard)
2. Select "IC" (Individual Contributor)
3. Use the "SE name" picker to choose the SE
4. You'll see their dashboard as if you were them

**Q: How do I trigger a manual BigQuery sync?**

A: In Team View (admins only):
1. Look for the "Sync Now" button in the top-left
2. Click it
3. Wait a few seconds for the sync to complete
4. You'll see the sync status update in the "BQ Sync" panel below

---

### Charting & Visualization

**Q: What do the bar colors mean on the Monthly Attainment chart?**

A:
- 🟢 **Green** (≥100%): Quota Hit
- 🟠 **Orange** (80–99%): On Track
- 🔵 **Blue** (<80%): Building (still earning, but below target)
- ⚪ **Gray**: No data yet (future month)

**Q: Can I export the data or charts?**

A: Not yet. You can take screenshots or use browser developer tools to inspect the data. Contact Brad Towers for export requests.

---

### Errors & Unusual Behavior

**Q: I see an error "Failed to load pool data."**

A: This means Firestore couldn't reach the regionPools doc for that region/month. Try:
1. Refresh the page
2. Click "Sync Now" (if admin) to re-populate Firestore
3. Check your internet connection
4. Contact Brad Towers if it persists

**Q: Commission calculations seem off. How do I audit them?**

A: Use the **2026 Commission Breakdown** card in the Report tab (admins only):
1. Select the SE from the "2026 Commission Breakdown" dropdown
2. Review the month-by-month monthly commission estimates
3. Verify attainment % and region CW match expectations
4. Check that quarterly subtotals align with the Quarterly Summary card

---

## Glossary

- **AE (Account Executive):** Deal owner in Salesforce. Their Closed Won is tracked and attributed to a region. Not the same as an SE.

- **Attainment:** For an IC, regional Closed Won divided by the selected SE's personal monthly quota. For a team/leader regional rollup, regional Closed Won divided by the regional monthly quota.

- **Closed Won (CW):** Revenue from deals won in a given month. Measured in Monthly Recurring Revenue (MRR) in USD. Source: BigQuery.

- **CRR (?) — Not used in this app.**

- **Firestore:** Google Cloud's NoSQL database. Stores SE profiles (OTE, quotas), region quotas, and synced Closed Won pools.

- **IC (Individual Contributor):** Sales Engineer, as opposed to a manager/leader. IC View is a dashboard view for SEs.

- **MRR (Monthly Recurring Revenue):** Monthly revenue from a customer contract. The app uses MRR (not ACV or ARR) for all Closed Won amounts.

- **Annual Total OTE:** Total annual on-target cash earnings (base plus variable). The app's current 70/30 model derives the annual commission target as 30% of this amount.

- **Monthly Commission Target:** Annual Total OTE × 30% ÷ 12. This is the monthly multiplier at 100% attainment.

- **Quota:** Revenue target for a region or SE. Set quarterly; monthly quota = quarterly quota ÷ 3.

- **Region:** One of 5 operational areas: Simpro UK, BigChange UK, Simpro North America, Simpro ANZ, ClockShark North America. SEs are assigned to a region; their commission uses that region's Closed Won pool against their own personal monthly quota.

- **regionConfig:** Firestore collection storing admin-set region quotas. One doc per region key (UK, BigChange, etc.).

- **regionPools:** Firestore collection storing synced BigQuery Closed Won data. One doc per region per month (e.g., UK_2026-06). Contains AE list and total CW.

- **SE (Sales Engineer):** Technical presales role. Uses the regional Closed Won pool with their own personal monthly quota for commission purposes.

- **users:** Firestore collection storing SE profiles (email, region, OTE, quotas, onboarded status). One doc per SE.

- **YTD (Year-To-Date):** Cumulative total from January through the current month. Used for commission summaries and run-rate projections.

---

## Support & Contact

**For technical issues:**
- Contact Brad Towers (brad.towers@simprogroup.com)
- Submit an issue on GitHub (if applicable)

**For commission questions:**
- Brad Towers (SE Leadership)
- Refer to this guide's [Calculations & Formulas](#calculations--formulas) section

**For quota changes:**
- Admins: Edit in Team View, click Save
- Questions: Contact Brad Towers

**For BigQuery/data sync issues:**
- Cloud/data admin team (contact via Slack or email)

---

**Last Updated:** July 27, 2026
**App Version:** 1.4+ (Monthly Commission Model, Commission Breakdown Report)
