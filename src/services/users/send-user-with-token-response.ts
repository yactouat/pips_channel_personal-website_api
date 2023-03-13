import {
  getUserFromDbWithEmail,
  sendJsonResponse,
} from "pips_resources_definitions/dist/behaviors";
import { Response } from "express";
import signJwtToken from "../../jwt/sign-jwt-token";
import setUserHasPendingMods from "./set-user-has-pending-mods";

const sendUserWithTokenResponse = async (
  email: string,
  res: Response,
  updateRequiredTokenConfirmation: boolean = false
) => {
  let resMsg =
    updateRequiredTokenConfirmation == false
      ? "user updated, some profile data modifications may require an additional confirmation"
      : "user fetched";
  let user = await getUserFromDbWithEmail(email);
  if (user == null) {
    sendJsonResponse(res, 500, "something went wrong");
    return;
  } else {
    user = await setUserHasPendingMods(user, user.id!);
    const authToken = await signJwtToken({
      id: user.id as number,
      email: user.email,
    });
    sendJsonResponse(res, 200, resMsg, {
      token: authToken,
      user: user,
    });
  }
};

export default sendUserWithTokenResponse;
