import {
  getUserFromDbWithEmail,
  getUserFromDbWithId,
  linkTokenToUserMod,
  runPgQuery,
  saveUserToken,
  sendJsonResponse,
} from "pips_resources_definitions/dist/behaviors";
import { Request, Response } from "express";

import compareIdWithToken from "../services/tokens/compare-id-with-token";
import {
  ForbiddenResText,
  UserNotFoundText,
  UserUpdateFailedText,
} from "../constants";
import getPubSubClient from "../get-pubsub-client";
import getUserIdFromParams from "../services/users/get-user-id-from-params";
import insertUserInDb from "../services/users/insert-user-in-db";
import sendUpdatedUserWithTokenResponse from "../services/users/send-user-with-token-response";
import signJwtToken from "../services/tokens/sign-jwt-token";
import verifyUserTokenAndSendResponse from "../services/users/verify-user-token-and-send-response";
import insertPendingUserMod from "../services/users/insert-pending-user-mod";
import commitPendingUserMod from "../services/users/commit-pending-user-mod";

export const createUser = async (req: Request, res: Response) => {
  const userAlreadyExists = await getUserFromDbWithEmail(req.body.email);
  if (userAlreadyExists != null) {
    sendJsonResponse(res, 409, "user already exists");
    return;
  }

  try {
    const { email, password, socialhandle, socialhandletype } = req.body;
    const user = await insertUserInDb(
      email,
      password,
      socialhandle,
      socialhandletype
    );
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
            userTokenType: "User_Verification",
          },
        });
    } else {
      // in development, we don't use PubSub, we just call the function to persist a verification token in the db directly
      await saveUserToken(user.email, "User_Verification"); // /profile?veriftoken=TOKEN&email=EMAIL&userid=ID to validate on client side
    }

    // creating the auth token
    const authToken = await signJwtToken({
      id: user.id as number,
      email: user.email,
    });

    // sending the response
    sendJsonResponse(res, 201, "user created", {
      token: authToken,
      user: user,
    });
  } catch (error) {
    console.error(error);
    sendJsonResponse(res, 500, "user creation failed");
  } finally {
  }
};

export const getUser = async (req: Request, res: Response) => {
  const userId = getUserIdFromParams(req) as number;
  // validating id from JWT
  if (!compareIdWithToken(req, userId)) {
    sendJsonResponse(res, 403, ForbiddenResText);
    return;
  }
  const user = await getUserFromDbWithId(userId);
  if (user == null) {
    sendJsonResponse(res, 404, UserNotFoundText);
    return;
  }
  sendJsonResponse(res, 200, "user fetched", user);
};

export const processUserToken = async (req: Request, res: Response) => {
  // checking that at least one supported token type is present in the request
  if (!req.body.veriftoken && !req.body.modifytoken) {
    sendJsonResponse(res, 400, "no supported user token provided");
    return;
  }

  // validating the user id present in the URL
  const userId = getUserIdFromParams(req);

  // validating the user exists in the db
  const userFromDb = await getUserFromDbWithEmail(req.body.email);
  if (userFromDb == null) {
    sendJsonResponse(res, 404, UserNotFoundText);
    return;
  }

  // validating that this user corresponds to the user id in the URL
  if (userFromDb.id !== userId) {
    sendJsonResponse(res, 403, ForbiddenResText);
    return;
  }

  if (req.body.veriftoken) {
    await verifyUserTokenAndSendResponse(
      userId,
      res,
      req.body.email,
      req.body.veriftoken
    );
  } else if (req.body.modifytoken) {
    await commitPendingUserMod(req.body.modifytoken, req.body.email, res);
  }
};

