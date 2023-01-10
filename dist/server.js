"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const API = (0, express_1.default)();
API.get("/", (req, res) => {
    res.status(200).json({ msg: "API is up" });
});
const server = API.listen(8080, () => {
    console.log("API server running");
});
