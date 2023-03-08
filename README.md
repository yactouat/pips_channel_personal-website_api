# pips_channel_personal-website_api

<!-- TOC -->

- [pips_channel_personal-website_api](#pips_channel_personal-website_api)
  - [what is this ?](#what-is-this-)
  - [pre requisites](#pre-requisites)
  - [GCP project](#gcp-project)
    - [the actual stuff](#the-actual-stuff)
    - [service accounts and roles/permissions](#service-accounts-and-rolespermissions)
      - [Cloud Run Deployer](#cloud-run-deployer)
    - [the SDK](#the-sdk)
  - [nice to have](#nice-to-have)
  - [how to run and setup locally](#how-to-run-and-setup-locally)
  - [CI/CD](#cicd)
  - [secrets and env vars](#secrets-and-env-vars)
    - [deploying to the GCP manually](#deploying-to-the-gcp-manually)
    - [deploying to the GCP automatically](#deploying-to-the-gcp-automatically)
  - [connecting to the Supabase Postgres instance if you're using Supabase too](#connecting-to-the-supabase-postgres-instance-if-youre-using-supabase-too)
  - [Google Cloud PubSub](#google-cloud-pubsub)
  - [API resources](#api-resources)
    - [blog posts](#blog-posts)
      - [GET /blog-posts](#get-blog-posts)
      - [GET /blog-posts/:slug](#get-blog-postsslug)
    - [tokens](#tokens)
      - [POST /tokens](#post-tokens)
    - [users](#users)
      - [POST /users](#post-users)
      - [GET /users/:id](#get-usersid)
      - [PUT /users/:id](#put-usersid)
  - [Contribution guidelines](#contribution-guidelines)
  - [Contributors](#contributors)

<!-- /TOC -->

<!-- TODO update the docs -->

## what is this ?

the server-side code that powers my PIPS (Portable Integrated Personal System) JSON API, feel free to use this as a template for your own API

## pre requisites

- [Node.js](https://nodejs.org/en/)
- [Typescript](https://www.typescriptlang.org/)
- a GitHub account (but hey, you already have one, don't you ?)

## GCP project

### the actual stuff

- a Google Cloud Platform (GCP) project
- you must have the `gcloud` CLI installed and configured to your GCP project (`gcloud auth application-default login` and `gcloud init` if it's not the case)

### service accounts and roles/permissions

Instead of using whatever default service account is affected automatically during the CI/CD process and while interacting with GCP APIs, I like to create dedicated service accounts:

#### Cloud Run Deployer

It has roles:

- `Artifact Registry Writer`
- `Cloud Build Editor`
- `Cloud Build Service Account`
- `Cloud Run Developer`
- `Service Account User`

Also, at some point, a default service account for Cloud Build in your project (`**@cloudbuild.gserviceaccount.com`) will be triggered, and it will need to have the:

- `Artifact Registry Administrator` role
- `Storage Admin` role

Finally, the compute service account that will be used (`**--compute@developer.gserviceaccount.com`) will need to have the:

- `Secret Manager Secret Accessor` role

This is the result of a trial and error process, trying to set a service account from scratch to figure this out. Please don't hesitate to open an issue if you find a better way to do this.

### the SDK

If you're running this in full local mode, you'll need to install the GCP SDK; I plan to do this in a not too distant future, but if you do it before me, I'd be happy to accept a PR !

## nice to have

- you can provision a PostgreSQL database if you plan to deploy the solution; I'm personnaly using Supabase, if you do too you'll need to download the server root certificate and store it in the repo as `./creds/supabase-root.crt` (git ignored)

## how to run and setup locally

- clone the repo
- run `npm install` to install the dependencies
- run `npm run build` to build the project
- run `npm run dev` to start the server on port 8080
- `docker compose up -d` will start a local postgres instance and a `pgAdmin` instance
- migrations are run by default with `npm run dev` (and also `start`)
- to run the migrations afterwards, run `npm run migrate-db-dev`

## CI/CD

testing with jest, building with tsc, and deploying to the GCP, are all automated using Github Actions under the `.github/workflows` folder;

the testing and building part happens whenever a pull request is created or updated

the deploying to the GCP part happens whenever a new release is created on Github; you must have a project with the billing setup on the GCP

## secrets and env vars

- all the secrets and env vars you need are listed in the GitHub workflows
- a secret ending with `FILE_NAME` is a path to a file that contains the actual secret
- a secret ending with `_KEY` is a JSON key (such as service acounts keys in the GCP) and its contents
- I use the `dotenv` package only on dev as I use GitHub repo secrets and the GCP Secret Manager to store/access the sensitive env vars on prod; you can
  - use the `.env.example` file as a template for your own `.env` file
  - checkout out the GitHub workflows to see how the secrets and env vars are used

### deploying to the GCP manually

- running `gcloud run deploy`, you may be prompted several times to confirm stuff, and you can also specify a few options:
  - if you plan to point a domain name to your service, check out [domain mapping availability for Cloud Run](https://cloud.google.com/run/docs/mapping-custom-domains#run) to pick [the right region](https://cloud.google.com/compute/docs/regions-zones)
  - the `--port=PORT` option is used to specify the port on which the server will listen (for instance `8080`)
  - the `--region=REGION` option is used to specify the region in which the service will be deployed (for instance, `europe-west1`)
  - `gcloud run deploy --help` tells you more about the options when deploying a service to Cloud Run

### deploying to the GCP automatically

- you may need several service account key JSON files, you can create them in the GCP IAM and Admin section of the console
- to deploy the app' on Cloud Run, you'll need to create 2 secrets in the Github repo settings:
  - `CLOUD_RUN_DEPLOYER_SA_KEY` and the value being the content of the JSON file; if you're unsure what service account to use, check out the YAML definition of your Cloud Run service in the GCP console, it should be listed there
  - `CLOUDRUN_SERVICE` and the value being the name of your Cloud Run service
- blog posts contents are retrieved from GCP Cloud Storage; in order for the API to be able to access the files, you'll need to =>
  - [configure a secret in the GCP](https://cloud.google.com/run/docs/configuring/secrets) so that your Cloud Run service can access the stored blog posts contents
  - the Secret Manager secret name should be named `BUCKET_VIEWER_SA_KEY` and the value should be another (or the same) Cloud Run service account JSON key file
  - you of course need to have a GCP bucket created and populated with your blog posts contents
  - you should also set =>
    - a `BLOG_POSTS_BUCKET` GitHub repository secret for the name of the GCP Cloud Storage BLOG_POSTS_BUCKET where your blog posts contents are stored
    - a `BUCKET_VIEWER_SA_KEY_FILE_NAME` GitHub repository secret for the path of the Secret Manager secret to be accessed within the Cloud Run service, for instance `/run/secrets/my_secret.json`
    - ! the path of your secret should not be a relative one

## connecting to the Supabase Postgres instance (if you're using Supabase too)

- you'll need to download the root SSL certificate from the Supabase dashboard
- also, a few env vars will need to be set, both locally and on your deployed service (check out <https://www.postgresql.org/docs/9.1/libpq-envars.html>)
- a `pgAdmin` client is provided via the `docker-compose.yml` file, you can use it to connect to the database; it is available on port 8081 after a `docker-compose up` command
- if you're having troubles to connect to the database, check out [the Supabase documentation](https://supabase.com/docs/guides/database/connecting-to-postgres)
- as for the GCP BLOG_POSTS_BUCKET credentials, you'll also need to [configure a secret in the GCP](https://cloud.google.com/run/docs/configuring/secrets) so that your Cloud Run service can access the server root certificate of your Postgres instance
- the Secret Manager secret name should be named `SUPABASE_POSTGRES_ROOT_CERT` and the value should be the contents of the root certificate you have downloaded from Supabase (dont forget to grant the service account that created your service access to the secret)
- you should also set a few repository secrets with relevant values based on what you see in the `./env.example` file and the workflos files
- ! the path of your secret, under the `SUPABASE_POSTGRES_ROOT_CERT` env var, should not be in the same directory than the blog posts bucket credentials secret
- on each new release, migrations are run on the live database before the server starts

## Google Cloud PubSub

I'm using PubSub to broadcast events across the PIPS system.

You will need to create a topic to send a notification to when a new user is created. The topic fully qualified name should be set in the `PUBSUB_USERS_TOPIC` env var.

## API resources

home route at `/` should return =>

```json
{
  "msg": "api.yactouat.com is available",
  "data": {
    "services": [
      {
        "service": "database",
        "status": "up"
      }
    ]
  }
}
```

### blog posts

#### GET `/blog-posts`

- response is a list of published blog posts metadata as in =>

  ```json
  {
    "msg": "2 blog posts fetched",
    "data": [
      {
        "date": "2021-01-02",
        "slug": "newest-blog-post",
        "title": "newest blog post"
      },
      {
        "date": "2021-01-01",
        "slug": "blog-post",
        "title": "blog post"
      }
    ]
  }
  ```

#### GET `/blog-posts/:slug`

- response is the searched blog post data as in =>

  ```json
  {
    "msg": "newest-blog-post blog post data fetched",
    "data": {
      "contents": "# this is the markdown contents of this blog post",
      "date": "2021-01-02",
      "slug": "newest-blog-post",
      "title": "newest blog post"
    }
  }
  ```

- please note each of this JSON item's props, other than `contents`, are retrieved from the meta data of the blog post file; so feel free to tweak these other props to your needs
- a blog post that is not found will return a 404

### tokens

#### POST `/tokens`

- generates a JWT token for the user or a 401 if the action is not authorized
- input payload must look like =>

  ```json
  {
    "email": "myemail@domain.com",
    "password": "my-password",
    "socialHandle": "my-social-handle",
    "socialHandleType": "GitHub" // or "LinkedIn"
  }
  ```

- a success response looks like so =>

```json
{
  "msg": "auth token issued",
  "data": {
    "token": "some.jwt.token"
  }
}
```

### users

#### POST `/users`

- creates a new user in the database, e.g. sign up
- input payload must look like =>

  ```json
  {
    "email": "myemail@domain.com",
    "password": "my-password",
    "socialHandle": "my-social-handle",
    "socialHandleType": "GitHub" // or "LinkedIn"
  }
  ```

- response is a success response =>

  ```json
  {
    "msg": "thanks for registering to to api.yactouat.com; you will receive a verification link by email shortly",
    "data": {
      "token": "some.jwt.token",
      "user": {
        "id": "some-id",
        "email": "myemail@domain.com",
        "password": null,
        "socialHandle": "my-social-handle",
        "socialHandleType": "GitHub",
        "verified": false
      }
    }
  }
  ```

- behind the scenes, the API just sends a Pub/Sub message to a topic that should be listened to by the PIPS system, specifically a mailer service that will send a verification email to the user

#### GET `/users/:id`

- returns the user data for the given id
- requires a valid JWT token in the `Authorization` header of type `Bearer`
- response is a success response =>

  ```json
  {
    "msg": "user fetched",
    "data": {
      "id": "some-id",
      "email": "myemail@domain.com",
      "password": null,
      "socialHandle": "my-social-handle",
      "socialHandleType": "GitHub",
      "verified": false
    }
  }
  ```

#### PUT `/users/:id`

- updates a new user as `verified` in the database, after he/she has signed up and clicked on the verification link in the email sent to him/her
- input payload must look like =>

  ```json
  {
    "email": "myemail@domain.com",
    "verificationToken": "special-token"
  }
  ```

- response is a success response =>

  ```json
  {
    "msg": "thanks for registering to to api.yactouat.com; you will receive a verification link by email shortly",
    "data": {
      "token": "some.jwt.token",
      "user": {
        "id": "some-id",
        "email": "myemail@domain.com",
        "password": null,
        "socialHandle": "my-social-handle",
        "socialHandleType": "GitHub",
        "verified": true
      }
    }
  }
  ```

- the token used to verify the user is a one-time-use token, so it's status to `expired` in the database after the user has used it

## Contribution guidelines

dear past, present, and future contributors, you have my many thanks, but please follow these guidelines:

- please use comments to explain your code, even if it's obvious to you, it might not be to someone else
- you are free to arrange the code, the folder structure, the file names, etc. as you see fit if you're able to provide a good reason for it

that's all, thank you for your time !

## Contributors

a big thanks goes to the contributors of this project:

<table>
<tbody>
    <tr>
        <td align="center"><a href="https://github.com/yactouat"><img src="https://avatars.githubusercontent.com/u/37403808?v=4" width="100px;" alt="yactouat"/><br /><sub><b>Yactouat</b></sub></a><br /><a href="https://github.com/yactouat"></td>
    </tr>
</tbody>
</table>
