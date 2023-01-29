import { Storage } from "@google-cloud/storage";

const getGCPStorageClient = (): Storage => {
  const storage =
    process.env.NODE_ENV === "production"
      ? new Storage({
          keyFilename: `${process.env.GCP_BUCKET_VIEWER_SA_FILE_NAME}`,
        })
      : new Storage();
  return storage;
};

export default getGCPStorageClient;
