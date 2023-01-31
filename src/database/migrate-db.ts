import { argv } from "process";
import fs from "fs";
import { getPgClient } from "pips_resources_definitions/dist/behaviors";

import Migration from "./Migration";

const migrateDb = async () => {
  // scan `migrations` folder
  const sqlScripts = fs.readdirSync("sql");
  const pgClient = getPgClient();
  pgClient.connect();
  // run each migration in ascending order
  for (let i = 0; i < fs.readdirSync("sql").length; i++) {
    if (sqlScripts[i].endsWith(".sql")) {
      await new Migration(sqlScripts[i], pgClient).up();
    }
  }
  pgClient.end();
};

if (
  argv[1].includes("migrate-db") ||
  (argv[2] && argv[2].includes("migrate-db"))
) {
  migrateDb();
}

export default migrateDb;
