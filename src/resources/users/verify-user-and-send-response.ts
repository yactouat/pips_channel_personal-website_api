import {
  getPgClient,
  sendJsonResponse,
} from "pips_resources_definitions/dist/behaviors";
import { Response } from "express";
import sendUpdatedUserResponse from "./send-updated-user-response";

const verifyUserAndSendResponse = async (
  userId: number,
  res: Response,
  email: string,
  veriftoken: string
) => {
  let userHasBeenVerified = false;
  try {
    const verifTokenQueryClient = getPgClient();
    await verifTokenQueryClient.connect();
    // verify user
    const selectVerifTokenQueryRes = await verifTokenQueryClient.query(
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
      [email ?? "", userId, veriftoken]
    );
    userHasBeenVerified = selectVerifTokenQueryRes.rows.length > 0;
    await verifTokenQueryClient.end();
    // expire token
    if (userHasBeenVerified) {
      const expireTokenQueryClient = getPgClient();
      await expireTokenQueryClient.connect();
      const expireTokenQueryRes = await expireTokenQueryClient.query(
        `UPDATE tokens tu 
            SET expired = 1 
            WHERE tu.id = (
              SELECT t.id
              FROM tokens t
              WHERE t.token = $1
            ) RETURNING *
          `,
        [veriftoken]
      );
      userHasBeenVerified = expireTokenQueryRes.rows.length > 0;
      await expireTokenQueryClient.end();
    }
  } catch (error) {
    console.error(error);
  }
  if (!userHasBeenVerified) {
    // meaning something went wrong with user verification
    sendJsonResponse(res, 401, "unauthorized");
  } else {
    await sendUpdatedUserResponse(email, res);
  }
};

export default verifyUserAndSendResponse;
