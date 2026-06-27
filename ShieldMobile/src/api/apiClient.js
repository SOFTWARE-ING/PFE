// src/api/apiClient.js
import axios from 'axios';
import { getApiBaseUrl } from '../config/serverConfig';

const apiClient = axios.create({
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' },
});

apiClient.interceptors.request.use(async (config) => {
  config.baseURL = await getApiBaseUrl();
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  (error) => Promise.reject(error)
);

// ─── Communiqués récents (accueil) ──────────────────────────────────
export const getRecentCommuniques = async (limit = 20) => {
  const response = await apiClient.get('/search/recent', { params: { limit } });
  return response.data;
};

// ─── Recherche ────────────────────────────────────────────────────────
export const searchCommuniques = async (query, page = 1, limit = 20) => {
  const response = await apiClient.get('/search/simple', {
    params: { q: query, page, limit },
  });
  return response.data;
};

export const getSearchSuggestions = async (query, limit = 5) => {
  const response = await apiClient.get('/search/suggestions', {
    params: { q: query, limit },
  });
  return response.data;
};

// ─── Détail d'un communiqué ──────────────────────────────────────────
export const getCommuniqueDetail = async (id) => {
  const response = await apiClient.get(`/search/communique/${id}`);
  return response.data;
};

// ─── Vérification d'un document ──────────────────────────────────────
export const verifyDocument = async (file) => {
  const formData = new FormData();
  formData.append('file', {
    uri:  file.uri,
    name: file.name || 'document.jpg',
    type: file.type || 'image/jpeg',
  });
  const response = await apiClient.post('/verify/document', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    timeout: 90000,
  });
  return response.data;
};

// ─── URL de téléchargement d'un communiqué ───────────────────────────
export const getDownloadUrl = async (id) => {
  const base = await getApiBaseUrl();
  return `${base}/search/communique/${id}/download`;
};

export { getApiBaseUrl };
export default apiClient;