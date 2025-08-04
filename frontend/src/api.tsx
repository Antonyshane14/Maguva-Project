// src/api.ts
import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true, // optional — useful if you're using cookies
});

// 🔐 Attach token to all requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token'); // adjust if you store elsewhere
  if (token) {
    config.headers['Authorization'] = `Bearer ${token}`;
  }
  return config;
});

export default api;
