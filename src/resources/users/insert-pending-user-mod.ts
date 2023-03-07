import { PendingUserModificationResource } from "pips_resources_definitions/dist/resources";
import { PendingUserModificationType } from "pips_resources_definitions/dist/types";
import { runPgQuery } from "pips_resources_definitions/dist/behaviors";

const insertPendingUserMod = async (
  field: PendingUserModificationType,
  value: string
): Promise<PendingUserModificationResource> => {
  const insertUserModQueryRes = await runPgQuery(
    "INSERT INTO pending_user_modifications (field, value) VALUES ($1, $2) RETURNING *",
    [field, value]
  );
  const mod = insertUserModQueryRes.rows[0] as PendingUserModificationResource;
  return mod;
};

export default insertPendingUserMod;
