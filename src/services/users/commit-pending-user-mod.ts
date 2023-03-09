import { Response } from "express";
import {
  runPgQuery,
  sendJsonResponse,
} from "pips_resources_definitions/dist/behaviors";

import sendUpdatedUserWithTokenResponse from "./send-user-with-token-response";
import { PendingUserModificationResource } from "pips_resources_definitions/dist/resources";
import hashUserPassword from "./hash-user-password";
import getPendingUserModWithToken from "./get-pending-user-mod-with-token";

const commitPendingUserMod = async (
  token: string,
  email: string,
  res: Response
) => {
  let userModWentThrough = false;
  try {
    // expire token
    const commitUserModQueryRes = await runPgQuery(
      `UPDATE pending_user_modifications
        SET committed_at = $1 
        WHERE token_id = (
          SELECT t.id
          FROM tokens t
          WHERE t.token = $2
        ) AND committed_at IS NULL
        RETURNING *
      `,
      // as `Date.now()` returns milliseconds, we need to divide it by 1000 to get the number of seconds since the epoch
      [new Date().toISOString(), token]
    );
    console.log("commitUserModQueryRes: ", commitUserModQueryRes.rows);
    userModWentThrough = commitUserModQueryRes.rows.length > 0;
    const expireTokenQueryRes = await runPgQuery(
      `UPDATE tokens SET expired = 1 WHERE token = $1 RETURNING *`,
      [token]
    );
    console.log("expireTokenQueryRes: ", expireTokenQueryRes.rows);
    userModWentThrough = userModWentThrough && expireTokenQueryRes.rowCount > 0;
  } catch (error) {
    console.error(error);
  }
  try {
    const userMod = await getPendingUserModWithToken(token);
    if (userMod.field === "email") {
      await runPgQuery(
        `UPDATE users 
         SET email = $1
         WHERE id = (
          SELECT tu.user_id 
          FROM pending_user_modifications pum
          INNER JOIN tokens t ON t.id = pum.token_id
          INNER JOIN tokens_users tu ON tu.token_id = t.id
          WHERE pum.id = $2
        )
        RETURNING *`,
        [userMod.value, userMod.id.toString()]
      );
      email = userMod.value;
    }
    if (userMod.field === "password") {
      const hashedPassword = await hashUserPassword(userMod.value);
      await runPgQuery(
        `UPDATE users 
         SET password = $1
         WHERE id = (
          SELECT tu.user_id 
          FROM pending_user_modifications pum
          INNER JOIN tokens t ON t.id = pum.token_id
          INNER JOIN tokens_users tu ON tu.token_id = t.id
          WHERE pum.id = $2
        )
        RETURNING *`,
        [hashedPassword, userMod.id.toString()]
      );
    }
  } catch (error) {
    console.error(error);
    userModWentThrough = false;
  }
  if (!userModWentThrough) {
    // meaning something went wrong with user verification
    sendJsonResponse(res, 401, "unauthorized");
  } else {
    await sendUpdatedUserWithTokenResponse(email, res, true);
  }
};

export default commitPendingUserMod;
