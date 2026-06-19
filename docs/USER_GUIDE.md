# SE Attainment Tracker — User Guide

A step-by-step guide to the Simpro Group **SE Attainment Tracker**, for Sales Engineers and SE leaders.

**App URL:** https://se-quota-tracker.web.app

---

## 1. What this tool is

The SE Attainment Tracker shows each SE team's **Closed Won attainment** against quota and the **estimated commission** that results from it. The Closed Won figures come straight from BigQuery (the company data warehouse) and refresh automatically — there is nothing to enter by hand.

There are two views:

- **My Dashboard** — your team's pool, attainment, pay curve, and monthly draws.
- **Team View** — (leaders/admins only) every region's attainment in one place, with drill-down into each region's AEs and SEs.

---

## 2. Key concepts (read this first — it makes the numbers make sense)

- **You carry your region's *team* number.** Commission is based on your whole region's Closed Won versus your region's quota — not an individual deal list. Every SE in a region shares the same attainment number.
- **Regions:** Simpro UK, BigChange, Simpro US, Simpro ANZ, ClockShark. (Australia and New Zealand are combined as "Simpro ANZ".)
- **AEs (Account Executives)** are the deal owners whose Closed Won rolls up into your region's pool. Their names and numbers come from BigQuery.
- **Attainment** = region Closed Won (USD) ÷ region quota.
- **All amounts are shown in USD.**
- **Commission is paid from the first dollar** — there is **no floor**. 25% attainment pays 25% of your OTE.
- **Commission is capped at 200% of OTE.** Attainment above 200% does not pay more.
- Formula: **Commission = (Attainment, capped at 200%) × Quarterly OTE.**
  - 50% attainment → 50% of OTE
  - 100% attainment → 100% of OTE
  - 220% attainment → 200% of OTE (capped)

---

## 3. Getting started

### 3.1 Sign in
1. Go to **https://se-quota-tracker.web.app**.
2. Click **Sign in with Google**.
3. Choose your work Google account. Access is limited to approved Simpro Group domains (simprogroup.com, simpro.us, simpro.au, simpro.nz, bigchange.com, clockshark.com). If you see "access restricted", you're using a personal account — switch to your work account.

### 3.2 First-time setup (onboarding)
The first time you sign in you'll be asked for a few details:
1. **Your name** and **Region** — pick the region you support.
2. **Annual OTE** — your on-target earnings. (This drives your commission estimate. It stays private to your view.)
3. **Quarterly quotas** — these are pre-filled; your leader manages the real per-region quotas centrally, so you can accept the defaults.
4. Click **Launch Dashboard**.

You only do this once. Next time you sign in, you go straight to your dashboard.

---

## 4. My Dashboard — guided tour

### 4.1 The top bar
Across the top you'll see four summary tiles:
- **Commission to Quota** — your attainment **percentage**, with "$ earned of $ quota" and a progress bar beneath it.
- **Attainment** — your **estimated commission ($)** for the selected quarter, plus a status badge (see below).
- **Net Topline** — total Closed Won (USD) in your region's pool.
- **Days Remaining** — days left in the selected quarter.

