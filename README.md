# pips_channel_personal-website_api

<!-- TOC -->

- [pips_channel_personal-website_api](#pips_channel_personal-website_api)
  - [what is this ?](#what-is-this-)
  - [pre requisites](#pre-requisites)
  - [nice to have](#nice-to-have)
  - [how to run and setup](#how-to-run-and-setup)
  - [CI/CD](#cicd)
    - [deploying to the GCP manually](#deploying-to-the-gcp-manually)
    - [deploying to the GCP automatically](#deploying-to-the-gcp-automatically)
  - [connecting to the Supabase Postgres instance if you're using Supabase too](#connecting-to-the-supabase-postgres-instance-if-youre-using-supabase-too)
  - [API resources](#api-resources)
    - [blog posts](#blog-posts)
      - [GET /blog-posts](#get-blog-posts)
      - [GET /blog-posts/:slug](#get-blog-postsslug)
    - [builds](#builds)
      - [GET /builds](#get-builds)
      - [POST /builds](#post-builds)
    - [users](#users)
      - [POST /users](#post-users)
      - [PUT /users](#put-users)
  - [Contribution guidelines](#contribution-guidelines)
  - [Contributors](#contributors)

<!-- /TOC -->

## what is this ?

the server-side code that powers my PIPS (Portable Integrated Personal System) JSON API, feel free to use this as a template for your own API

## pre requisites

- [Node.js](https://nodejs.org/en/)
- [Typescript](https://www.typescriptlang.org/)
- a Google Cloud Platform (GCP) project
- you must have the `gcloud` CLI installed and configured to your GCP project (`gcloud init` if it's not the case)
- you need to have provisioned a PostgreSQL database; I'm personnaly using Supabase, if you do too you'll need to download the server root certificate and store it in the repo root folder as `supabase-root.crt`

## nice to have

- a NextJS app' to consume this API that uses static generation (cf. `/builds` resource)

## how to run and setup

- clone the repo
- run `npm install` to install the dependencies
- run `npm run build` to build the project
- run `npm run start` to start the server on port 8080
- when developping locally, make sure you have your Google Application Default credentials setup; if not just run `gcloud auth application-default login` command
- I use the `dotenv` package only on dev as I use GitHub repo secrets and the GCP Secret Manager to store/access the sensitive env vars on prod; you can use the `.env.example` file as a template for your own `.env` file
- there are routes that can be only accessed locally for convenience, check out the `./src/api.ts` routes that start with `/local`

## CI/CD

testing with jest, building with tsc, and deploying to the GCP, are all automated using Github Actions under the `.github/workflows` folder;

the testing and building part happens whenever a pull request is created or updated, be aware that a file tracking the latest build commit SHA is used to facilitate auto push, so dont be surprised if you need to pull again before pushing your work on a PR;

the deploying to the GCP part happens whenever a new release is created on Github; you must have a project with the billing setup on the GCP

if you have provisioned a database that requires a root SSL certificate, you'll need to configure a secret for this

### deploying to the GCP manually

- running `gcloud run deploy`, you may be prompted several times to confirm stuff, and you can also specify a few options:
  - if you plan to point a domain name to your service, check out [domain mapping availability for Cloud Run](https://cloud.google.com/run/docs/mapping-custom-domains#run) to pick [the right region](https://cloud.google.com/compute/docs/regions-zones)
  - the `--port=PORT` option is used to specify the port on which the server will listen (for instance `8080`)
  - the `--region=REGION` option is used to specify the region in which the service will be deployed (for instance, `europe-west1`)
  - `gcloud run deploy --help` tells you more about the options when deploying a service to Cloud Run

### deploying to the GCP automatically

- you will need a service account key JSON file, you can create one in the GCP IAM and Admin section of the console
- next, you'll need to create 2 secrets in the Github repo settings:
  - `GCP_CLOUDRUN_CREDENTIALS` and the value being the content of the JSON file; if you're unsure what service account to use, check out the YAML definition of your Cloud Run service in the GCP console, it should be listed there
  - `GCP_CLOUDRUN_SERVICE_NAME` and the value being the name of your Cloud Run service
- you will also need specify sensitive and non-sensitive env vars for service name, region, port, etc., check out <https://docs.github.com/en/actions/learn-github-actions/contexts#vars-context> and the `./.github/workflows/cd.yml` file for more info
- blog posts contents are retrieved from GCP Cloud Storage; in order for the API to be able to access the files, you'll need to =>
  - [configure a secret in the GCP](https://cloud.google.com/run/docs/configuring/secrets) so that your Cloud Run service can access the stored blog posts contents
  - the Secret Manager secret name should be named `GCP_STORAGE_CREDENTIALS` and the value should be another (or the same) Cloud Run service account JSON key file
  - you of course need to have a GCP bucket created and populated with your blog posts contents
  - you should also set =>
    - a `GCP_BUCKET` GitHub repository secret for the name of the GCP Cloud Storage bucket where your blog posts contents are stored
    - a `GCP_STORAGE_CREDENTIALS_SECRET_PATH` GitHub repository secret for the path of the Secret Manager secret to be accessed within the Cloud Run service, for instance `/run/secrets/my_secret.json`

## connecting to the Supabase Postgres instance (if you're using Supabase too)

- you'll need to download the root SSL certificate from the Supabase dashboard
- also, a few env vars will need to be set, both locally and on your deployed service (check out <https://www.postgresql.org/docs/9.1/libpq-envars.html>)
- a `pgAdmin` client is provided via the `docker-compose.yml` file, you can use it to connect to the database; it is available on port 8081 after a `docker-compose up` command
- if you're having troubles to connect to the database, check out [the Supabase documentation](https://supabase.com/docs/guides/database/connecting-to-postgres)
- as for the GCP bucket credentials, you'll also need to [configure a secret in the GCP](https://cloud.google.com/run/docs/configuring/secrets) so that your Cloud Run service can access the server root certificate of your Postgres instance
- the Secret Manager secret name should be named `PGSSLROOTCERT` and the value should be the contents of the root certificate you have downloaded from Supabase
- you should also set a few repository secrets with relevant values based on what you see in the `./env.example` file

## API resources

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

### builds

This API resource is related to Vercel builds, mainly the ones for my blog website. To be able to use the functionalities related to this resource, you'll need a `VERCEL_TOKEN` set in your environment variables.

#### GET `/builds`

- response is the list of the previous Vercel builds as in =>

  ```json
  {
    "msg": "1 builds fetched",
    "data": [
      {
        "uid": "MASKED",
        "name": "MASKED",
        "url": "MASKED",
        "created": null,
        "state": "MASKED",
        "type": "MASKED",
        "creator": null,
        "inspectorUrl": "MASKED",
        "meta": {
          "githubCommitAuthorName": "yactouat",
          "githubCommitMessage": "content links open in external tab",
          "githubCommitOrg": "yactouat",
          "githubCommitRef": "master",
          "githubCommitRepo": "pips_channel_personal-website_webapp",
          "githubCommitSha": "a141c64a8852f48c58e29cb0d1d68d388500f2e8",
          "githubDeployment": "MASKED",
          "githubOrg": "yactouat",
          "githubRepo": "pips_channel_personal-website_webapp",
          "githubRepoOwnerType": "MASKED",
          "githubCommitRepoId": "MASKED",
          "githubRepoId": "MASKED",
          "githubCommitAuthorLogin": "MASKED"
        },
        "target": "production",
        "aliasError": null,
        "aliasAssigned": null,
        "isRollbackCandidate": null,
        "createdAt": null,
        "buildingAt": null,
        "ready": 1674391339108
      }
    ]
  }
  ```

- here, the `meta` prop is the most interesting one, it contains the GitHub commit metadata that triggered the build

#### POST `/builds`

- input payload must look like =>

  ```json
  {
    "vercelToken": "my-vercel-api-token"
  }
  ```

- please not that the input vercel token acts an authentication system for this endpoint for now

- response is a build success response =>

  ```json
  {
    "msg": "new build triggered",
    "data": {
      "uid": "MASKED",
      "name": "MASKED",
      "url": "MASKED",
      "created": null,
      "state": "MASKED",
      "type": "MASKED",
      "creator": null,
      "inspectorUrl": "MASKED",
      "meta": {
        "githubCommitAuthorName": "yactouat",
        "githubCommitMessage": "content links open in external tab",
        "githubCommitOrg": "yactouat",
        "githubCommitRef": "master",
        "githubCommitRepo": "pips_channel_personal-website_webapp",
        "githubCommitSha": "a141c64a8852f48c58e29cb0d1d68d388500f2e8",
        "githubDeployment": "MASKED",
        "githubOrg": "yactouat",
        "githubRepo": "pips_channel_personal-website_webapp",
        "githubRepoOwnerType": "MASKED",
        "githubCommitRepoId": "MASKED",
        "githubRepoId": "MASKED",
        "githubCommitAuthorLogin": "MASKED"
      },
      "target": "production",
      "aliasError": null,
      "aliasAssigned": null,
      "isRollbackCandidate": null,
      "createdAt": null,
      "buildingAt": null,
      "ready": 1674391339108
    }
  }
  ```

- this endpoint triggers a Vercel build with no build cache, useful when you want to re run static site generation to create/update blog pages
- possible error codes are =>
  - 401
  - 500

### users

<!-- TODO -->

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
    "msg": "user created, thanks for registering to to api.yactouat.com; please wait for your account to be verified, you will be informed by email when it is the case",
    "data": {
      "email": "myemail@domain.com",
      "socialHandle": "my-social-handle",
      "socialHandleType": "GitHub"
    }
  }
  ```

- when you create an account, it is not verified by default, you will be informed by email when your account is verified

<!-- TODO -->

#### PUT `/users`

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
