import bcrypt from "bcrypt";
import { body, validationResult } from "express-validator";
import express from "express";
import {
  getPgClient,
  getUserFromDb,
} from "pips_resources_definitions/dist/behaviors";
import jwt from "jsonwebtoken";
import { UserResource } from "pips_resources_definitions/dist/resources";

import fetchBlogPostDataFromGCPBucket from "./resources/blog-posts/fetch-blog-post-data-from-gcp-bucket";
import fetchBlogPostsMetadataFromGCPBucket from "./resources/blog-posts/fetch-blog-posts-metadata-from-gcp-bucket";
import sendResponse from "./responses/send-response";
import validateSocialHandleType from "./resources/users/validate-social-handle-type";
import sendValidatorErrorRes from "./responses/send-validator-error-res";
import getPubSubClient from "./get-pubsub-client";

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
      let token = "";
      let authed = false;
      const inputPassword = req.body.password;
      const pgClient = getPgClient();
      try {
        await pgClient.connect();
      } catch (error) {
        sendResponse(res, 500, "server error");
        return;
      }
      const user = await getUserFromDb(req.body.email, pgClient);
      try {
        authed = await bcrypt.compare(inputPassword, user.password as string);
        token = authed
          ? await jwt.sign(
              { email: user.email },
              process.env.JWT_SECRET as string
            )
          : "";
        user.password = null;
      } catch (error) {
        console.error(error);
      }
      if (authed == false) {
        sendResponse(res, 401, "invalid credentials");
      } else {
        sendResponse(res, 200, "auth token issued", { token });
      }
      await pgClient.end();
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
        // send PubSub message for user created event containing user email
        // Publishes the message as a string, e.g. "Hello, world!" or JSON.stringify(someObject)
        const dataBuffer = Buffer.from(user.email);
        // this below returns a message id (case I need it one day)
        await getPubSubClient()
          .topic(process.env.PUBSUB_USERS_TOPIC as string)
          .publishMessage({
            data: dataBuffer,
            attributes: {
              env: process.env.NODE_ENV as string,
            },
          });
        sendResponse(res, 201, "user created", user);
      } catch (error) {
        // TODO better observability here
        console.error(error);
        sendResponse(res, 500, "user creation failed");
      } finally {
        await pgClient.end();
      }
    }
  }
);

API.put(
  "/users/:email",
  body("email").isEmail(),
  body("verificationToken").isString(),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      sendValidatorErrorRes(res, errors);
    } else {
      const pgClient = getPgClient();
      try {
        await pgClient.connect();
        // verify user
        const selectVerifTokenQueryRes = await pgClient.query(
          `UPDATE users 
            SET verified = TRUE 
            WHERE id = (
              SELECT id 
              FROM users u 
              INNER JOIN tokens_user tu ON u.id = tu.user_id
              INNER JOIN tokens t ON tu.token_id = t.id
              WHERE u.email = $1
              AND t.token = $2
              AND t.expired = 0
            ) 
            RETURNING *`,
          [req.body.email, req.body.verificationToken]
        );
        console.log(
          "VERIFYING USER QUERY RESULT",
          selectVerifTokenQueryRes.rows
        );
        // TODO verify if can expire token
        const expireTokenQueryRes = await pgClient.query(
          `
          UPDATE tokens
          SET expired = 1
          WHERE id = (
            SELECT id
            FROM tokens t
            WHERE t.token = $1
          ) RETURNING *
        `,
          [req.body.verificationToken]
        );
        console.log("EXPIRING TOKEN QUERY RESULT", expireTokenQueryRes.rows);
        const user = await getUserFromDb(req.body.email, pgClient);
        sendResponse(res, 201, "user updated", user);
      } catch (error) {
        console.error(error);
      } finally {
        await pgClient.end();
      }
    }
  }
);

const server = API.listen(8080, () => {
  console.log("API server running on port 8080");
});
