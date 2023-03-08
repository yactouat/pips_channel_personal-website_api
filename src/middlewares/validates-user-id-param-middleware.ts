import { NextFunction, Request, Response } from "express";
import getUserIdFromParams from "../services/users/get-user-id-from-params";
import sendValidationErrorRes from "../send-validator-error-res";

const validatesUserIdParamMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const userId = getUserIdFromParams(req);
  if (userId == null) {
    sendValidationErrorRes(res, undefined, "user id is not valid");
    return;
  }
  next();
};

export default validatesUserIdParamMiddleware;
