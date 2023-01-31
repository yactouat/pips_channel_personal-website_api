import { migrateDb } from "pips_resources_definitions/dist/behaviors";
import { argv } from "process";

if (
  argv[1].includes("migrate-db") ||
  (argv[2] && argv[2].includes("migrate-db"))
) {
  migrateDb();
}
