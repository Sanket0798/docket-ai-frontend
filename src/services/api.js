import axios from 'axios';

/**
 * API base URL strategy:
 *
 * LOCAL DEV:
 *   VITE_API_URL is not set → baseURL = '/api'
 *   Vite's dev server proxies /api → http://localhost:5000
 *
 * PRODUCTION (Vercel):
 *   VITE_API_URL = https://your-render-app.onrender.com
 *   baseURL = 'https://your-render-app.onrender.com/api'
 *   Calls go directly to Render — no proxy needed.
 */
const baseURL = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL}/api`
  : '/api';

const api = axios.create({ baseURL });

// Attach JWT token to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Handle 401 globally — clear session and redirect to login
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      localStorage.removeItem('onboardingDone');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

export default api;
