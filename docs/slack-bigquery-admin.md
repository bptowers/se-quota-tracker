# Slack message → BigQuery Admin (data project `edw-simprogroup-propagation`)

_Formatted for Slack (mrkdwn). Paste the block below._

---

Hi [name] :wave:

The *SE Quota Tracker* app runs a daily Cloud Function that needs *read-only* access to a single table in `edw-simprogroup-propagation`:
`sp_group.group_sales_opportunity`

Please grant the app's service account *`113593790107-compute@developer.gserviceaccount.com`* these two roles on the `edw-simprogroup-propagation` project:
```
gcloud projects add-iam-policy-binding edw-simprogroup-propagation \
  --member="serviceAccount:113593790107-compute@developer.gserviceaccount.com" \
  --role="roles/bigquery.dataViewer"

gcloud projects add-iam-policy-binding edw-simprogroup-propagation \
  --member="serviceAccount:113593790107-compute@developer.gserviceaccount.com" \
  --role="roles/bigquery.jobUser"
```
If you'd rather scope it tighter: dataset-level *Data Viewer* on `sp_group` + project-level *BigQuery Job User* is enough. Strictly read-only — no writes.

The service account already exists, so this can be run anytime. Thanks! :pray:
