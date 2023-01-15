import express from "express";
import {
  // fetchBlogPostDataFromFileSystem,
  fetchBlogPostDataFromGCPBucket,
  // fetchBlogPostsMetadataFromFileSystem,
  fetchBlogPostsMetadataFromGCPBucket,
} from "./resources/blog-posts/blog-posts";

// ! you need to have your env correctly set up if you wish to run this API locally (see `.env.example`)
if (process.env.NODE_ENV === "development") {
  require("dotenv").config();
}

const API = express();
// using mocks for now while I'm still developing the API
const MOCK_POSTS_DIR = "MOCK_posts";

const sendResponse = (
  res: express.Response,
  status: number,
  msg: string,
  data: {}[] | {} | null = null
) => {
  res.status(status).json({
    msg,
    data,
  });
};

API.get("/", (req, res) => {
  sendResponse(res, 200, "api.yactouat.com is up and running");
});

API.get("/blog-posts", async (req, res) => {
  const blogPostsMetadata = await fetchBlogPostsMetadataFromGCPBucket();
  sendResponse(
    res,
    200,
    `${blogPostsMetadata.length} blog posts fetched`,
    blogPostsMetadata
  );
});

API.get("/blog-posts/:slug", async (req, res) => {
  const slug = req.params.slug;
  try {
    const blogPostdata = await fetchBlogPostDataFromGCPBucket(slug);
    sendResponse(res, 200, `${slug} blog post data fetched`, blogPostdata);
  } catch (error) {
    console.error(error);
    sendResponse(res, 404, `${slug} blog post data not found`);
  }
});

// blog post retrieved from file system
// API.get("/blog-posts", (req, res) => {
//   const blogPostsMetadata =
//     fetchBlogPostsMetadataFromFileSystem(MOCK_POSTS_DIR);
//   sendResponse(
//     res,
//     200,
//     `${blogPostsMetadata.length} blog posts fetched`,
//     blogPostsMetadata
//   );
// });
// API.get("/blog-posts/:slug", async (req, res) => {
//   const slug = req.params.slug;
//   try {
//     const blogPostdata = await fetchBlogPostDataFromFileSystem(
//       slug,
//       MOCK_POSTS_DIR
//     );
//     sendResponse(res, 200, `${slug} blog post data fetched`, blogPostdata);
//   } catch (error) {
//     console.error(error);
//     sendResponse(res, 404, `${slug} blog post data not found`);
//   }
// });

const server = API.listen(8080, () => {
  console.log("API server running on port 8080");
});
