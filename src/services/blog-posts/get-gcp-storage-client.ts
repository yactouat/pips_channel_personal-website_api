import { Storage } from "@google-cloud/storage";

const getGCPStorageClient = (): Storage => {
  const storage = new Storage({
    keyFilename: `${process.env.BUCKET_VIEWER_SA_KEY_FILE_NAME}`,
  });
  return storage;
};

export default getGCPStorageClient;
