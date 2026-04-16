import axios from 'axios';

const API_BASE_URL_RAW = process.env.NEXT_PUBLIC_API_URL?.trim() ?? '';

function normalizeApiBaseUrl(baseUrl: string): string {
  // Hindari double prefix seperti /api/api/reports saat env sudah berisi /api.
  const withoutTrailingSlash = baseUrl.replace(/\/+$/, '');
  return withoutTrailingSlash.replace(/\/api$/i, '');
}

const API_BASE_URL = normalizeApiBaseUrl(API_BASE_URL_RAW);

if (!API_BASE_URL) {
  throw new Error('NEXT_PUBLIC_API_URL is not set. Pass it via Docker build arg.');
}

const api = axios.create({
  baseURL: API_BASE_URL,
});

api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }

  return config;
});

export default api;
