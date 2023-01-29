import { Client } from "pg";
import fs from "fs";

interface PgClientConfig {
  database: string;
  host: string;
  ssl?: {
    ca: string;
  };
  user?: string;
}

const getPgClient = () => {
  // loading .env file only in development
  if (process.env.NODE_ENV === "development") {
    require("dotenv").config();
  }
  let pgClientConfig: PgClientConfig = {
    database: process.env.POSTGRES_DB as string,
    host: process.env.POSTGRES_HOST as string,
    user: process.env.POSTGRES_USR as string,
  };
  if (process.env.NODE_ENV !== "development") {
    pgClientConfig = {
      database: process.env.POSTGRES_DB as string,
      host: process.env.POSTGRES_HOST as string,
      // this object will be passed to the TLSSocket constructor
      ssl: {
        ca: fs
          .readFileSync(process.env.SUPABASE_POSTGRES_ROOT_CERT as string)
          .toString(),
      },
    };
  }
  return new Client(pgClientConfig);
};

export default getPgClient;
