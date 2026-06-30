# SE Attainment Tracker — User Guide

A step-by-step guide to the Simpro Group **SE Attainment Tracker**, for Sales Engineers and SE leaders.

**App URL:** https://se-quota-tracker.web.app

---

## 1. What this tool is

The SE Attainment Tracker shows each SE team's **Closed Won attainment** against quota and the **estimated commission** that results from it. The Closed Won figures come straight from BigQuery (the company data warehouse) and refresh automatically — there is nothing to enter by hand.

There are three main views:

- **My Dashboard** — your team's monthly attainment, analytics, and commission tracking.
- **Team View** — (leaders/admins only) every region's attainment in one place, with drill-down into each region's AEs and SEs.
- **Report** — (admins only) comprehensive SE roster attainment across the full year.

---

## 2. Key concepts (read this first — it makes the numbers make sense)

- **You carry your region's *team* number.** Commission is based on your whole region's Closed Won versus your region's quota — not an individual deal list. Every SE in a region shares the same attainment number.
- **Regions:** Simpro UK, BigChange UK, Simpro North America, Simpro ANZ, ClockShark North America.
- **AEs (Account Executives)** are the deal owners whose Closed Won rolls up into your region's pool. Their names and numbers come from BigQuery.
- **Attainment** = region Closed Won (USD) ÷ region quota.
- **All amounts are shown in USD.**
- **Commission is paid from the first dollar** — there is **no floor**. 25% attainment pays 25% of your OTE.
- **Commission is capped at 200% of OTE.** Attainment above 200% does not pay more.
- **Compensation is monthly.** Quotas, OTE, and commission are calculated on a monthly basis. Your **Annual OTE** (entered once) is divided by 12 to get your **Monthly OTE**, which is the multiplier for your monthly commission.
- Formula: **Monthly Commission = (Monthly Attainment %, capped at 200%) × Monthly OTE**
  - Example: If your Monthly OTE is $3,000 and your region hits 80% attainment, you earn $2,400.
  - At 100% attainment: $3,000
  - At 220% attainment (capped): $6,000 (200% of $3,000)

---

## 3. Getting started

### 3.1 Sign in
1. Go to **https://se-quota-tracker.web.app**.
2. Click **Sign in with Google**.
3. Choose your work Google account. Access is limited to approved Simpro Group domains (simprogroup.com, simpro.us, simpro.au, simpro.nz, bigchange.com, clockshark.com). If you see "access restricted", you're using a personal account — switch to your work account.

### 3.2 First-time setup (onboarding)
The first time you sign in you'll be asked for a few details:
1. **Your name** and **Region** — pick the region you support.
2. **Annual OTE** — your on-target earnings for the full year. (Your Monthly OTE will be calculated as Annual ÷ 12. This drives your commission estimate. It stays private to your view.)
3. **Quarterly quotas** — enter your region's Q1–Q4 revenue targets. The app will automatically calculate monthly quotas (÷ 3 per quarter).
4. Click **Launch Dashboard**.

You only do this once. Next time you sign in, you go straight to your dashboard.

---

## 4. My Dashboard — guided tour

### 4.1 The top bar
Across the top you'll see four summary tiles:
- **Commission to Quota** — your attainment **percentage** for the current month, with "$X earned of $Y quota" and a progress bar beneath it.
- **Attainment** — your **estimated commission ($)** for the current month, plus a status badge (see below).
- **Net Topline** — total Closed Won (USD) in your region's pool this month.
- **Days Remaining** — days left in the current month.

