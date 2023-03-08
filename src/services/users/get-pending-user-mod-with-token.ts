import { runPgQuery } from "pips_resources_definitions/dist/behaviors";
import { PendingUserModificationResource } from "pips_resources_definitions/dist/resources";

const getPendingUserModWithToken = async (
  token: string
): Promise<PendingUserModificationResource> => {
  const getUserModIdQueryRes = await runPgQuery(
    `SELECT * 
         FROM pending_user_modifications 
         WHERE token_id = (SELECT id FROM tokens WHERE token = $1) 
         AND committed_at IS NOT NULL
         ORDER BY created_at DESC`,
    [token]
  );
  const userMod = getUserModIdQueryRes
    .rows[0] as PendingUserModificationResource;
  return userMod;
};

export default getPendingUserModWithToken;
