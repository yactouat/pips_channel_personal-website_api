import { Storage } from "@google-cloud/storage";

const getGcpDownloadedPostStr = async (
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

export default getGcpDownloadedPostStr;
