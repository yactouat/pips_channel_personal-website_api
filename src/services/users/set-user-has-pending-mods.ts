import { runPgQuery } from "pips_resources_definitions/dist/behaviors";
import { UserResource } from "pips_resources_definitions/dist/resources";

const setUserHasPendingMods = async (
  user: UserResource,
  userId: number
): Promise<UserResource> => {
  const hasPendingModifications = await runPgQuery(
    `
    SELECT COUNT(*) as haspendingmodifications 
    FROM tokens_users tu
    LEFT JOIN pending_user_modifications pum ON tu.token_id = pum.token_id
    WHERE tu.user_id = $1
    AND (
      pum.committed_at IS NULL
      OR tu.type = 'user_deletion'
    )
    AND tu.type != 'user_verification'
  `,
    [userId.toString()]
  );
  if (parseInt(hasPendingModifications.rows[0].haspendingmodifications) > 0) {
    user.hasPendingModifications = true;
  }
  return user;
};

export default setUserHasPendingMods;
