import {
  getPgClient,
  sendJsonResponse,
} from "pips_resources_definitions/dist/behaviors";
import { Response } from "express";

import sendUpdatedUserResponse from "./send-updated-user-response";

const commitPendingUserMod = async (
  token: string,
  email: string,
  res: Response
) => {
  let userModHasBeenCommitted = false;
  try {
    // expire token
    const commitUserModQueryClient = getPgClient();
    await commitUserModQueryClient.connect();
    const expireTokenQueryRes = await commitUserModQueryClient.query(
      `UPDATE pending_user_modifications
        SET committed_at = $1 
        WHERE token_id = (
          SELECT t.id
          FROM tokens t
          WHERE t.token = $2
        ) RETURNING *
      `,
      // as `Date.now()` returns milliseconds, we need to divide it by 1000 to get the number of seconds since the epoch
      [new Date().toISOString(), token]
    );
    userModHasBeenCommitted = expireTokenQueryRes.rows.length > 0;
    await commitUserModQueryClient.end();
  } catch (error) {
    console.error(error);
  }
  // TODO modify the actual user table
  if (!userModHasBeenCommitted) {
    // meaning something went wrong with user verification
    sendJsonResponse(res, 401, "unauthorized");
  } else {
    await sendUpdatedUserResponse(email, res);
  }
};

export default commitPendingUserMod;
