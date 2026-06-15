# Slack message → Cloud Admin (Firebase project `se-quota-tracker`)

_Formatted for Slack (mrkdwn). Paste the block below._

---

Hi [name] :wave:

We're adding a small Cloud Function to the *SE Quota Tracker* (`se-quota-tracker`) that pulls Closed Won data into the app once a day. It needs two things that require admin access on that project:

*1. Upgrade the project to the Blaze (pay-as-you-go) plan.*
Cloud Functions require Blaze. The workload is tiny — one query a day plus a few small writes — so expected cost is ~$0/month, within the free tier.
Firebase Console → `se-quota-tracker` → ⚙ Settings → Usage & billing → modify plan → Blaze (link a billing account).

*2. Enable these APIs on the project:*
```
gcloud services enable \
  cloudfunctions.googleapis.com \
  cloudbuild.googleapis.com \
  cloudscheduler.googleapis.com \
  artifactregistry.googleapis.com \
  pubsub.googleapis.com \
  --project=se-quota-tracker
```

That's everything on your side — no data access is involved here; the BigQuery read access is being arranged separately with the data team. Once this is done I'll deploy the function. Thanks! :pray:
