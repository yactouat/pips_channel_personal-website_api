import { PubSub } from "@google-cloud/pubsub";

const getPubSubClient = () => {
  if (process.env.NODE_ENV === "development") {
    return new PubSub();
  } else {
    return new PubSub({
      projectId: process.env.GCP_PROJECT_ID,
      keyFilename: process.env.PUBSUB_PUBLISHER_SA_KEY_FILE_NAME,
    });
  }
};

export default getPubSubClient;
