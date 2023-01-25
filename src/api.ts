import express from "express";
import { body, validationResult } from "express-validator";
import { SocialHandleType } from "pips_resources_definitions/dist/types";

import allowVercelAccess from "./resources/builds/allow-vercel-access";
import getPgClient from "./database/get-pg-client";
import fetchBlogPostDataFromGCPBucket from "./resources/blog-posts/fetch-blog-post-data-from-gcp-bucket";
import fetchBlogPostsMetadataFromGCPBucket from "./resources/blog-posts/fetch-blog-posts-metadata-from-gcp-bucket";
import getVercelBuilds from "./resources/builds/get-vercel-builds";
import postVercelBuild from "./resources/builds/post-vercel-builds";
import sendResponse from "./send-response";
import validateSocialHandleType from "./resources/users/validate-social-handle-type";

// ! you need to have your env correctly set up if you wish to run this API locally (see `.env.example`)
if (process.env.NODE_ENV === "development") {
  require("dotenv").config();
}

const API = express();
API.use(express.json());

API.get("/", async (req, res) => {
  let dbIsUp = true;
  const pgClient = getPgClient();
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

API.post(
  "/users",
  body("email").isEmail(),
  body("password").isStrongPassword(),
  body("socialHandle").notEmpty().isString(),
  body("socialHandleType").custom((value) => {
    return validateSocialHandleType(value);
  }),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return sendResponse(
        res,
        400,
        "invalid request, no user has been created",
        errors.array()
      );
    }
    const pgClient = getPgClient();
    try {
      await pgClient.connect();
      const qRes = await pgClient.query(
        "INSERT INTO users (email, password, socialhandle, socialhandletype) VALUES ($1, $2, $3, $4) RETURNING *",
        [
          req.body.email,
          req.body.password,
          req.body.socialHandle,
          req.body.socialHandleType,
        ]
      );
      const user = qRes.rows[0];
      sendResponse(res, 201, "user created", user);
    } catch (error) {
      console.error(error);
      sendResponse(res, 500, "user creation failed");
    } finally {
      await pgClient.end();
    }
  }
);

const server = API.listen(8080, () => {
  console.log("API server running on port 8080");
});
