import { NextFunction, Request, Response } from "express";
import sendResponse from "../helpers/send-response";

export const allowVercelAccess = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const token = req.body.vercelToken ?? "";
  if (token !== process.env.VERCEL_TOKEN) {
    sendResponse(res, 401, "action not authorized");
  } else {
    next();
  }
};
