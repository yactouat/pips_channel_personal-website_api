import express from "express";

const API = express();

API.get("/", (req, res) => {
  res.status(200).json({ msg: "API is up" });
});

const server = API.listen(8081, () => {
  console.log("API server running");
});
