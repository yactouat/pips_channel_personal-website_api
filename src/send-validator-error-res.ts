import { Response } from "express";
import { Result, ValidationError } from "express-validator";
import { sendJsonResponse } from "pips_resources_definitions/dist/behaviors";

const sendValidatorErrorRes = (
  res: Response,
  errors: Result<ValidationError>
) => {
  sendJsonResponse(res, 400, `invalid request`, errors.array());
};

export default sendValidatorErrorRes;
