import { BlogPostResource } from "pips_resources_definitions/dist/resources";
import fs from "fs";
import path from "path";

import extractPostDataFromRawPost from "./extract-post-data-from-raw-post";
import getPostsMetaSortedByDate from "./get-posts-meta-sorted-by-date";

const fetchBlogPostsMetadataFromFileSystem = (
  postsDir: string
): {
  date: string;
  slug: string;
  title: string;
}[] => {
  // Get file names under /posts
  const postsFileNames = fs.readdirSync(path.join(process.cwd(), postsDir));
  const posts = postsFileNames
    .map((fileName) => {
      // Read markdown file as an utf-8 encoded string
      const fullPath = path.join(postsDir, fileName);
      const fileContents = fs.readFileSync(fullPath, "utf8");
      try {
        return extractPostDataFromRawPost(fileContents);
      } catch (error) {
        return {};
      }
    })
    // filtering out the posts that don't have the required metadata
    .filter((postMetaData) => {
      return (
        postMetaData.hasOwnProperty("date") &&
        postMetaData.hasOwnProperty("slug") &&
        postMetaData.hasOwnProperty("title")
      );
    });
  // Sort posts by date DESC
  return getPostsMetaSortedByDate(posts as BlogPostResource[]);
};

export default fetchBlogPostsMetadataFromFileSystem;
