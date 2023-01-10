import express from "express";

const API = express();

API.get("/", (req, res) => {
  res.status(200).json({ msg: "latest API release is up" });
});

const server = API.listen(8080, () => {
  console.log("API server running");
});
