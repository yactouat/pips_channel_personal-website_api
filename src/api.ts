import express from "express";

const API = express();

const sendResponse = (
  res: express.Response,
  status: number,
  msg: string,
  data: {}[] = []
) => {
  res.status(status).json({
    msg,
    data,
  });
};

API.get("/", (req, res) => {
  sendResponse(res, 200, "api.yactouat.com is up and running");
});

API.get("/blog-posts", (req, res) => {
  // TODO
  sendResponse(res, 200, "... blog posts fetched", []);
});

const server = API.listen(8080, () => {
  console.log("API server running on port 8080");
});
