import axios from 'axios';

// Intelligently parse the base URL and ensure it ends with /api for endpoints
const rawBaseUrl = import.meta.env.VITE_API_BASE_URL;
let apiBaseUrl = 'http://localhost:5000/api';
let rootBaseUrl = 'http://localhost:5000';

if (rawBaseUrl) {
  const cleanUrl = rawBaseUrl.replace(/\/$/, ''); // Remove trailing slash if present
  if (cleanUrl.endsWith('/api')) {
    apiBaseUrl = cleanUrl;
    rootBaseUrl = cleanUrl.slice(0, -4);
  } else {
    apiBaseUrl = `${cleanUrl}/api`;
    rootBaseUrl = cleanUrl;
  }
}

const api = axios.create({
  baseURL: apiBaseUrl,
});

// Add a request interceptor
api.interceptors.request.use(
  (config) => {
    const user = JSON.parse(localStorage.getItem('rastro_user'));
    if (user && user.token) {
      config.headers.Authorization = `Bearer ${user.token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export const getImageUrl = (path) => {
  if (!path) return '';
  if (path.startsWith('http')) return path;
  return `${rootBaseUrl}${path.startsWith('/') ? path : '/' + path}`;
};

export default api;
