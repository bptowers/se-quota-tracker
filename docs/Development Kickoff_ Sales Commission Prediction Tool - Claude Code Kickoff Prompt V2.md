# **Development Kickoff: Sales Commission Prediction Tool \- Claude Code Kickoff Prompt V2**

I am building an internal tool for our Sales Engineering team. **You must strictly follow the specifications in the attached prd\_commission\_tool\_full.md.** I need you to act as a Senior Full Stack Engineer specializing in **Google Cloud (Firebase/Cloud Run)** and **BigQuery**.

### **Context for Build:**

* **Source of Truth:** All logic, data schemas, and UI layouts are defined in prd\_commission\_tool\_full.md.  
* **Stack:** React (Frontend), Node.js (Cloud Run Backend), Firebase Auth (SSO).  
* **Primary Data Source:** Google BigQuery.  
* **Core Logic Constraint:** Regional Team-based MRR attainment with a **60% floor**. No commission is earned below 60%.  
* **Regional/Product Rules:** \* UK: Separate lines for Simpro and BigChange.  
  * NA: Separate lines for Simpro and ClockShark.  
  * AU/NZ: Simpro only.

### **Initial Task (Phase 1 Setup):**

1. **Initialize Project Structure:** Create a clean monorepo or standard folder structure for the Frontend (React \+ Tailwind) and the Backend (Node.js/Express).  
2. **Infrastructure Mocking:** Create a mockBigQuery.js utility in the backend that simulates the fact\_opportunities and fact\_team\_targets tables defined in Section 3 of the PRD so we can build the UI without immediate warehouse access.  
3. **Core Logic Engine:** Implement the calculation logic defined in Section 2.2 and Section 4.1 of the PRD as a shared utility to support the "Hybrid Calculation Strategy" (server-side validation with client-side simulation).  
4. **Dashboard Skeleton:** Build the initial Three-Panel Layout (Section 5.1) using Tailwind CSS, including the "Attainment Gauge" and the "Deal Ledger" with checkboxes.

**Please start by acknowledging the specific 60% floor and Product Line rules from the PRD, then outline the file structure you are about to create.**