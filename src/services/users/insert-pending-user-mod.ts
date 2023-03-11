import { PendingUserModificationResource } from "pips_resources_definitions/dist/resources";
import { PendingUserModificationType } from "pips_resources_definitions/dist/types";
import { runPgQuery } from "pips_resources_definitions/dist/behaviors";
import hashUserPassword from "./hash-user-password";

/**
 *
 * this function is responsible for inserting a pending user modification in the database
 *
 * @param {string} field the user modification to insert (email, password, etc.)
 * @param {string} value the value of the user modification to insert
 * @returns {Promise<PendingUserModificationResource>} the inserted user modification
 */
const insertPendingUserMod = async (
  field: PendingUserModificationType,
  value: string
): Promise<PendingUserModificationResource> => {
  if (field == "password") {
    value = await hashUserPassword(value);
  }
  const insertUserModQueryRes = await runPgQuery(
    "INSERT INTO pending_user_modifications (field, value) VALUES ($1, $2) RETURNING id, field, value, created_at, committed_at",
    [field, value]
  );
  const mod = insertUserModQueryRes.rows[0] as PendingUserModificationResource;
  return mod;
};

export default insertPendingUserMod;
