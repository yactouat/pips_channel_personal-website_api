import fs from "fs";
import matter from "gray-matter";
import path from "path";
import { Storage } from "@google-cloud/storage";

import { BlogPostResource } from "pips_resources_definitions";

const extractPostDataFromRawPost = (
  postContents: string,
  slug?: string
): BlogPostResource => {
  // Use gray-matter to parse the post metadata section
  const postMetadata = matter(postContents);
  if (
    postMetadata.data.date == undefined ||
    postMetadata.data.slug == undefined ||
    postMetadata.data.title == undefined
  ) {
    throw new Error("post metadata is missing");
  }
  // Combine the metadata with the slug and add the post contents
  const returnedSlug = slug == undefined ? postMetadata.data.slug : slug;
  return {
    contents: postMetadata.content,
    date: postMetadata.data.date,
    slug: returnedSlug,
    title: postMetadata.data.title,
  };
};

export const fetchBlogPostDataFromFileSystem = (
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

export const fetchBlogPostDataFromGCPBucket = async (
  slug: string
): Promise<BlogPostResource> => {
  try {
    const bucketName = process.env.GCP_BUCKET as string;
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

export const fetchBlogPostsMetadataFromGCPBucket = async (): Promise<
  {
    date: string;
    slug: string;
    title: string;
  }[]
> => {
  const storage = getGCPStorageClient();
  try {
    const bucketName = process.env.GCP_BUCKET as string;
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

// TODO test this
export const fetchBlogPostsMetadataFromFileSystem = (
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

export const getGcpDownloadedPostStr = async (
  storage: Storage,
  bucketName: string,
  source: string
): Promise<string> => {
  const downloadedPost = await storage
    .bucket(bucketName)
    .file(source)
    .download();
  return downloadedPost[0].toString();
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

const getPostsMetaSortedByDate = (
  posts: BlogPostResource[]
): {
  date: string;
  slug: string;
  title: string;
}[] => {
  return posts
    .sort((a, b) => {
      return a.date < b.date ? 1 : -1;
    })
    .map((post) => {
      return {
        date: post.date,
        slug: post.slug,
        title: post.title,
      };
    });
};
