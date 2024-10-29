// src/axios.js
import axios from "axios";

const instance = axios.create({
  baseURL: "https://mapapi.susu.ru/integration/map",
  headers: {
    "Content-Type": "application/xml",
    Accept: "application/xml",
  },
  responseType: "text",
});

export default instance;
