import bcrypt from "bcrypt";
import { body, validationResult } from "express-validator";
import cors from "cors";
import express from "express";
import {
  getPgClient,
  getUserFromDbWithEmail,
  getUserFromDbWithId,
  sendJsonResponse,
} from "pips_resources_definitions/dist/behaviors";
import { UserResource } from "pips_resources_definitions/dist/resources";

import fetchBlogPostDataFromGCPBucket from "./resources/blog-posts/fetch-blog-post-data-from-gcp-bucket";
import fetchBlogPostsMetadataFromGCPBucket from "./resources/blog-posts/fetch-blog-posts-metadata-from-gcp-bucket";
import getPubSubClient from "./get-pubsub-client";
import getUserIdFromParams from "./validation/validate-user-id";
import sendValidationErrorRes from "./validation/send-validator-error-res";
import signJwtToken from "./resources/tokens/sign-jwt-token";
import validatesJwtTokenMiddleware from "./validation/validates-jwt-token-middleware";
import validateSocialHandleType from "./validation/validate-social-handle-type";

// ! you need to have your env correctly set up if you wish to run this API locally (see `.env.example`)
if (process.env.NODE_ENV === "development") {
  require("dotenv").config();
}

const API = express();
API.use(cors());
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
  sendJsonResponse(
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
  sendJsonResponse(
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
    sendJsonResponse(res, 200, `${slug} blog post data fetched`, blogPostdata);
  } catch (error) {
    console.error(error);
    sendJsonResponse(res, 404, `${slug} blog post data not found`);
  }
});

API.post(
  "/tokens",
  body("email").isEmail(),
  body("password").notEmpty().isString(),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      sendValidationErrorRes(res, errors);
      return;
    }
    let token = "";
    let authed = false;
    const inputPassword = req.body.password;
    const user = await getUserFromDbWithEmail(req.body.email, getPgClient());
    if (user == null) {
      sendJsonResponse(res, 404, "user not found");
      return;
    }
    try {
      authed = await bcrypt.compare(inputPassword, user.password as string);
      token = authed
        ? await signJwtToken({
            email: user.email,
            id: user.id as number,
          })
        : "";
    } catch (error) {
      console.error(error);
      sendJsonResponse(res, 500, "internal server error");
      return;
    }
    if (authed == false) {
      sendJsonResponse(res, 401, "invalid credentials");
    } else {
      sendJsonResponse(res, 200, "auth token issued", { token });
    }
  }
);

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
      sendValidationErrorRes(res, errors);
    } else {
      try {
        const pgClient1 = getPgClient();
        await pgClient1.connect();
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(req.body.password, salt);
        const insertUserQueryRes = await pgClient1.query(
          "INSERT INTO users (email, password, socialhandle, socialhandletype) VALUES ($1, $2, $3, $4) RETURNING *",
          [
            req.body.email,
            hashedPassword,
            req.body.socialHandle,
            req.body.socialHandleType,
          ]
        );
        const user = insertUserQueryRes.rows[0] as UserResource;
        await pgClient1.end();
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
        const authToken = await signJwtToken({
          id: user.id as number,
          email: user.email,
        });
        sendJsonResponse(res, 201, "user created", {
          token: authToken,
          user: user,
        });
      } catch (error) {
        console.error(error);
        sendJsonResponse(res, 500, "user creation failed");
      } finally {
      }
    }
  }
);

API.get("/users/:id", validatesJwtTokenMiddleware, async (req, res) => {
  const userId = getUserIdFromParams(req);
  if (userId == null) {
    sendValidationErrorRes(res, undefined, "user id is not valid");
    return;
  }
  const authedUser = JSON.parse(req.params.authedUser);
  if (authedUser.id !== userId) {
    sendJsonResponse(res, 403, "forbidden");
    return;
  }
  const user = await getUserFromDbWithId(userId, getPgClient());
  if (user == null) {
    sendJsonResponse(res, 404, "user not found");
    return;
  }
  if (authedUser.email !== user.email) {
    sendJsonResponse(res, 403, "forbidden");
    return;
  }
  sendJsonResponse(res, 200, "user fetched", user);
});

API.put(
  "/users/:id",
  body("email").isEmail(),
  body("verificationToken").isString(),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      sendValidationErrorRes(res, errors);
      return;
    }
    const userId = getUserIdFromParams(req);
    if (userId == null) {
      sendValidationErrorRes(res, undefined, "user id not valid");
      return;
    }
    let userHasBeenVerified = false;
    try {
      const pgClient1 = getPgClient();
      await pgClient1.connect();
      // verify user
      const selectVerifTokenQueryRes = await pgClient1.query(
        `UPDATE users uu
            SET verified = TRUE 
            WHERE uu.id = (
              SELECT u.id 
              FROM users u 
              INNER JOIN tokens_users tu ON u.id = tu.user_id
              INNER JOIN tokens t ON tu.token_id = t.id
              WHERE u.email = $1
              AND u.id = $2
              AND t.token = $3
              AND t.expired = 0
            ) 
            RETURNING *`,
        [req.body.email, userId, req.body.verificationToken]
      );
      userHasBeenVerified = selectVerifTokenQueryRes.rows.length > 0;
      await pgClient1.end();
      // expire token
      if (userHasBeenVerified) {
        const pgClient2 = getPgClient();
        await pgClient2.connect();
        const expireTokenQueryRes = await pgClient2.query(
          `UPDATE tokens tu 
            SET expired = 1 
            WHERE tu.id = (
              SELECT t.id
              FROM tokens t
              WHERE t.token = $1
            ) RETURNING *
          `,
          [req.body.verificationToken]
        );
        userHasBeenVerified = expireTokenQueryRes.rows.length > 0;
        await pgClient2.end();
      }
    } catch (error) {
      console.error(error);
    }
    if (!userHasBeenVerified) {
      // meaning something went wrong with user verification
      sendJsonResponse(res, 401, "unauthorized");
      return;
    }
    const user = await getUserFromDbWithEmail(req.body.email, getPgClient());
    if (user == null) {
      sendJsonResponse(res, 422, "something went wrong");
      return;
    }
    const authToken = await signJwtToken({
      id: user.id as number,
      email: user.email,
    });
    sendJsonResponse(res, 201, "user updated", {
      token: authToken,
      user: user,
    });
  }
);

const server = API.listen(8080, () => {
  console.log("API server running on port 8080");
});
