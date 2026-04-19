/**
 * API service — switches between real backend and mock based on VITE_USE_MOCK.
 *
 * LOCAL DEV (real backend):   VITE_USE_MOCK=false  →  uses Vite proxy → localhost:5000
 * CLIENT DEMO (Vercel mock):  VITE_USE_MOCK=true   →  uses mockApi.js (no backend needed)
 * PRODUCTION (real backend):  VITE_USE_MOCK=false  →  uses VITE_API_URL → Render
 */

import axios from 'axios';
import mockApi from './mockApi';

const USE_MOCK = import.meta.env.VITE_USE_MOCK === 'true';

if (USE_MOCK) {
  console.info('[API] Running in MOCK mode — no backend required');
}

/**
 * Base URL strategy:
 * - Local dev:   VITE_API_URL not set → '/api' → Vite proxies to localhost:5000
 * - Production:  VITE_API_URL = https://your-render-app.onrender.com → direct call
 */
const baseURL = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL}/api`
  : '/api';

const realApi = axios.create({ baseURL });

// Attach JWT token to every request
realApi.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Handle 401 globally — clear session and redirect to login
realApi.interceptors.response.use(
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

const api = USE_MOCK ? mockApi : realApi;

export default api;
