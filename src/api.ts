import express from "express";
import { fetchBlogPostsMetadataFromFileSystem } from "./resources/blog-posts/blog-posts";

const API = express();
const MOCK_POSTS_DIR = "MOCK_posts";

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
  const blogPostsMetadata =
    fetchBlogPostsMetadataFromFileSystem(MOCK_POSTS_DIR);
  sendResponse(
    res,
    200,
    `${blogPostsMetadata.length} blog posts fetched`,
    blogPostsMetadata
  );
});

const server = API.listen(8080, () => {
  console.log("API server running on port 8080");
});
