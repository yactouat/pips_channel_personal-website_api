import jwt from "jsonwebtoken";
import { NextFunction, Request, Response } from "express";
import { sendJsonResponse } from "pips_resources_definitions/dist/behaviors";
import getJwtToken from "../services/tokens/get-jwt-token";

const validatesJwtTokenMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  let ok = false;
  let jwtToken = "";
  try {
    jwtToken = getJwtToken(req.headers.authorization);
    ok = true;
  } catch (error) {
    console.error(error);
  }
  if (ok) {
    try {
      const decodedToken = jwt.verify(
        jwtToken,
        process.env.JWT_SECRET as string
      );
      req.params.authedUser = JSON.stringify(decodedToken);
      next();
    } catch (error) {
      console.error(error);
      ok = false;
    }
  }
  if (!ok) {
    sendJsonResponse(res, 401, "Unauthorized");
  }
};

export default validatesJwtTokenMiddleware;
