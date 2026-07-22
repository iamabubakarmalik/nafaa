// Marketplace API client — separate from business tenant auth
// Uses customer JWT token stored in customerAuth.store
import axios from 'axios';

const baseURL = import.meta.env.VITE_MARKETPLACE_API_URL || '/api/marketplace';

export const marketplaceClient = axios.create({
  baseURL,
  timeout: 30000,
});

marketplaceClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('marketplace_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

marketplaceClient.interceptors.response.use(
  (r) => r,
  (error) => {
    if (error?.response?.status === 401) {
      localStorage.removeItem('marketplace_token');
      window.location.href = '/market/login';
    }
    return Promise.reject(error);
  },
);
