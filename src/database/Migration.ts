import { Client } from "pg";
import fs from "fs";

export default class Migration {
  constructor(
    private readonly sqlFileName: string,
    private readonly pgClient: Client
  ) {}

  async up(): Promise<boolean> {
    let query = fs.readFileSync(`sql/${this.sqlFileName}`, "utf8");
    try {
      await this.pgClient.query(query);
    } catch (error) {
      console.error(error);
      return false;
    }
    return true;
  }
}
