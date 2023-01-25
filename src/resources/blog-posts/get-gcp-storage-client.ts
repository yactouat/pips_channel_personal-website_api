import { Storage } from "@google-cloud/storage";

const getGCPStorageClient = (): Storage => {
  const storage =
    process.env.NODE_ENV === "production"
      ? new Storage({
          keyFilename: `${process.env.GCP_STORAGE_CREDENTIALS_SECRET_PATH}`,
        })
      : new Storage();
  return storage;
};

export default getGCPStorageClient;
