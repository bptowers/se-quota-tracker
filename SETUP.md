# SE Quota Tracker — Firebase Deployment Guide

**Audience:** Brad Towers  
**Estimated time:** ~45 minutes (first-time setup)  
**Skill level required:** No coding experience needed — just follow the steps

---

## What You're Deploying

A private web app that lets all ~16 SEs across UK, ANZ, US, and BigChange log in with their corporate Google account and track their quota attainment in real time. You get an admin view showing the whole team at a glance.

- URL will be: `https://se-quota-tracker.web.app`
- Login: Google SSO (corporate email only — domain-restricted)
- Data: Stored in Firebase (Google's secure cloud database)
- Cost: Free tier (Spark plan) covers this easily

---

## Step 1: Create a Firebase Project

1. Go to [https://console.firebase.google.com](https://console.firebase.google.com)
2. Click **"Add project"**
3. Name it something like `simpro-se-tracker`
4. Disable Google Analytics (not needed) → click **Continue**
5. Click **"Create project"** → wait ~30 seconds
6. Click **"Continue"** when done

> **Note your Project ID** — it shows in the URL and under Project settings. It will look like `se-quota-tracker` (Firebase sometimes adds random chars). You'll need this later.

---

## Step 2: Enable Google Authentication

1. In the left sidebar, click **"Build"** → **"Authentication"**
2. Click **"Get started"**
3. Under **"Sign-in providers"**, click **"Google"**
4. Toggle **Enable** to ON
5. Set **"Project support email"** to `brad.towers@simprogroup.com`
6. Click **"Save"**

### Add Authorized Domains
Still in Authentication → click the **"Settings"** tab → **"Authorized domains"**

Add each domain (click "Add domain" for each):
- `simprogroup.com`
- `simpro.us`
- `simpro.au`
- `simpro.nz`
- `bigchange.com`
- `clockshark.com`

> `localhost` and `se-quota-tracker.web.app` are added automatically.

---

## Step 3: Create Firestore Database

1. In the left sidebar, click **"Build"** → **"Firestore Database"**
2. Click **"Create database"**
3. Choose **"Start in production mode"** (security rules are already written)
4. Select a location — choose **`us-central1`** (or `europe-west1` if you prefer)
5. Click **"Enable"**

> The database starts empty. SEs populate their own data on first login.

---

## Step 4: Add Yourself as Admin

This gives you the admin dashboard to see all SEs.

1. In Firestore, click **"Start collection"**
2. Collection ID: `admins`
3. Document ID: *(you'll need your Firebase UID — see sub-steps below)*
4. Add a field: `email` (string) = `brad.towers@simprogroup.com`

**To find your Firebase UID:**
- Go to Authentication → Users tab
- Sign in to the app once first (Step 7), then come back here
- Your UID will appear in the Users table — copy it
- Come back to Firestore → `admins` collection → add your document

---

## Step 5: Get Your Firebase Config

1. In Firebase Console, click the **gear icon** ⚙️ → **"Project settings"**
2. Scroll down to **"Your apps"** section
3. Click **"<\/>"** (Web app icon) to add a web app
4. Register app name: `SE Quota Tracker`
5. Check **"Also set up Firebase Hosting"** ✅
6. Click **"Register app"**
7. You'll see a config block that looks like this:

```javascript
const firebaseConfig = {
  apiKey: "AIzaSy...",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abc123"
};
```

8. **Copy the entire block**

---

## Step 6: Paste Config into the App

1. Open the file `SE_Tracker_App/public/index.html` in a text editor
2. Find this section near the top of the `<script>` block (around line 20):

```javascript
// ─── PASTE YOUR FIREBASE CONFIG HERE ──────────────────────────────────────
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT_ID.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID"
};
```

3. Replace the entire `firebaseConfig = { ... }` block with the one you copied in Step 5
4. Save the file

### Also update `.firebaserc`:
Open `.firebaserc` and replace `YOUR-FIREBASE-PROJECT-ID` with your actual Project ID:
```json
{
  "projects": {
    "default": "se-quota-tracker"
  }
}
```

---

## Step 7: Install Firebase CLI & Deploy

You'll need Node.js installed. If you don't have it: [https://nodejs.org](https://nodejs.org) → download the LTS version.

Open **Terminal** (Mac) and run these commands one at a time:

```bash
# Install Firebase CLI (one-time)
npm install -g firebase-tools

# Log in with your Google account
firebase login

# Navigate to the app folder
cd "/Users/bradtowers/Documents/Simpro_SE_Leadership/SE Team/SE Comp Challenges/SE_Tracker_App"

# Deploy everything (hosting + Firestore rules)
firebase deploy
```

> After deploy completes, you'll see:
> ```
> Hosting URL: https://se-quota-tracker.web.app
> ```

That's your live URL. Share it with SEs — they sign in with their corporate Google account.

---

## Step 8: Add Yourself as Admin (finish from Step 4)

1. Visit your live app URL
2. Sign in with `brad.towers@simprogroup.com`
3. Complete the onboarding wizard (you can put placeholder values)
4. Go back to Firebase Console → Authentication → Users
5. Find your entry, copy the **UID** (the long string like `xK9p2...`)
6. Go to Firestore → `admins` collection → click **"Add document"**
7. Document ID: paste your UID
8. Add field: `email` = `brad.towers@simprogroup.com`
9. Click **"Save"**
10. Refresh the app — you'll now see the **Admin** tab with the team overview

---

## Sharing With the Team

Send SEs this message:

> "Hey team — I've built a live dashboard for tracking your quota attainment. Sign in at [YOUR URL] with your corporate Google account. It takes 2 minutes to set up. Your data is private — only you and I can see it. Let me know if you have any issues."

SEs from these domains can sign in:
- `@simprogroup.com` — UK SEs
- `@simpro.us` — US SEs  
- `@simpro.au` / `@simpro.nz` — ANZ SEs
- `@bigchange.com` — BigChange SEs
- `@clockshark.com` — ClockShark SEs

---

## Updating the App Later

Whenever you edit `public/index.html`, just run:
```bash
firebase deploy --only hosting
```

To update Firestore rules:
```bash
firebase deploy --only firestore:rules
```

---

## Phase 2: BigQuery Auto-Sync (Future)

Once you've confirmed that AE closed-won data exists in BigQuery, the next step is a Cloud Function that runs on a schedule (e.g. nightly) and automatically pushes AE data into each SE's Firestore document. This eliminates manual entry entirely.

When you're ready for Phase 2, share:
1. Your BigQuery project ID and dataset name
2. The table/view that contains AE closed-won by SE by quarter
3. Whether AEs are mapped to SEs by territory, account, or another field

---

## Troubleshooting

| Problem | Fix |
|---|---|
| "Firebase: Error (auth/unauthorized-domain)" | Add the domain in Authentication → Settings → Authorized domains |
| Sign-in works but shows "Access denied" | Your email domain isn't in the ALLOWED_DOMAINS list in index.html — add it |
| Admin tab not showing | Make sure your UID is in the `admins` Firestore collection |
| Blank page after deploy | Open browser DevTools (F12) → Console tab — share the error with Brad/Claude |
| `firebase: command not found` | Re-run `npm install -g firebase-tools` and restart Terminal |

---

## File Structure Reference

```
SE_Tracker_App/
├── public/
│   └── index.html          ← The entire app (edit Firebase config here)
├── firebase.json           ← Hosting configuration
├── firestore.rules         ← Database security rules
├── firestore.indexes.json  ← Database query indexes
├── .firebaserc             ← Your project ID (edit this)
└── SETUP.md                ← This guide
```

---

*Built by Claude for Brad Towers — Simpro SE Leadership*  
*Last updated: April 2026*