**Status badges:**
- 🟢 **Quota Hit** — at or above 100% attainment
- 🔵 **On Track** — 80%–99%
- ⚪ **Building** — below 80% (still earning — there's no floor)
- 🟣 **200%+ Cap** — at or above the 200% cap

### 4.2 Quarter selector
Top-right, next to the view buttons. The dashboard opens on the **current quarter** automatically. Switch quarters (Q1–Q4 2026) to see other periods. (Only quarters that have synced data will show figures.)

### 4.3 Comp Plan panel (left)
- **Annual OTE / Quarterly OTE** — editable; this is what your commission estimate is based on.
- **Team / Regional Quota** — shown for reference (set centrally by your leader).
- **FX Rate** — fixed at 1.0 because all figures are already in USD.

### 4.4 Quota Progress (centre)
A bar showing how far your region's revenue is toward 100% of quota, with 80% and 100% markers.

### 4.5 AE Revenue Pool (centre)
The list of **AEs** in your region and their **Closed Won (USD)**, synced from BigQuery. This is read-only — it reflects the actuals in the warehouse. The note at the top shows when it was last synced.

### 4.6 Pay Curve (centre)
A chart of commission vs. Closed Won: a straight line from the first dollar, up to the 200% cap. The dot marks where your region currently sits.

### 4.7 Monthly Draw Breakdown (right)
How commission is paid across the quarter — a draw in each of the three months, with a **true-up** in the final month that reconciles to the full quarter result.

### 4.8 Threshold Calculator (right)
Shows how much more Closed Won is needed to reach key milestones (50%, 80%, 100%) and the commission at each point.

---

## 5. For Leaders & Admins

Admins (SE leadership) have extra controls.

### 5.1 Region selector on your dashboard
As an admin you'll see a **region dropdown** in the top bar:
- **All Regions** (default) — your dashboard shows every region's AEs grouped together, with global attainment (total Closed Won vs combined quota). The per-SE commission tools are hidden here because they're region-specific.
- **A single region** (e.g. BigChange) — shows that region's full detail: its AE pool, attainment, pay curve, and draws.

### 5.2 Team View
Click **Team View** in the top bar. You'll see a **card for every region** with:
- Attainment % and progress bar
- Closed Won / quota
- Number of AEs and SEs

**Click any region card** to drill in and see:
- Region KPIs — attainment, Closed Won, quota, gap to quota, gap to 200% cap
- **Sales Engineers** assigned to the region, each with their estimated commission (once OTEs are entered)
- **AE Closed Won** — the full list of AEs and their contribution, from BigQuery

### 5.3 Setting regional quotas
At the top of the Team View is the **Regional Quotas** editor. For each region, enter the quarterly quota (USD) and click **Save**. Attainment everywhere recalculates immediately. Until you set them, regions use a default placeholder quota.

### 5.4 Refreshing the data
- Data refreshes **automatically every night**.
- To pull the latest immediately, click **Sync Now** (top-left, admins only). The "Synced …" note shows the last refresh time.
- The **BQ Sync** panel in the Team View shows the last run and which regions were updated.

---

## 6. Where the data comes from

- **Closed Won actuals** come from BigQuery (`group_sales_opportunity`), matched to each region by the AE (deal owner).
- A scheduled job refreshes the figures **once a day**; admins can also trigger **Sync Now**.
- The tool reads this data only — it never writes back to the warehouse.

---

## 7. FAQ & troubleshooting

**I can't sign in / "access restricted."**
You're likely using a personal Google account. Sign out and use your Simpro Group work account.

**My AE pool looks empty.**
Check the **quarter selector** — only the current quarter has data. Make sure it's set to the live quarter.

**The numbers look stale.**
Admins: click **Sync Now**. Otherwise the data refreshes overnight.

**My attainment % seems off.**
Attainment uses your **region's quota**. If the quota hasn't been set yet it uses a placeholder — ask your leader to set the real regional quota in the Team View.

**Commission shows "—" for SEs in the Team View.**
That SE doesn't have an OTE entered yet. Commission estimates appear once OTEs are added.

**I changed my OTE — is that saved?**
Yes, your OTE saves automatically to your profile.

---

## 8. Glossary

- **AE** — Account Executive (deal owner). Their Closed Won rolls up into a region pool.
- **SE** — Sales Engineer.
- **Closed Won** — revenue from won deals (MRR, in USD).
- **OTE** — On-Target Earnings (your commission target).
- **Attainment** — Closed Won ÷ quota.
- **Quota** — the region's revenue target for the quarter.
- **Draw** — the monthly commission payment within a quarter.
- **True-up** — the final-month reconciliation to the full quarter result.
- **Cap** — the 200%-of-OTE maximum on commission.

---

*Questions or something not matching what you see? Contact Brad Towers (SE Leadership).*
