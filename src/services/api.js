import axios from 'axios';
import { API_BASE_URL } from "../utils/api";

const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,  // <--- absolutely required for cookies!
  headers: { 'Content-Type': 'application/json' }
});

export default api;
