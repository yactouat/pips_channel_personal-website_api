import bcrypt from "bcrypt";
import { body, validationResult } from "express-validator";
import cors from "cors";
import express from "express";
import {
  getPgClient,
  getUserFromDbWithEmail,
  getUserFromDbWithId,
  saveUserVerifToken,
  sendJsonResponse,
} from "pips_resources_definitions/dist/behaviors";
import jwt from "jsonwebtoken";
import { UserResource } from "pips_resources_definitions/dist/resources";

import fetchBlogPostDataFromGCPBucket from "./resources/blog-posts/fetch-blog-post-data-from-gcp-bucket";
import fetchBlogPostsMetadataFromGCPBucket from "./resources/blog-posts/fetch-blog-posts-metadata-from-gcp-bucket";
import getJwtToken from "./get-jwt-token";
import getPubSubClient from "./get-pubsub-client";
import getUserIdFromParams from "./validation/validate-user-id";
import sendUpdatedUserResponse from "./resources/users/send-updated-user-response";
import sendValidationErrorRes from "./validation/send-validator-error-res";
import signJwtToken from "./resources/tokens/sign-jwt-token";
import validatesJwtTokenMiddleware from "./validation/validates-jwt-token-middleware";
import validateSocialHandleType from "./validation/validate-social-handle-type";
import verifyUserAndSendResponse from "./resources/users/verify-user-and-send-response";

const forbiddenResText = "forbidden";

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
    const user = await getUserFromDbWithEmail(
      req.body.email,
      getPgClient(),
      false
    );
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
  body("socialhandle").notEmpty().isString(),
  body("socialhandletype").custom((value) => {
    return validateSocialHandleType(value);
  }),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      sendValidationErrorRes(res, errors);
      return;
    }

    const userAlreadyExists = await getUserFromDbWithEmail(
      req.body.email,
      getPgClient()
    );
    if (userAlreadyExists != null) {
      sendJsonResponse(res, 409, "user already exists");
      return;
    }

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
          req.body.socialhandle,
          req.body.socialhandletype,
        ]
      );
      const user = insertUserQueryRes.rows[0] as UserResource;
      await pgClient1.end();
      user.password = null;
      /**
       * send PubSub message for user created event containing user email,
       * this message is then consumed by decoupled services, such as the mailer,
       * which sends a verification email to the user containing a verification token
       */
      if (process.env.NODE_ENV != "development") {
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
      } else {
        // in development, we don't use PubSub, we just call the function to persist a verification token in the db directly
        await saveUserVerifToken(user.email); // /profile?veriftoken=TOKEN&email=EMAIL&userid=ID to validate on client side
      }
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
);

API.get("/users/:id", validatesJwtTokenMiddleware, async (req, res) => {
  const userId = getUserIdFromParams(req);
  if (userId == null) {
    sendValidationErrorRes(res, undefined, "user id is not valid");
    return;
  }
  const authedUser = JSON.parse(req.params.authedUser);
  if (authedUser.id !== userId) {
    sendJsonResponse(res, 403, forbiddenResText);
    return;
  }
  const user = await getUserFromDbWithId(userId, getPgClient());
  if (user == null) {
    sendJsonResponse(res, 404, "user not found");
    return;
  }
  if (authedUser.email !== user.email) {
    sendJsonResponse(res, 403, forbiddenResText);
    return;
  }
  sendJsonResponse(res, 200, "user fetched", user);
});

API.put(
  "/users/:id",
  validatesJwtTokenMiddleware,
  body("email").isEmail(),
  body("socialhandle").isString(),
  body("socialhandletype").custom((value) => {
    return validateSocialHandleType(value);
  }),
  async (req, res) => {
    // validating the user id present in the URL
    const userId = getUserIdFromParams(req);
    if (userId == null) {
      sendValidationErrorRes(res, undefined, "user id not valid");
      return;
    }

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      sendValidationErrorRes(res, errors);
      return;
    }

    // validating id from JWT
    const authedUser = JSON.parse(req.params.authedUser);
    if (authedUser.id !== userId) {
      sendJsonResponse(res, 403, forbiddenResText);
      return;
    }

    // validating the user exists in the db
    const existingUser = await getUserFromDbWithId(userId, getPgClient());
    if (existingUser == null) {
      sendJsonResponse(res, 404, "user not found");
      return;
    }

    // user needs to be verified before proceeding
    if (!existingUser.verified) {
      sendJsonResponse(res, 403, "user not verified");
      return;
    }

    let userHasBeenUpdated = false;
    try {
      const userUpdateQueryClient = getPgClient();
      await userUpdateQueryClient.connect();
      const userUpdateQueryRes = await userUpdateQueryClient.query(
        `UPDATE users SET socialhandle = $1, socialhandletype = $2 WHERE id = $3 RETURNING *`,
        [req.body.socialhandle, req.body.socialhandletype, userId]
      );
      userHasBeenUpdated = userUpdateQueryRes.rowCount > 0;
      await userUpdateQueryClient.end();
    } catch (error) {
      console.error(error);
    }
    if (!userHasBeenUpdated) {
      // meaning something went wrong with user update
      sendJsonResponse(res, 500, "something went wrong");
      return;
    }

    await sendUpdatedUserResponse(req.body.email, res);
  }
);

API.put(
  "/users/:id/verify",
  body("email").isEmail(),
  body("veriftoken").isString(),
  async (req, res) => {
    // validating the user id present in the URL
    const userId = getUserIdFromParams(req);
    if (userId == null) {
      sendValidationErrorRes(res, undefined, "user id not valid");
      return;
    }

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      sendValidationErrorRes(res, errors);
      return;
    }

    // validating the user exists in the db
    const userFromDb = await getUserFromDbWithEmail(
      req.body.email,
      getPgClient()
    );
    if (userFromDb == null) {
      sendJsonResponse(res, 404, "user not found");
      return;
    }

    // validating that this user corresponds to the user id in the URL
    if (userFromDb.id !== userId) {
      sendJsonResponse(res, 403, forbiddenResText);
      return;
    }

    await verifyUserAndSendResponse(
      userId,
      res,
      req.body.email,
      req.body.veriftoken
    );
  }
);

const server = API.listen(8080, () => {
  console.log("API server running on port 8080");
});
