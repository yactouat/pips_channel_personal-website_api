import { Response } from "express";

const sendResponse = (
  res: Response,
  status: number,
  msg: string,
  data: {}[] | {} | null = null
) => {
  res.status(status).json({
    msg,
    data,
  });
};

export default sendResponse;
