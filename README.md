# pips_channel_personal-website_api

<!-- TOC -->

- [pips_channel_personal-website_api](#pips_channel_personal-website_api)
  - [what is this ?](#what-is-this-)
  - [pre requisites](#pre-requisites)
  - [how to run](#how-to-run)
  - [CI/CD](#cicd)
    - [deploying to the GCP manually](#deploying-to-the-gcp-manually)
    - [deploying to the GCP automatically](#deploying-to-the-gcp-automatically)
  - [API resources](#api-resources)
    - [blog posts WIP](#blog-posts-wip)
  - [Contribution guidelines](#contribution-guidelines)
  - [Contributors](#contributors)

<!-- /TOC -->

## what is this ?

the server-side code that powers my personal website API, feel free to use this as a template for your own API

## pre requisites

- [Node.js](https://nodejs.org/en/)
- [Typescript](https://www.typescriptlang.org/)

## how to run

- clone the repo
- run `npm install` to install the dependencies
- run `npm run build` to build the project
- run `npm run start` to start the server on port 8080

## CI/CD

testing with jest, building with tsc, and deploying to the GCP, are all automated using Github Actions under the `.github/workflows` folder;

the testing and building part happens whenever a pull request is created or updated, be aware that a file tracking the latest build commit SHA is used to facilitate auto push, so dont be surprised if you need to pull again before pushing your work on a PR;

the deploying to the GCP part happens whenever a new release is created on Github; you must have a project with the billing setup on the GCP

### deploying to the GCP manually

- you must have the `gcloud` CLI installed and configured to your project (`gcloud init` if it's not the case)
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

## API resources

### blog posts (WIP)

- a get request to `/blog-posts` will return a list of blog posts as in =>

  ```json
  [
    {
      "date": "2021-01-02",
      "slug": "newest-blog-post",
      "title": "newest blog post",
      "contents": "# newest blog post contents"
    },
    {
      "date": "2021-01-01",
      "slug": "blog-post",
      "title": "blog post",
      "contents": "# blog post contents"
    }
  ]
  ```

- please note each of this JSON item's props, other than `date` and `contents`, are retrieved from the meta data of the blog post file; so feel free to tweak these other props to your needs
  - the file name should be in the format `YYYY-MM-DD-slug.md`
  - the `slug` prop is used to generate the URL of the blog post
  - the `title` prop is used to generate the title of the blog post
- blog posts contents are retrieved from GCP Cloud Storage; in order for the API to be able to access the files, you'll need to [configure a secret in the GCP](https://cloud.google.com/run/docs/configuring/secrets) so that your Cloud Run service can access the stored blog posts contents
  - the Secret Manager secret name should be named `GCP_STORAGE_CREDENTIALS` and the value should be another (or the same) Cloud Run service account JSON key file
  - you should also set =>
    - a `GCP_STORAGE_BUCKET_NAME` GitHub repository secret for the name of the GCP Cloud Storage bucket where your blog posts contents are stored
    - a `GCP_STORAGE_CREDENTIALS_SECRET_PATH` GitHub repository secret for the path of the Secret Manager secret to be accessed within the Cloud Run service, for instance `/run/secrets/my_secret.txt`

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
