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

const extractPostMetadataFromRawPost = (postContents: string): PostMetaData => {
  // Use gray-matter to parse the post metadata section
  const postMetadata = matter(postContents);
  if (
    postMetadata.data.date == undefined ||
    postMetadata.data.slug == undefined ||
    postMetadata.data.title == undefined
  ) {
    throw new Error("post metadata is missing");
  }
  // Combine the metadata with the slug
  return {
    date: postMetadata.data.date,
    slug: postMetadata.data.slug,
    title: postMetadata.data.title,
  };
};

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

export const fetchBlogPostDataFromGCPBucket = async (
  slug: string
): Promise<PostData> => {
  let fileContents = "";
  try {
    const bucketName = process.env.GCP_BUCKET as string;
    const storage = getGCPStorageClient();
    const rawFileContents = await storage
      .bucket(bucketName)
      .file(`published/${slug}.md`)
      .download();
    fileContents = rawFileContents.toString();
  } catch (error) {
    console.error(error);
    throw new Error("failed during GCP storage file retrieval process");
  }
  try {
    const metaData = extractPostMetadataFromRawPost(fileContents);
    return {
      contents: fileContents,
      date: metaData.date,
      slug: slug,
      title: metaData.title,
    };
  } catch (error) {
    console.error(error);
    throw new Error("post data is missing");
  }
};

export const fetchBlogPostsMetadataFromGCPBucket = async (): Promise<
  PostMetaData[]
> => {
  const storage = getGCPStorageClient();
  try {
    const bucketName = process.env.GCP_BUCKET as string;
    let [postsFiles] = await storage.bucket(bucketName).getFiles();
    postsFiles = postsFiles.filter(
      (post) => post.name.startsWith("published") && post.name.endsWith(".md")
    );
    const postsMetaData: PostMetaData[] = [];
    for (let i = 0; i < postsFiles.length; i++) {
      const fileName = postsFiles[i].name;
      const downloadedPost = await storage
        .bucket(bucketName)
        .file(fileName)
        .download();
      console.log(fileName, "FILE NAME");
      try {
        postsMetaData.push(
          extractPostMetadataFromRawPost(downloadedPost[0].toString())
        );
      } catch (error) {
        console.error(error);
      }
    }
    return sortPostsMetaDataByDateProp(postsMetaData);
  } catch (error) {
    console.error(error);
    return [];
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
      try {
        return extractPostMetadataFromRawPost(fileContents);
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
  return sortPostsMetaDataByDateProp(postsMetaData as PostMetaData[]);
};

export const getGCPStorageClient = (): Storage => {
  const storage =
    process.env.NODE_ENV === "production"
      ? new Storage({
          keyFilename: `${process.env.GCP_STORAGE_CREDENTIALS_SECRET_PATH}`,
        })
      : new Storage();
  return storage;
};

const sortPostsMetaDataByDateProp = (
  postsMetaData: PostMetaData[]
): PostMetaData[] => {
  return postsMetaData.sort((a, b) => {
    return a.date < b.date ? 1 : -1;
  });
};
