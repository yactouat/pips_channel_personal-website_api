import fs from "fs";
import matter from "gray-matter";
import path from "path";
import { Storage } from "@google-cloud/storage";

interface PostMetaData {
  date: string;
  slug: string;
  title: string;
}

interface PostData extends PostMetaData {
  contents: string;
}

export const fetchBlogPostDataFromFileSystem = async (
  slug: string,
  postsDir: string
): Promise<PostData> => {
  const postFileFullPath = path.join(postsDir, `${slug}.md`);
  const fileContents = fs.readFileSync(postFileFullPath, "utf8");
  const rawPost = matter(fileContents);
  return {
    contents: rawPost.content,
    date: rawPost.data.date,
    slug: slug,
    title: rawPost.data.title,
  };
};

export const fetchBlogPostsMetadataFromGCPBucket = async () => {
  const storage =
    process.env.NODE_ENV === "production"
      ? new Storage({
          keyFilename: process.env.GCP_STORAGE_CREDENTIALS_SECRET_PATH,
        })
      : new Storage();
  try {
    const [postsFileNames] = await storage
      .bucket(process.env.GCP_STORAGE_BUCKET_NAME as string)
      .getFiles();
    console.log(postsFileNames);
  } catch (error) {
    console.error(error);
  }
};

export const fetchBlogPostsMetadataFromFileSystem = (
  postsDir: string
): PostMetaData[] => {
  // Get file names under /posts
  const postsFileNames = fs.readdirSync(path.join(process.cwd(), postsDir));
  const postsMetaData: {}[] = postsFileNames
    .map((fileName) => {
      // Remove ".md" from file name to get their slug
      const postSlug = fileName.replace(/\.md$/, "");
      // Read markdown file as an utf-8 encoded string
      const fullPath = path.join(postsDir, fileName);
      const fileContents = fs.readFileSync(fullPath, "utf8");
      // Use gray-matter to parse the post metadata section
      const postMetadata = matter(fileContents);
      if (
        !postMetadata.data.date ||
        !postMetadata.data.slug ||
        !postMetadata.data.title
      ) {
        return {};
      }
      // Combine the metadata with the slug
      return {
        date: postMetadata.data.date,
        slug: postSlug,
        title: postMetadata.data.title,
      };
    })
    // filtering out the posts that don't have the required metadata
    .filter((postMetaData) => {
      return postMetaData.date && postMetaData.slug && postMetaData.title;
    });
  // Sort posts by date DESC
  return (postsMetaData as PostMetaData[]).sort((a, b) =>
    a.date < b.date ? 1 : -1
  );
};
