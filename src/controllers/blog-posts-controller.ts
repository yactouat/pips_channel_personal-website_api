import { Request, Response } from "express";
import { sendJsonResponse } from "pips_resources_definitions/dist/behaviors";

import fetchBlogPostDataFromGCPBucket from "../services/blog-posts/fetch-blog-post-data-from-gcp-bucket";
import fetchBlogPostsMetadataFromGCPBucket from "../services/blog-posts/fetch-blog-posts-metadata-from-gcp-bucket";

export const getAllBlogPosts = async (req: Request, res: Response) => {
  const blogPostsMetadata = await fetchBlogPostsMetadataFromGCPBucket();
  sendJsonResponse(
    res,
    200,
    `${blogPostsMetadata.length} blog posts fetched`,
    blogPostsMetadata
  );
};

export const getOneBlogPost = async (req: Request, res: Response) => {
  const slug = req.params.slug;
  try {
    const blogPostdata = await fetchBlogPostDataFromGCPBucket(slug);
    sendJsonResponse(res, 200, `${slug} blog post data fetched`, blogPostdata);
  } catch (error) {
    console.error(error);
    sendJsonResponse(res, 404, `${slug} blog post data not found`);
  }
};
