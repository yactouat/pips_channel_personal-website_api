import { Storage } from "@google-cloud/storage";

const getGCPStorageClient = (): Storage => {
  const storage = new Storage({
    keyFilename: `${process.env.BLOG_POSTS_BUCKET_VIEWER_SA_FILE_NAME}`,
  });
  return storage;
};

export default getGCPStorageClient;
