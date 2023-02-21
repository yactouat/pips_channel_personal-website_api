import { body } from "express-validator";
import express from "express";

import * as usersController from "../controllers/users-controller";
import validatesJwtTokenMiddleware from "../middlewares/validates-jwt-token-middleware";
import validateSocialHandleType from "../resources/users/validate-social-handle-type";
import validatesUserIdParamMiddleware from "../middlewares/validates-user-id-param-middleware";
import checksValidationResultMiddleware from "../middlewares/checks-validation-result-middleware";

const usersRouter = express.Router();

usersRouter.get(
  "/:id",
  validatesUserIdParamMiddleware,
  checksValidationResultMiddleware,
  validatesJwtTokenMiddleware,
  usersController.getUser
);

usersRouter.post(
  "/",
  body("email").isEmail(),
  body("password").isStrongPassword(),
  body("socialhandle").notEmpty().isString(),
  body("socialhandletype").custom((value) => {
    return validateSocialHandleType(value);
  }),
  checksValidationResultMiddleware,
  usersController.createUser
);

usersRouter.put(
  "/:id",
  validatesUserIdParamMiddleware,
  body("email").isEmail(),
  body("socialhandle").isString(),
  body("socialhandletype").custom((value) => {
    return validateSocialHandleType(value);
  }),
  checksValidationResultMiddleware,
  validatesJwtTokenMiddleware,
  usersController.updateUser
);

usersRouter.put(
  "/:id/verify",
  validatesUserIdParamMiddleware,
  body("email").isEmail(),
  body("veriftoken").isString(),
  checksValidationResultMiddleware,
  usersController.verifyUser
);

export default usersRouter;
