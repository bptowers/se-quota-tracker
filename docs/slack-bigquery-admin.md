# Slack message → BigQuery Admin (data project `edw-simprogroup-propagation`)

_Formatted for Slack (mrkdwn). Paste the block below._

---

Hi [name] :wave:

The *SE Quota Tracker* app runs a daily Cloud Function that needs *read-only* access to a single table in `edw-simprogroup-propagation`:
`sp_group.group_sales_opportunity`

Please grant the app's service account *`se-quota-tracker@appspot.gserviceaccount.com`* these two roles on the `edw-simprogroup-propagation` project:
```
gcloud projects add-iam-policy-binding edw-simprogroup-propagation \
  --member="serviceAccount:se-quota-tracker@appspot.gserviceaccount.com" \
  --role="roles/bigquery.dataViewer"

gcloud projects add-iam-policy-binding edw-simprogroup-propagation \
  --member="serviceAccount:se-quota-tracker@appspot.gserviceaccount.com" \
  --role="roles/bigquery.jobUser"
```
If you'd rather scope it tighter: dataset-level *Data Viewer* on `sp_group` + project-level *BigQuery Job User* is enough. Strictly read-only — no writes.

One timing note :alarm_clock: — that service account is created the first time we deploy the function. If the grant errors with "service account does not exist," it just means we haven't deployed yet. I'll confirm the account is live before you run this. Thanks! :pray:
