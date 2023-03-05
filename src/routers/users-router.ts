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

  /**
   * strong password defaults to
   * {
   *    minLength: 8,
   *    minLowercase: 1,
   *    minUppercase: 1,
   *    minNumbers: 1,
   *    minSymbols: 1,
   *    returnScore: false,
   *    pointsPerUnique: 1,
   *    pointsPerRepeat: 0.5,
   *    pointsForContainingLower: 10,
   *    pointsForContainingUpper: 10,
   *    pointsForContainingNumber: 10,
   *    pointsForContainingSymbol: 10
   * }
   * */
  body("password").isStrongPassword().optional(),

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
  body("modifytoken").isString().optional(),
  body("veriftoken").isString().optional(),
  checksValidationResultMiddleware,
  usersController.processUserToken
);

export default usersRouter;
