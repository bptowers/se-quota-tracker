# Deployment Prerequisites — BigQuery Sync (for Cloud Admin)

The SE Quota Tracker (`se-quota-tracker` Firebase project) needs a Cloud Function
to read Closed Won data from BigQuery and write it into Firestore. Two things
require Cloud Admin / Owner access on the GCP projects. Brad Towers
(brad.towers@simprogroup.com) does not have rights to do these himself.

## 1. Enable the Blaze (pay-as-you-go) plan on `se-quota-tracker`
Cloud Functions require Blaze. The workload is tiny (one BigQuery query/day + a
few Firestore writes) and is expected to cost ~$0/month, well within free tiers.

Console: Firebase Console → `se-quota-tracker` → ⚙ → Usage & billing → modify plan → Blaze, link a billing account.

Or gcloud:
```
gcloud billing projects link se-quota-tracker --billing-account=BILLING_ACCOUNT_ID
```

## 2. Enable required APIs on `se-quota-tracker`
```
gcloud services enable \
  cloudfunctions.googleapis.com \
  cloudbuild.googleapis.com \
  cloudscheduler.googleapis.com \
  artifactregistry.googleapis.com \
  pubsub.googleapis.com \
  --project=se-quota-tracker
```

## 3. Grant the function read access to the BigQuery data project
The functions are 2nd-gen (Cloud Run based) and run as the **compute default
service account** **`113593790107-compute@developer.gserviceaccount.com`**.
This account already exists (no need to wait for a deploy).

Grant read-only BigQuery access on the data project `edw-simprogroup-propagation`:
```
gcloud projects add-iam-policy-binding edw-simprogroup-propagation \
  --member="serviceAccount:113593790107-compute@developer.gserviceaccount.com" \
  --role="roles/bigquery.dataViewer"

gcloud projects add-iam-policy-binding edw-simprogroup-propagation \
  --member="serviceAccount:113593790107-compute@developer.gserviceaccount.com" \
  --role="roles/bigquery.jobUser"
```

Scope can be narrowed to just the dataset `edw-simprogroup-propagation.sp_group`
if preferred (dataset-level Data Viewer + project-level Job User).

## Order of operations
1. Admin: enable Blaze + APIs (done).
2. BigQuery Admin: step 3 (grant BigQuery roles) — can run anytime, SA exists.
3. Brad/Claude: `firebase deploy --only functions` (2nd-gen, no App Engine needed).
4. Brad/Claude: trigger a sync, verify data, then deploy hosting + rules.

The only table accessed (read-only):
`edw-simprogroup-propagation.sp_group.group_sales_opportunity`
