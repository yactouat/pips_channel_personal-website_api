import { BlogPostResource } from "pips_resources_definitions/dist/resources";
import extractPostDataFromRawPost from "./extract-post-data-from-raw-post";
import getGcpDownloadedPostStr from "./get-gcp-dowloaded-post-str";
import getGCPStorageClient from "./get-gcp-storage-client";

const fetchBlogPostDataFromGCPBucket = async (
  slug: string
): Promise<BlogPostResource> => {
  try {
    const bucketName = process.env.BLOG_POSTS_BUCKET as string;
    const storage = getGCPStorageClient();
    const downloadedPostContents = await getGcpDownloadedPostStr(
      storage,
      bucketName,
      `published/${slug}.md`
    );
    try {
      return extractPostDataFromRawPost(downloadedPostContents, slug);
    } catch (error) {
      console.error(error);
      throw new Error("post data is missing");
    }
  } catch (error) {
    console.error(error);
    throw new Error("failed during GCP storage file retrieval process");
  }
};

export default fetchBlogPostDataFromGCPBucket;
