import { Request } from "express";

const getUserIdFromParams = (
  req: Request<
    Record<string, any> | undefined,
    any,
    any,
    Record<string, any> | undefined,
    Record<string, any>
  >
): number | null => {
  const userId = req.params?.id ?? "";
  if (/^\d+$/.test(userId)) {
    return parseInt(userId);
  }
  return null;
};

export default getUserIdFromParams;
