import { NextFunction, Request, Response } from "express";
import { validationResult } from "express-validator";

import sendValidationErrorRes from "../send-validator-error-res";

const checksValidationResultMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    sendValidationErrorRes(res, errors);
    return;
  }
  next();
};

export default checksValidationResultMiddleware;
