import express from "express";
import fs from "fs";

const API = express();

API.get("/", (req, res) => {
  res.status(200).json({ msg: "latest API release is up" });
});

const server = API.listen(8080, () => {
  console.log("API server running");
  console.log("storage credentials secret path env var: ");
  console.log(process.env.GCP_STORAGE_CREDENTIALS_SECRET_PATH);
  console.log(
    fs.existsSync(process.env.GCP_STORAGE_CREDENTIALS_SECRET_PATH as string)
      ? "cloud storage credentials secret exists"
      : "cloud storage credentials secret does not exist"
  );
});
