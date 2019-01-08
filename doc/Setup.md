Documentation: <https://firebase.google.com/docs/cli/>

## Install Firebase CLI

* Install npm.
* `npm install -g firebase-tools`
* `firebase login`

## Update to the latest Firebase tools

* `npm install -g firebase-tools`

## Set Firebase Functions Configuration Values

Go to the project Firebase console -> "Project Overview" -> "+ Add app" -> "</>",
and set the configuration values below.

```Cmd
firebase functions:config:set gmail.email="NAME@GMAIL.COM" gmail.password="THE PASSWORD" \
  project.api_key="THE KEY" project.auth_domain="THE DOMAIN" \
  project.database_url="THE URL" project.project_id="THE PROJECT ID" \
  project.storage_bucket="THE STORAGE BUCKET" project.messaging_sender_id="THE ID"
```

## Deploy Updated Project

```Cmd
cd project_root
firiebase deploy
```