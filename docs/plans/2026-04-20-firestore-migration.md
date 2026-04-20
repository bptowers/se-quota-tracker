# Firestore Migration Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace all localStorage reads/writes with Firestore so data persists across devices and the admin's Team View shows live data from all SEs.

**Architecture:** The Firestore compat SDK is added alongside the existing Firebase Auth compat SDK. Google-authenticated users get their data stored in `users/{firebaseUid}` and `aePools/{firebaseUid}_{quarter}`. All async Firestore calls use Promises with `.then()` chaining (no ES modules, matching the existing plain-JS style). Manual email/name login (no Firebase Auth) keeps localStorage as a fallback so it still works.

**Tech Stack:** Firebase Firestore compat SDK v10.12.2, existing Firebase Auth compat, Chart.js, Tailwind CDN — all in a single `public/index.html` file.

---

## Key facts before you touch anything

- **One file:** everything is in `public/index.html`. No build step.
- **Current UID:** `uid(email)` hashes the email to a short string (e.g. `u1a2b3c`). This is used as the localStorage key. **Firestore uses `request.auth.uid` (the real Firebase UID)**. After this migration the real Firebase UID is the Firestore document key; the hash is only kept for the manual-login localStorage fallback.
- **Firestore collections** (from `firestore.indexes.json`):
  - `users/{firebaseUid}` — profile doc
  - `aePools/{firebaseUid}_{quarter}` — pool doc with `seUid` + `quarter` + `aes` array
- **Security rules** (already deployed) enforce: owner reads/writes own docs; admin (`brad.towers@simprogroup.com`) reads all docs.
- **No Firestore writes happen yet** — the rules are live but harmless until this migration lands.
- The Firestore SDK must be the **compat** flavour (`firebase-firestore-compat.js`) to match the existing `firebase-app-compat.js` / `firebase-auth-compat.js` scripts.
- **Safe DOM helpers** already exist in the file: `cel(tag, cls)`, `ctxt(tag, cls, text)`, `app(parent, ...children)` — use these instead of innerHTML for any dynamic content.

---

## Task 1: Add Firestore SDK + initialise `db`

**Files:**
- Modify: `public/index.html` lines 7–10 (script tags) and lines ~444–445 (Firebase init)

**Step 1: Add the Firestore compat SDK script tag**

After the existing Firebase auth script tag (line 10), add:

```html
<script src="https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore-compat.js"></script>
```

**Step 2: Initialise `db` after `firebase.initializeApp()`**

Change:
```javascript
firebase.initializeApp(firebaseConfig);
var fbAuth = firebase.auth();
```
to:
```javascript
firebase.initializeApp(firebaseConfig);
var fbAuth = firebase.auth();
var db     = firebase.firestore();
```

**Step 3: Verify in browser console — no errors on load**

Open `public/index.html` in browser. `window.db` should be a Firestore instance, no console errors.

---

## Task 2: Add async Firestore data helpers

**Files:**
- Modify: `public/index.html` — add block immediately after the existing `getAllProfiles` function (~line 523)

```javascript
// ── Firestore helpers (Google SSO path) ───────────────────────────────────

function fsGetProfile(firebaseUid, callback) {
  db.collection('users').doc(firebaseUid).get()
    .then(function(doc) { callback(doc.exists ? doc.data() : null); })
    .catch(function()   { callback(null); });
}

function fsSetProfile(firebaseUid, data) {
  return db.collection('users').doc(firebaseUid).set(data);
}

function fsGetPool(firebaseUid, q, callback) {
  db.collection('aePools').doc(firebaseUid + '_' + q).get()
    .then(function(doc) { callback(doc.exists ? doc.data().aes : null); })
    .catch(function()   { callback(null); });
}

function fsSetPool(firebaseUid, q, aesArray) {
  return db.collection('aePools').doc(firebaseUid + '_' + q).set({
    seUid: firebaseUid,
    quarter: q,
    aes: aesArray
  });
}

function fsGetAllProfiles(callback) {
  db.collection('users').where('onboarded', '==', true).get()
    .then(function(snapshot) {
      var profiles = [];
      snapshot.forEach(function(doc) { profiles.push(doc.data()); });
      callback(profiles);
    })
    .catch(function() { callback([]); });
}

function fsGetPoolsForQuarter(q, callback) {
  db.collection('aePools').where('quarter', '==', q).get()
    .then(function(snapshot) {
      var pools = {};
      snapshot.forEach(function(doc) {
        var d = doc.data();
        pools[d.seUid] = d.aes || [];
      });
      callback(pools);
    })
    .catch(function() { callback({}); });
}
```

---

## Task 3: Track the Firebase Auth UID on `currentUser`

**Files:**
- Modify: `public/index.html` — `doGoogleSignIn()` and `doLogin()`

**Step 1: Update `doGoogleSignIn` to pass the Firebase UID**

Change the `doLogin` call inside `.then()` from:
```javascript
doLogin(user.email, user.displayName || user.email.split('@')[0]);
```
to:
```javascript
doLogin(user.email, user.displayName || user.email.split('@')[0], user.uid);
```

**Step 2: Update `doLogin` signature and body**

Change:
```javascript
function doLogin(email, name) {
  if (!email || !name) {
    document.getElementById('loginErr').classList.remove('hidden');
    return;
  }
  document.getElementById('loginErr').classList.add('hidden');
  currentUser = { uid: uid(email), email: email, name: name };
  var p = getProfile(currentUser.uid);
  if (!p || !p.onboarded) {
    document.getElementById('obName').value = name;
    showPage('pgOnboard');
  } else {
    profile = p;
    loadPool();
    buildDashboard();
    showPage('pgApp');
  }
}
```
to:
```javascript
function doLogin(email, name, firebaseUid) {
  if (!email || !name) {
    document.getElementById('loginErr').classList.remove('hidden');
    return;
  }
  document.getElementById('loginErr').classList.add('hidden');
  currentUser = { uid: uid(email), email: email, name: name, firebaseUid: firebaseUid || null };

  if (firebaseUid) {
    fsGetProfile(firebaseUid, function(p) {
      if (!p || !p.onboarded) {
        document.getElementById('obName').value = name;
        showPage('pgOnboard');
      } else {
        profile = p;
        loadPool(function() {
          buildDashboard();
          showPage('pgApp');
        });
      }
    });
  } else {
    var p = getProfile(currentUser.uid);
    if (!p || !p.onboarded) {
      document.getElementById('obName').value = name;
      showPage('pgOnboard');
    } else {
      profile = p;
      loadPool(function() {
        buildDashboard();
        showPage('pgApp');
      });
    }
  }
}
```

---

## Task 4: Migrate `obFinish()` to write profile to Firestore

**Files:**
- Modify: `public/index.html` — `obFinish()`, the final 4 lines

Find:
```javascript
  setProfile(currentUser.uid, profile);
  loadPool();
  buildDashboard();
  showPage('pgApp');
```

Replace with:
```javascript
  if (currentUser.firebaseUid) {
    profile.firebaseUid = currentUser.firebaseUid;
    fsSetProfile(currentUser.firebaseUid, profile).then(function() {
      loadPool(function() { buildDashboard(); showPage('pgApp'); });
    }).catch(function(e) {
      console.error('Firestore profile write failed, falling back', e);
      setProfile(currentUser.uid, profile);
      loadPool(function() { buildDashboard(); showPage('pgApp'); });
    });
  } else {
    setProfile(currentUser.uid, profile);
    loadPool(function() { buildDashboard(); showPage('pgApp'); });
  }
```

**Test:** Complete onboarding via Google. Firebase Console → Firestore → `users` → confirm document exists.

---

## Task 5: Migrate `loadPool()` to be async with Firestore

**Files:**
- Modify: `public/index.html` — `loadPool()` and `onQChange()`

**Replace `loadPool()`:**
```javascript
function loadPool(callback) {
  var q = document.getElementById('qSel').value;
  callback = callback || function() {};

  if (currentUser && currentUser.firebaseUid) {
    fsGetPool(currentUser.firebaseUid, q, function(saved) {
      pool = saved || ((profile.region === 'UK' || profile.region === 'BigChange')
        ? JSON.parse(JSON.stringify(DEFAULT_UK_AES))
        : []);
      callback();
    });
  } else {
    var saved = getPool(currentUser.uid, q);
    pool = saved || ((profile.region === 'UK' || profile.region === 'BigChange')
      ? JSON.parse(JSON.stringify(DEFAULT_UK_AES))
      : []);
    callback();
  }
}
```

**Update `onQChange()`:**
```javascript
function onQChange() {
  loadPool(function() {
    buildDashboard();
  });
}
```

---

## Task 6: Migrate `savePool()` and `scheduleSave()` to write to Firestore

**Files:**
- Modify: `public/index.html` — `savePool()` and `scheduleSave()`

**Replace `savePool()`:**
```javascript
function savePool() {
  var q = document.getElementById('qSel').value;
  if (currentUser && currentUser.firebaseUid) {
    fsSetPool(currentUser.firebaseUid, q, pool).then(showToast);
  } else {
    setPool(currentUser.uid, q, pool);
    showToast();
  }
}
```

**Inside `scheduleSave()`, replace the `setProfile` call:**

Find:
```javascript
    setProfile(currentUser.uid, profile);
    document.getElementById('saveInd').textContent = '';
```
Replace with:
```javascript
    if (currentUser && currentUser.firebaseUid) {
      fsSetProfile(currentUser.firebaseUid, profile);
    } else {
      setProfile(currentUser.uid, profile);
    }
    document.getElementById('saveInd').textContent = '';
```

**Test:** Enter AE values, wait 800ms. Firebase Console → `aePools` → confirm `{uid}_Q2` document.

---

## Task 7: Migrate `buildAdminView()` to read from Firestore

**Files:**
- Modify: `public/index.html` — replace `buildAdminView()` entirely

The existing card building used unsafe innerHTML with user data. Replace with safe DOM methods using the existing `cel()`, `ctxt()`, `app()` helpers already in the file.

**Replace `buildAdminView()` entirely:**

```javascript
function buildAdminView() {
  var grid  = document.getElementById('adminGrid');
  var empty = document.getElementById('adminEmpty');
  var q     = document.getElementById('qSel').value;

  while (grid.firstChild) grid.removeChild(grid.firstChild);
  var loading = ctxt('div', 'text-slate-400 text-sm', 'Loading team data…');
  grid.appendChild(loading);
  empty.classList.add('hidden');

  if (!profile || !profile.isAdmin) {
    while (grid.firstChild) grid.removeChild(grid.firstChild);
    empty.classList.remove('hidden');
    return;
  }

  fsGetAllProfiles(function(profiles) {
    fsGetPoolsForQuarter(q, function(pools) {
      while (grid.firstChild) grid.removeChild(grid.firstChild);
      if (!profiles.length) { empty.classList.remove('hidden'); return; }

      profiles.forEach(function(p) {
        var sePool = pools[p.firebaseUid] || [];
        var totCW  = 0;
        sePool.forEach(function(ae) { totCW += ae.cw || 0; });
        var poolUSD = totCW * (p.fx || 1.0);
        var quota   = p.quotas ? (p.quotas[q] || QUARTERS[q].quota) : QUARTERS[q].quota;
        var ote     = p.quarterlyOTE || 0;
        var res     = payout(poolUSD, quota, ote);
        var attPct  = (res.att * 100).toFixed(1);
        var badge   = res.att >= 1   ? ['bg-green-100 text-green-700', 'Quota Hit \u2713']
                    : res.att >= 0.6 ? ['bg-amber-100 text-amber-700', 'Qualified \u2713']
                    :                  ['bg-red-100 text-red-700',      'Below Floor'];

        var card = cel('div', 'bg-white rounded-xl shadow-sm border border-slate-200 p-4');

        var headerRow = cel('div', 'flex items-start justify-between mb-3');
        var nameDiv   = ctxt('div', 'font-semibold text-slate-800', p.displayName || p.email);
        var metaDiv   = ctxt('div', 'text-xs text-slate-400 mt-0.5', (p.region || '\u2014') + ' \u00b7 ' + p.email);
        var infoWrap  = cel('div');
        app(infoWrap, nameDiv, metaDiv);
        var badgeEl   = ctxt('span', 'text-xs font-semibold px-2 py-1 rounded-full ' + badge[0], badge[1]);
        app(headerRow, infoWrap, badgeEl);

        var attRow    = cel('div', 'flex justify-between text-sm');
        app(attRow, ctxt('span', 'text-slate-500', 'Attainment'), ctxt('span', 'font-bold', attPct + '%'));

        var barOuter  = cel('div', 'h-2 bg-slate-100 rounded-full overflow-hidden');
        var barInner  = cel('div', 'h-full rounded-full ' + barColor(res.att));
        barInner.style.width = Math.min(res.att * 100, 100) + '%';
        barOuter.appendChild(barInner);

        var footRow   = cel('div', 'flex justify-between text-xs text-slate-500');
        app(footRow,
          ctxt('span', '', fmt(poolUSD) + ' / ' + fmt(quota)),
          ctxt('span', 'font-semibold', 'Est: ' + fmt(res.pay)));

        var statsWrap = cel('div', 'space-y-2');
        app(statsWrap, attRow, barOuter, footRow);

        app(card, headerRow, statsWrap);
        grid.appendChild(card);
      });
    });
  });
}
```

