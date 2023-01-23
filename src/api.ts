import { Client } from "pg";
import express from "express";
import fs from "fs";

import { allowVercelAccess } from "./middlewares/allow-vercel-access";
import {
  fetchBlogPostDataFromFileSystem,
  fetchBlogPostDataFromGCPBucket,
  fetchBlogPostsMetadataFromFileSystem,
  fetchBlogPostsMetadataFromGCPBucket,
} from "./resources/blog-posts";
import { getVercelBuilds, postVercelBuild } from "./resources/builds";
import sendResponse from "./helpers/send-response";

// ! you need to have your env correctly set up if you wish to run this API locally (see `.env.example`)
if (process.env.NODE_ENV === "development") {
  require("dotenv").config();
}

const API = express();
API.use(express.json());

API.get("/", async (req, res) => {
  const pgClientConfig = {
    database: process.env.PGDATABASE,
    host: process.env.PGHOST,
    // this object will be passed to the TLSSocket constructor
    ssl: {
      ca: fs.readFileSync(process.env.PGSSLROOTCERT as string).toString(),
    },
  };
  const pgClient = new Client(pgClientConfig);
  let dbIsUp = true;
  try {
    await pgClient.connect();
    const qRes = await pgClient.query("SELECT $1::text as message", [
      "DB IS UP",
    ]);
    console.log(qRes.rows[0].message);
  } catch (error) {
    dbIsUp = false;
    console.error(error);
  } finally {
    await pgClient.end();
  }
  sendResponse(
    res,
    200,
    dbIsUp
      ? "api.yactouat.com is available"
      : "api.yactouat.com is partly available",
    {
      services: [
        {
          service: "database",
          status: dbIsUp ? "up" : "down",
        },
      ],
    }
  );
});

API.get("/blog-posts", async (req, res) => {
  const blogPostsMetadata = await fetchBlogPostsMetadataFromGCPBucket();
  sendResponse(
    res,
    200,
    `${blogPostsMetadata.length} blog posts fetched`,
    blogPostsMetadata
  );
});

API.get("/blog-posts/:slug", async (req, res) => {
  const slug = req.params.slug;
  try {
    const blogPostdata = await fetchBlogPostDataFromGCPBucket(slug);
    sendResponse(res, 200, `${slug} blog post data fetched`, blogPostdata);
  } catch (error) {
    console.error(error);
    sendResponse(res, 404, `${slug} blog post data not found`);
  }
});

API.get("/builds", async (req, res) => {
  const builds = await getVercelBuilds(process.env.NODE_ENV !== "development");
  if (builds.length > 0) {
    sendResponse(res, 200, `${builds.length} builds fetched`, builds);
  } else {
    sendResponse(res, 404, "no builds found");
  }
});

API.post("/builds", allowVercelAccess, async (req, res) => {
  const buildWentThrough = await postVercelBuild(req.body.vercelToken ?? "");
  if (buildWentThrough) {
    const latestBuilds = await getVercelBuilds(
      process.env.NODE_ENV !== "development"
    );
    sendResponse(res, 200, "new build triggered", latestBuilds[0]);
  } else {
    sendResponse(res, 500, "build failed");
  }
});

if (process.env.NODE_ENV === "development") {
  // using mocks in development mode
  const MOCK_POSTS_DIR = "MOCK_posts";
  // blog post retrieved from file system
  API.get("/local/blog-posts", (req, res) => {
    const blogPostsMetadata =
      fetchBlogPostsMetadataFromFileSystem(MOCK_POSTS_DIR);
    sendResponse(
      res,
      200,
      `${blogPostsMetadata.length} blog posts fetched`,
      blogPostsMetadata
    );
  });
  API.get("/local/blog-posts/:slug", async (req, res) => {
    const slug = req.params.slug;
    try {
      const blogPostdata = await fetchBlogPostDataFromFileSystem(
        slug,
        MOCK_POSTS_DIR
      );
      sendResponse(res, 200, `${slug} blog post data fetched`, blogPostdata);
    } catch (error) {
      console.error(error);
      sendResponse(res, 404, `${slug} blog post data not found`);
    }
  });
}

const server = API.listen(8080, () => {
  console.log("API server running on port 8080");
});
