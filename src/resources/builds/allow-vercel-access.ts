import { NextFunction, Request, Response } from "express";
import sendResponse from "../../send-response";

const allowVercelAccess = async (
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

export default allowVercelAccess;
