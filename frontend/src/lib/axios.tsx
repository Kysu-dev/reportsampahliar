import axios from 'axios';

const API_BASE_URL_RAW = process.env.NEXT_PUBLIC_API_URL?.trim() ?? '';

function normalizeApiBaseUrl(baseUrl: string): string {
  // Hindari double prefix seperti /api/api/reports saat env sudah berisi /api.
  const withoutTrailingSlash = baseUrl.replace(/\/+$/, '');
  return withoutTrailingSlash.replace(/\/api$/i, '');
}

function resolveApiBaseUrl(baseUrl: string): string {
  const normalizedBaseUrl = normalizeApiBaseUrl(baseUrl);

  if (typeof window === 'undefined') {
    return normalizedBaseUrl;
  }

  const hostname = window.location.hostname;
  const isLocalhost = hostname === 'localhost' || hostname === '127.0.0.1';

  if (isLocalhost) {
    return normalizedBaseUrl;
  }

  // Di browser production, pakai same-origin agar selalu lewat proxy Nginx (/api dan /auth).
  return '';
}

const API_BASE_URL = resolveApiBaseUrl(API_BASE_URL_RAW);

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
