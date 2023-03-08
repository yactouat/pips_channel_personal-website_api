import {
  getUserFromDbWithEmail,
  sendJsonResponse,
} from "pips_resources_definitions/dist/behaviors";
import { Response } from "express";
import signJwtToken from "../tokens/sign-jwt-token";

const sendUserWithTokenResponse = async (email: string, res: Response) => {
  const updatedUser = await getUserFromDbWithEmail(email);
  if (updatedUser == null) {
    sendJsonResponse(res, 500, "something went wrong");
    return;
  }
  const authToken = await signJwtToken({
    id: updatedUser.id as number,
    email: updatedUser.email,
  });
  sendJsonResponse(
    res,
    200,
    "user updated, some profile data modifications may require an additional confirmation",
    {
      token: authToken,
      user: updatedUser,
    }
  );
};

export default sendUserWithTokenResponse;
