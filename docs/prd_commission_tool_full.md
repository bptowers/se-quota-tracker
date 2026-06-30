# **Product Requirements Document: Internal Sales Commission Prediction Tool**

## **1\. Executive Summary**

**Project Overview:** To develop an internal Incentive Compensation Management (ICM) tool modeled after enterprise solutions like Xactly and Everstage. The tool provides Sales Engineers (SEs) and Sales Reps with real-time visibility into attainment and predictive "what-if" modeling for their commissions, specifically eliminating the need for "shadow accounting."

**Problem Statement:** Current commission tracking is opaque. SEs spend manual hours tracking team numbers across different regions and product lines (Simpro, BigChange, ClockShark), leading to a lack of trust and motivation regarding future pipeline potential.

**Target Audience:**

1. **Individual Contributors (Primary Phase 1):** SEs in NA, UK, AU, and NZ.  
2. **Managers:** Visibility into regional team pacing.  
3. **Sales Ops/Finance:** Oversight of logic and data accuracy.

## **2\. Global Organizational Logic**

The tool is built on a **Regional Team Number** model using **Monthly Recurring Revenue (MRR)**.

### **2.1 Regional & Product Segmentation**

* **United Kingdom:** Two distinct product lines—**Simpro** and **BigChange**. SEs are mapped to one or the other; targets and attainment are isolated.  
* **North America:** Two distinct groups—**Simpro** and **ClockShark**. Two dedicated SEs focus exclusively on ClockShark.  
* **Australia & New Zealand:** Focused exclusively on **Simpro**.

### **2.2 Commission Payout Math (The "Brain")**

* **The 60% Floor:** If a regional team/product line does not hit at least 60% of their monthly MRR target, no commissions are earned.  
* **Base Tier (60% \- 100%):** Commissions scale linearly based on attainment once the floor is crossed.  
* **Accelerators (100%+):** Multipliers apply to every dollar of MRR over 100% attainment.  
* **Technical Win Guardrail:** A deal must be marked "Closed-Won" AND have a "Completed" Technical Win in the data warehouse to count toward "Booked" payouts.

## **3\. Data Architecture (BigQuery)**

The tool utilizes a **Data Warehouse-centric architecture**, pulling cleaned data from Google BigQuery.

### **3.1 Core Schema**

| Table Name | Description | Key Fields |
| :---- | :---- | :---- |
| dim\_users | Identity & Comp Plan | user\_id, region\_id, product\_line, individual\_target |
| fact\_opportunities | Live Deal Data | opportunity\_id, amount\_mrr, stage, technical\_win\_status |
| fact\_team\_targets | Monthly Quotas | region\_id, product\_line, target\_month, mrr\_quota |
| dim\_comp\_rules | Payout Logic | floor\_threshold (0.60), accelerator\_multiplier |

## **4\. Technical Architecture**

**Stack:** Google Firebase (Hosting/Auth) and Google Cloud Run (API).

### **4.1 Hybrid Calculation Strategy**

To ensure zero latency, the system follows a "Query Once, Calculate Locally" model:

* **Backend:** Fetches current regional MRR totals and pipeline data from BigQuery via Service Account.  
* **Frontend:** Executes all "What-If" math in the browser (React/Angular) using a mirrored logic engine, allowing for instantaneous UI updates without redundant API calls.

### **4.2 Security & Authentication**

* **Internal SSO:** Integrated via OIDC/SAML.  
* **Regional Isolation:** Users are strictly scoped to their region\_id and product\_line. A UK BigChange SE cannot see NA ClockShark data.

## **5\. UI/UX Design Specification**

The interface is a **Three-Panel Motivation Engine**.

### **5.1 The Dashboard Layout**

1. **Top Header:** Displays current User Region, assigned Product Line, and "Last Synced" timestamp.  
2. **Left Sidebar (Gauges):**  
   * **Attainment Gauge:** Visual semi-circle with a red marker at the **60% Floor**.  
   * **Earnings Gauge:** "Booked" (Confirmed) vs. "Forecasted" (What-If) payouts.  
3. **Main Workspace (Deal Ledger):**  
   * List of all regional deals for the month.  
   * **What-If Checkboxes:** Toggling these adds the deal's MRR to the "Simulated Attainment."  
   * **Status Icons:** ✅ (Paid), ⚠️ (Pending Tech Win), ⬜ (Pipeline).

### **5.2 The "What-If" Action Bar**

A sticky footer that appears when pipeline deals are selected, showing the real-time dollar impact: *"Selecting these 2 deals adds $850 to your next check."*

## **6\. Implementation Roadmap**

### **Phase 1: MVP (SE Launch)**

* Establish Firebase environment and SSO integration.  
* Build BigQuery views for the four regions and three product lines.  
* Implement the 60% floor logic and "What-If" simulator.

### **Phase 2: Automation & Expansion**

* Automated "Technical Win" alerts.  
* Manager dashboard for cross-regional comparisons.  
* Integration of AE-specific tiered plans.

### **Phase 3: Optimization**

* AI-driven "Nudges" for deals nearing close dates.  
* Historical performance trends and payout archives.

## **7\. Success Metrics**

* **Shadow Accounting Reduction:** Measured via internal survey on "Time spent tracking commissions."  
* **Trust Score:** Decrease in "Commission Inquiry" tickets to Sales Ops.  
* **Win Rate:** Increase in Technical Win completion speed due to transparent payout visibility.