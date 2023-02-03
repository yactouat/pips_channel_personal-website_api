import { Request } from "express";
import { parseUserId } from "pips_resources_definitions/dist/behaviors";

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
  return parseUserId(userId);
};

export default getUserIdFromParams;
