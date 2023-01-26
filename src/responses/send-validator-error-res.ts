import { Response } from "express";
import { Result, ValidationError } from "express-validator";

import sendResponse from "./send-response";

const sendValidatorErrorRes = (
  res: Response,
  errors: Result<ValidationError>
) => {
  sendResponse(res, 400, `invalid request`, errors.array());
};

export default sendValidatorErrorRes;
