/* eslint-disable @typescript-eslint/no-explicit-any */
import axios from 'axios';
import { env } from '../env';

export const api = axios.create({ baseURL: env.VITE_API_URL });

function getToken() {
  return localStorage.getItem('token');
}

api.interceptors.request.use((config) => {
  const token = getToken();
  if (token) {
    config.headers = config.headers ?? {};
    (config.headers as any).Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err?.response?.status === 401) {
      localStorage.removeItem('token');
      if (location.pathname !== '/login') location.href = '/login';
    }
    return Promise.reject(err);
  }
);
