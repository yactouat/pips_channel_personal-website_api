import cors from "cors";
import express from "express";
import {
  runPgQuery,
  sendJsonResponse,
} from "pips_resources_definitions/dist/behaviors";

import blogPostsRouter from "./routers/blog-posts-router";
import tokensRouter from "./routers/tokens-router";
import usersRouter from "./routers/users-router";

// ! you need to have your env correctly set up if you wish to run this API locally (see `.env.example`)
if (process.env.NODE_ENV === "development") {
  require("dotenv").config();
}

const API = express();
API.use(cors());
API.use(express.json());

// base route
API.get("/", async (req, res) => {
  let dbIsUp = true;
  try {
    const qRes = await runPgQuery("SELECT $1::text as message", ["DB IS UP"]);
    console.log(qRes.rows[0].message);
  } catch (error) {
    dbIsUp = false;
    console.error(error);
  }
  sendJsonResponse(
    res,
    200,
    dbIsUp
      ? "api.yactouat.com is available"
      : "api.yactouat.com is partly available",
    {
      services: [
        {
          service: "database",
          status: dbIsUp ? "up" : "down",
        },
      ],
    }
  );
});

API.use("/blog-posts", blogPostsRouter);

API.use("/tokens", tokensRouter);

API.use("/users", usersRouter);

const server = API.listen(8080, () => {
  console.log("API server running on port 8080");
});
