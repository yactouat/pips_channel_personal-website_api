import bcrypt from "bcrypt";
import { Request, Response } from "express";
import { validationResult } from "express-validator";
import {
  getUserFromDbWithEmail,
  sendJsonResponse,
} from "pips_resources_definitions/dist/behaviors";

import signJwtToken from "../jwt/sign-jwt-token";
import sendValidationErrorRes from "../send-validator-error-res";

export const getJWTAuthToken = async (req: Request, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    sendValidationErrorRes(res, errors);
    return;
  }
  let token = "";
  let authed = false;
  const inputPassword = req.body.password;
  const user = await getUserFromDbWithEmail(req.body.email, false);
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
};
