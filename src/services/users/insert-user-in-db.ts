import { runPgQuery } from "pips_resources_definitions/dist/behaviors";
import { UserResource } from "pips_resources_definitions/dist/resources";

import hashUserPassword from "./hash-user-password";

const insertUserInDb = async (
  email: string,
  plainPassword: string,
  socialHandle: string,
  socialHandleType: string
): Promise<UserResource> => {
  const hashedPassword = await hashUserPassword(plainPassword);
  const insertUserQueryRes = await runPgQuery(
    "INSERT INTO users (email, password, socialhandle, socialhandletype) VALUES ($1, $2, $3, $4) RETURNING *",
    [email, hashedPassword, socialHandle, socialHandleType]
  );
  const user = insertUserQueryRes.rows[0] as UserResource;
  // nullify password before sending it back to the client
  user.password = null;
  return user;
};

export default insertUserInDb;
