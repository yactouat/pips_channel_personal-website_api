import { getPgClient } from "pips_resources_definitions/dist/behaviors";
import { PendingUserModificationResource } from "pips_resources_definitions/dist/resources";
import { PendingUserModificationType } from "pips_resources_definitions/dist/types";

const insertPendingUserMod = async (
  field: PendingUserModificationType,
  value: string
): Promise<PendingUserModificationResource> => {
  const insertUserModQueryClient = getPgClient();
  await insertUserModQueryClient.connect();
  const insertUserModQueryRes = await insertUserModQueryClient.query(
    "INSERT INTO pending_user_modifications (field, value) VALUES ($1, $2) RETURNING *",
    [field, value]
  );
  const mod = insertUserModQueryRes.rows[0] as PendingUserModificationResource;
  await insertUserModQueryClient.end();
  return mod;
};

export default insertPendingUserMod;