**Status badges:**
- 🟢 **Quota Hit** — at or above 100% attainment
- 🔵 **On Track** — 80%–99%
- ⚪ **Building** — below 80% (still earning — there's no floor)
- 🟣 **200%+ Cap** — at or above the 200% cap

### 4.2 Month selector
Top-right, next to the view buttons. The dashboard opens on the **current month** automatically. Switch months to see other periods and compare performance across the year.

### 4.3 Comp Plan panel (left)
- **Annual OTE** — your total annual on-target earnings (editable).
- **Monthly OTE** — automatically calculated as Annual OTE ÷ 12.
- **Monthly Quota (USD)** — your region's monthly quota target (read-only; set by your leader).
- **FX Rate** — fixed at 1.0 because all figures are already in USD.

There's also a **Monthly Quotas 2026** sidebar showing all 12 months' quotas for reference.

Optional: **Reset Profile** button — if you need to re-enter your region or OTE, click this to restart onboarding.

### 4.4 Quota Progress (centre)
A bar showing how far your region's revenue is toward your monthly quota, with 80% and 100% markers. The bar fills left-to-right as your actual Closed Won approaches the target.

### 4.5 2026 Monthly Attainment (centre)
A bar chart showing your region's Closed Won by month across the full year:
- **Green bars** (≥100% attainment) — months where you hit or exceeded quota
- **Orange bars** (80–99%) — months on track
- **Blue bars** (<80%) — months building toward quota
- **Grey bars** — future months with no data yet
- **Dashed line** — your monthly quota target, overlaid for easy comparison
- Hover over any bar to see exact CW, quota, attainment %, and commission for that month

### 4.6 AE Revenue Pool (centre)
The list of **AEs** in your region and their **Closed Won (USD)** for the current month, synced from BigQuery. This is read-only — it reflects the actuals in the warehouse. The note at the top shows when it was last synced.

Click the **+/−** next to a region name to expand or collapse that region's AEs.

### 4.7 Quarterly Summary (right)
Shows your performance by quarter:
- **Q1–Q4 rows**: Each quarter shows total Closed Won, regional quota, attainment %, and commission earned
- **Annual row**: YTD totals, YTD commission, and projected annual commission based on run-rate

Elapsed quarters show actual numbers; future quarters show "Pending".

### 4.8 Commission Earned This Month (centre, below AE Pool)
A card showing three key commission metrics:
1. **Progress bar** — how much commission you've earned so far this month (green bar fills toward your Monthly OTE)
2. **Earned amount** — your current month commission in dollars
3. **If you maintain current pace** — projected end-of-month commission based on your run-rate
4. **If you hit 100% quota** — potential commission if you reach full quota

### 4.9 Closed Won Gap to Milestones (centre)
Shows how much more Closed Won you need to reach key targets:
- **50%, 80%, 100%, 150%, 200% quota** — each milestone shows:
  - How much additional CW is needed (e.g., "Need $12k more")
  - The commission you'd earn if you hit that milestone
  - ✓ symbol if you've already exceeded it

### 4.10 Scenario Modeler (right)
A "what-if" calculator for the current month:
1. Enter a projected Closed Won amount in the input field
2. See three real-time projections:
   - **This month** — attainment % and commission at your projected CW
   - **This quarter** — total quarter commission combining other months' actuals + your projected current month
   - **Annual run-rate** — full-year commission if every month achieves the same attainment %

Pre-filled with your current month's actual CW; edit to explore scenarios.

### 4.11 Threshold Calculator (right)
Shows how much additional Closed Won is needed to reach key attainment levels (50%, 80%, 100%, 150% stretch) and the commission at each point.

---

## 5. For Leaders & Admins

Admins (SE leadership) have extra controls and visibility.

### 5.1 Region selector on your dashboard
As an admin you'll see a **region dropdown** in the top bar:
- **All Regions** (default) — your dashboard shows every region's AEs grouped together, with global attainment (total Closed Won vs combined quota). The per-SE commission tools are hidden here because they're region-specific.
- **A single region** (e.g. BigChange) — shows that region's full detail: its AE pool, attainment, and commission tools.
- **Global** (Brad only) — shows combined data from all 5 regions. Useful for tracking company-wide performance.

### 5.2 Individual Contributor (IC) View
As an admin, you can view the dashboard as any SE on your team to check their metrics:
1. Click the **View As** dropdown (top-left, next to the region selector)
2. Select **IC** (Individual Contributor)
3. Use the **SE name** picker to select whose dashboard to view
4. You'll see their region, quotas, attainment, and commission — helpful for one-on-ones or validation

Admins can also save quota updates while viewing another SE's dashboard in IC mode.

### 5.3 Team View
Click **Team View** in the top bar. You'll see a **card for every region** with:
- Attainment % and progress bar
- Closed Won / quota
- Number of AEs and SEs

**Regional Quotas editor** (top of Team View):
- When region quotas are empty, the system automatically seeds them from all SE personal quotas
- Edit quarterly quotas (Q1–Q4 USD) for each region
- Click **Save** to persist changes to Firestore
- Attainment everywhere recalculates immediately

**Click any region card** to drill in and see:
- **Region KPIs** — attainment, Closed Won, quota, gap to quota, gap to 200% cap
- **Sales Engineers** assigned to the region, each with their Monthly OTE and estimated commission (if OTE is set)
- **AE Closed Won** — the full list of AEs and their contribution (from BigQuery)

### 5.4 BQ Sync panel
Shows the last sync run details:
- When the last sync occurred
- Which regions were synced
- How many AE rows were updated
- Any errors (if the sync failed, check permissions or contact cloud admin)

### 5.5 Sync Now button (top-left, admins only)
Trigger an immediate refresh of Closed Won data from BigQuery instead of waiting for the nightly job.

### 5.6 Refreshing the data
- Data refreshes **automatically every night at 2 AM UTC**.
- To pull the latest immediately, click **Sync Now**. The "Synced …" note shows the last refresh time.
- The **BQ Sync** panel in the Team View shows the last run and which regions were updated.

---

## 6. Where the data comes from

- **Closed Won actuals** come from BigQuery (`edw-simprogroup-propagation.sp_group.group_sales_opportunity`), matched to each region by AE name.
- A scheduled Cloud Function refreshes the figures **once a day**; admins can also trigger **Sync Now**.
- The tool reads this data only — it never writes back to the warehouse.
- **Quotas** are stored in Firestore and managed centrally by admin. SEs' personal OTEs are also stored in Firestore.

---

## 7. Monthly vs. Quarterly (what changed?)

The app now operates on a **monthly model**:
- Quotas are quarterly, but are divided by 3 to get monthly targets
- Commission is earned monthly, not as quarterly draws
- Analytics show month-by-month performance (Monthly Attainment chart, Earned Commission, etc.)
- All KPIs refresh at the month level

Your **Annual OTE** is the same; it's just divided by 12 instead of 4 to calculate your **Monthly OTE**.

---

## 8. FAQ & troubleshooting

**I can't sign in / "access restricted."**
You're likely using a personal Google account. Sign out and use your Simpro Group work account (simprogroup.com, simpro.us, simpro.au, simpro.nz, bigchange.com, or clockshark.com domain).

**My AE pool looks empty.**
Check the **month selector** — only the current month has data. Make sure it's set to the current month.

**The numbers look stale.**
Admins: click **Sync Now**. Otherwise the data refreshes overnight at 2 AM UTC.

**My attainment % seems off.**
Attainment uses your **region's quota**. If the quota hasn't been set yet, it defaults to a placeholder. Ask your leader to check the **Regional Quotas** editor in Team View.

**Commission shows "—" for an SE in Team View.**
That SE doesn't have a **Monthly OTE** (or **Annual OTE**) entered yet. Commission estimates appear once they complete onboarding.

**I changed my OTE — is that saved?**
Yes, your OTE saves automatically to your profile as you type.

**What if my region's quota is wrong?**
Admins can edit it in the **Regional Quotas** editor (Team View, top). Click Save and it updates immediately everywhere.

**Why do I see different quotas on my dashboard vs. the Team View drill-down?**
- Your personal **dashboard** uses your personal quotas (entered during onboarding)
- The **Team View** uses the region's centralized quota (set by admin)
- They can differ; the region quota is the single source of truth for attainment calculations

**What's the difference between Annual OTE and Monthly OTE?**
- **Annual OTE** — your full-year on-target earnings (e.g., $36,000)
- **Monthly OTE** — annual ÷ 12 (e.g., $3,000 per month)
- Each month's commission is calculated using Monthly OTE as the multiplier

**How do I see my commission projections for the rest of the year?**
Use the **Scenario Modeler** (right sidebar). Enter your target Closed Won for this month, and it shows what you'd earn this month, this quarter, and projected for the full year if every month matches that attainment.

**What if our BigQuery data is delayed or wrong?**
The **Synced …** note on the AE Revenue Pool shows the last update time. If data looks stale, ask an admin to click Sync Now. If data looks incorrect, check BigQuery directly or contact your data warehouse team.

---

## 9. Glossary

- **AE** — Account Executive (deal owner). Their Closed Won rolls up into a region pool.
- **SE** — Sales Engineer.
- **Closed Won** — revenue from won deals (MRR, in USD).
- **OTE** — On-Target Earnings (your commission target). **Annual OTE** is yearly; **Monthly OTE** = Annual ÷ 12.
- **Attainment** — Closed Won ÷ quota (expressed as a percentage).
- **Quota** — the region's revenue target for the month (or quarter, if you're reading quarterly targets).
- **Cap** — the 200%-of-OTE maximum on commission.
- **Run-rate** — projected full-year earnings based on current pace.
- **BigQuery** — Simpro's centralized data warehouse; source of Closed Won actuals.
- **Firestore** — cloud database storing SE profiles, quotas, and OTEs.
- **Region** — one of five operational areas: Simpro UK, BigChange UK, Simpro North America, Simpro ANZ, ClockShark North America.

---

## 10. Contact & Support

For questions or issues:
- **Technical issues or feature requests** — Contact Brad Towers (SE Leadership) or submit an issue
- **Commission calculations** — Brad Towers
- **Quota changes** — Brad Towers (admin)
- **BigQuery/data issues** — Cloud/data admin team

---

*Last updated: June 2026. This guide reflects the monthly attainment model and latest analytics features.*
