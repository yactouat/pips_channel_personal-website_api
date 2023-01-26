import bcrypt from "bcrypt";
import { body, validationResult } from "express-validator";
import express from "express";
import { UserResource } from "pips_resources_definitions/dist/resources";

import allowVercelAccess from "./resources/builds/allow-vercel-access";
import getPgClient from "./database/get-pg-client";
import fetchBlogPostDataFromGCPBucket from "./resources/blog-posts/fetch-blog-post-data-from-gcp-bucket";
import fetchBlogPostsMetadataFromGCPBucket from "./resources/blog-posts/fetch-blog-posts-metadata-from-gcp-bucket";
import getVercelBuilds from "./resources/builds/get-vercel-builds";
import postVercelBuild from "./resources/builds/post-vercel-builds";
import sendResponse from "./responses/send-response";
import validateSocialHandleType from "./resources/users/validate-social-handle-type";
import sendValidatorErrorRes from "./responses/send-validator-error-res";

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

API.post(
  "/auth-tokens",
  body("email").isEmail(),
  body("password").notEmpty().isString(),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      sendValidatorErrorRes(res, errors);
    } else {
      const inputPassword = req.body.password;
      const pgClient = getPgClient();
      try {
        await pgClient.connect();
        const userSelectQuery = await pgClient.query(
          `SELECT * FROM users WHERE email = $1`,
          [req.body.email]
        );
        const user = userSelectQuery.rows[0] as UserResource;
        await bcrypt.compare(inputPassword, user.password as string);
        sendResponse(res, 200, "user authenticated");
      } catch (error) {
        sendResponse(res, 401, "unauthorized");
      } finally {
        await pgClient.end();
      }
    }
  }
);

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
      sendValidatorErrorRes(res, errors);
    } else {
      const pgClient = getPgClient();
      try {
        await pgClient.connect();
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(req.body.password, salt);
        const insertUserQueryRes = await pgClient.query(
          "INSERT INTO users (email, password, socialhandle, socialhandletype) VALUES ($1, $2, $3, $4) RETURNING *",
          [
            req.body.email,
            hashedPassword,
            req.body.socialHandle,
            req.body.socialHandleType,
          ]
        );
        const user = insertUserQueryRes.rows[0] as UserResource;
        user.password = null;
        sendResponse(res, 201, "user created", user);
      } catch (error) {
        console.error(error);
        sendResponse(res, 500, "user creation failed");
      } finally {
        await pgClient.end();
      }
    }
  }
);

const server = API.listen(8080, () => {
  console.log("API server running on port 8080");
});
