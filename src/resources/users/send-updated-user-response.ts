import {
  getPgClient,
  getUserFromDbWithEmail,
  sendJsonResponse,
} from "pips_resources_definitions/dist/behaviors";
import { Response } from "express";
import signJwtToken from "../tokens/sign-jwt-token";

const sendUpdatedUserResponse = async (email: string, res: Response) => {
  const updatedUser = await getUserFromDbWithEmail(email, getPgClient());
  if (updatedUser == null) {
    sendJsonResponse(res, 500, "something went wrong");
    return;
  }
  const authToken = await signJwtToken({
    id: updatedUser.id as number,
    email: updatedUser.email,
  });
  sendJsonResponse(res, 201, "user updated", {
    token: authToken,
    user: updatedUser,
  });
};

export default sendUpdatedUserResponse;
