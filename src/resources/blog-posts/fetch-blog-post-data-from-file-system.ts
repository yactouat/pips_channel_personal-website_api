import fs from "fs";
import path from "path";
import { BlogPostResource } from "pips_resources_definitions/dist/resources";

import extractPostDataFromRawPost from "./extract-post-data-from-raw-post";

const fetchBlogPostDataFromFileSystem = (
  slug: string,
  postsDir: string
): BlogPostResource => {
  const postFileFullPath = path.join(postsDir, `${slug}.md`);
  const fileContents = fs.readFileSync(postFileFullPath, "utf8");
  try {
    return extractPostDataFromRawPost(fileContents, slug);
  } catch (error) {
    console.error(error);
    throw new Error("post data is missing");
  }
};

export default fetchBlogPostDataFromFileSystem;