---

## Task 8: Replace `window.onload` with `onAuthStateChanged`

**Files:**
- Modify: `public/index.html` — `window.onload` block

Replace:
```javascript
window.onload = function() {
  var email = document.getElementById('inEmail').value.trim();
  var name  = document.getElementById('inName').value.trim();
  var savedUid = uid(email);
  var p = getProfile(savedUid);
  if (p && p.onboarded) {
    doLogin(email, name);
  }
};
```
with:
```javascript
window.onload = function() {
  fbAuth.onAuthStateChanged(function(user) {
    if (user) {
      var domain = user.email.split('@')[1] || '';
      if (ALLOWED_DOMAINS.indexOf(domain) !== -1) {
        doLogin(user.email, user.displayName || user.email.split('@')[0], user.uid);
      } else {
        fbAuth.signOut();
      }
    }
  });
};
```

---

## Task 9: Update `doSignOut()` to sign out from Firebase

**Files:**
- Modify: `public/index.html` — `doSignOut()`

Change:
```javascript
function doSignOut() {
  currentUser = null;
  profile = null;
  pool = [];
  showPage('pgLogin');
}
```
to:
```javascript
function doSignOut() {
  currentUser = null;
  profile = null;
  pool = [];
  fbAuth.signOut();
  showPage('pgLogin');
}
```

---

## Task 10: Deploy, commit, and end-to-end test

**Step 1: Deploy**
```bash
firebase deploy --only hosting
```

**Step 2: End-to-end checklist**

- [ ] Sign in with Google → onboarding for new account
- [ ] Complete onboarding → `users/{uid}` doc appears in Firestore Console
- [ ] Enter AE values → `aePools/{uid}_Q2` doc updates after 800ms
- [ ] Change quarter → correct pool loads from Firestore
- [ ] Close and reopen browser → auto-login, same data visible
- [ ] Open same account on second device → identical data (cross-device sync)
- [ ] Sign in as `brad.towers@simprogroup.com` → Team View shows all SEs with live attainment
- [ ] Manual email/name login → still works, uses localStorage fallback

**Step 3: Commit**
```bash
git add public/index.html docs/plans/2026-04-20-firestore-migration.md
git commit -m "Migrate data layer from localStorage to Firestore

Profile and AE pool data now persists in Firestore (users + aePools
collections). Google SSO users get cross-device sync and the admin
Team View queries Firestore directly for live data across all SEs.
Manual login retains localStorage fallback.

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
git push
```
