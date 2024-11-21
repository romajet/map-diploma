// src/axios.js
import axios from "axios";

const instance = axios.create({
  baseURL: "https://mapapi.susu.ru/integration/map"
});

export default instance;
