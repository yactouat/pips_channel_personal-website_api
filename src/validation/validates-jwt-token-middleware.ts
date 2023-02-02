import jwt from "jsonwebtoken";
import { NextFunction, Request, Response } from "express";
import { sendJsonResponse } from "pips_resources_definitions/dist/behaviors";

const validatesAuthTokenMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers.authorization;
  let validated = authHeader && authHeader.startsWith("Bearer");
  if (authHeader && validated) {
    const jwtToken = authHeader.slice(7);
    try {
      const decodedToken = jwt.verify(
        jwtToken,
        process.env.JWT_SECRET as string
      );
      req.params.authedUser = JSON.stringify(decodedToken);
      next();
    } catch (error) {
      console.error(error);
      validated = false;
    }
  }
  if (!validated) {
    sendJsonResponse(res, 401, "Unauthorized");
  }
};

export default validatesAuthTokenMiddleware;