export const updateUser = async (req: Request, res: Response) => {
  // validating the user id present in the URL
  const userId = getUserIdFromParams(req) as number;

  // validating id from JWT
  if (!compareIdWithToken(req, userId)) {
    sendJsonResponse(res, 403, ForbiddenResText);
    return;
  }

  // validating the user exists in the db
  const existingUser = await getUserFromDbWithId(userId);
  if (existingUser == null) {
    sendJsonResponse(res, 404, UserNotFoundText);
    return;
  }

  // user needs to be verified before proceeding
  if (!existingUser.verified) {
    sendJsonResponse(res, 403, "user not verified");
    return;
  }

  // update the user only when needed
  if (
    existingUser.email === req.body.email &&
    existingUser.socialHandle === req.body.socialhandle &&
    existingUser.socialHandleType === req.body.socialhandletype
  ) {
    sendJsonResponse(res, 422, "no profile data to update");
    return;
  }

  let userHasBeenProperlyUpdated = false;
  try {
    const userUpdateQueryRes = await runPgQuery(
      `UPDATE users SET socialhandle = $1, socialhandletype = $2, email = $4 WHERE id = $3 RETURNING *`,
      [
        req.body.socialhandle,
        req.body.socialhandletype,
        userId,
        existingUser.email, // we use the existing user email here to prevent fraudulent profile updates
      ]
    );
    userHasBeenProperlyUpdated = userUpdateQueryRes.rowCount > 0;
  } catch (error) {
    console.error(error);
    sendJsonResponse(res, 500, UserUpdateFailedText);
    return;
  }

  /**
   *
   * this for loop below concerns profile modifications that require additional user confirmation before being committed to the system;
   *
   * to validate a pending user modification regarding critical profile data, such as email and password,
   * the process is in 2 steps; from the user perspective:
   * 1. user modifies his profile
   * 2. user receives an email with a token to validate the modification
   *
   * this happens by:
   * 1. saving a pending user modification payload in the db
   * 2. sending a pubsub message with the user token and the pending user modification id
   * 3. linking the user token to the pending user modification in the db with a consuming service that listens to the pubsub message (or directly in this API in dev mode, withtout the PubSub part)
   * 4. this consuming service sends an email to the user with the token
   */
  const fieldsThatRequireUserConfirmation = ["email", "password"];
  let updateRequiresUserConfirmation = false;
  for (let i = 0; i < fieldsThatRequireUserConfirmation.length; i++) {
    const field = fieldsThatRequireUserConfirmation[i];
    if (
      (field == "email" &&
        req.body[field] &&
        req.body[field] != existingUser.email) ||
      (field == "password" &&
        req.body[field] &&
        req.body[field] != existingUser.password)
    ) {
      updateRequiresUserConfirmation = true;
      try {
        const mod = await insertPendingUserMod(field, req.body[field]);
        console.log("PENDING USER MODIFICATION INSERTED", mod);
        if (process.env.NODE_ENV != "development") {
          // Publishes the message as a string, e.g. "Hello, world!" or JSON.stringify(someObject)
          const dataBuffer = Buffer.from(existingUser.email);
          // this below returns a message id (case I need it one day)
          await getPubSubClient()
            .topic(process.env.PUBSUB_USERS_TOPIC as string)
            .publishMessage({
              data: dataBuffer,
              attributes: {
                env: process.env.NODE_ENV as string,
                userModId: mod.id.toString(),
                userTokenType: "User_Modification",
              },
            });
        } else {
          // dev mode
          const userToken = await saveUserToken(
            existingUser.email,
            "User_Modification"
          );
          // link the user token to the pending user modification directly in db in dev mode
          userHasBeenProperlyUpdated = await linkTokenToUserMod(
            userToken,
            mod.id
          );
          userHasBeenProperlyUpdated =
            userHasBeenProperlyUpdated && userToken != "";
        }
      } catch (error) {
        console.error(error);
        sendJsonResponse(res, 500, UserUpdateFailedText);
        return;
      }
    }
  }

  if (!userHasBeenProperlyUpdated) {
    sendJsonResponse(
      res,
      500,
      "something went wrong, not all profile data has been updated"
    );
    return;
  }

  await sendUpdatedUserWithTokenResponse(
    existingUser.email,
    res,
    updateRequiresUserConfirmation
  );
};
