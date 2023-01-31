import { BlogPostResource } from "pips_resources_definitions/dist/resources";
import extractPostDataFromRawPost from "./extract-post-data-from-raw-post";
import getGcpDownloadedPostStr from "./get-gcp-dowloaded-post-str";
import getGCPStorageClient from "./get-gcp-storage-client";
import getPostsMetaSortedByDate from "./get-posts-meta-sorted-by-date";

const fetchBlogPostsMetadataFromGCPBucket = async (): Promise<
  {
    date: string;
    slug: string;
    title: string;
  }[]
> => {
  const storage = getGCPStorageClient();
  try {
    const bucketName = process.env.BLOG_POSTS_BUCKET as string;
    let [postsFiles] = await storage.bucket(bucketName).getFiles();
    postsFiles = postsFiles.filter(
      (post) => post.name.startsWith("published") && post.name.endsWith(".md")
    );
    const posts: {
      date: string;
      slug: string;
      title: string;
    }[] = [];
    for (let i = 0; i < postsFiles.length; i++) {
      const downloadedPost = await getGcpDownloadedPostStr(
        storage,
        bucketName,
        postsFiles[i].name
      );
      try {
        posts.push(extractPostDataFromRawPost(downloadedPost));
      } catch (error) {
        console.error(error);
      }
    }
    return getPostsMetaSortedByDate(posts as BlogPostResource[]);
  } catch (error) {
    console.error(error);
    return [];
  }
};

export default fetchBlogPostsMetadataFromGCPBucket;
