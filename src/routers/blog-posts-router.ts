import express from "express";

import * as blogPostsController from "../controllers/blog-posts-controller";

const blogPostsRouter = express.Router();

blogPostsRouter.get("/", blogPostsController.getAllBlogPosts);

blogPostsRouter.get("/:slug", blogPostsController.getOneBlogPost);

export default blogPostsRouter;
