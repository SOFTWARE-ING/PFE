// src/api/apiClient.js
import axios from 'axios';
import { getApiBaseUrl } from '../config/serverConfig';

const apiClient = axios.create({
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' },
});

// Définit dynamiquement l'URL de base à chaque requête,
// selon l'adresse configurée par l'utilisateur dans "Paramètres".
apiClient.interceptors.request.use(async (config) => {
  config.baseURL = await getApiBaseUrl();
  return config;
});

// ─── COMMUNIQUÉS / RECHERCHE ──────────────────────────────────────────

// Communiqués récents (page d'accueil)
export const getRecentCommuniques = async (limit = 20) => {
  const response = await apiClient.get('/search/recent', { params: { limit } });
  return response.data; // { success, total, results: [...] }
};

// Recherche d'un communiqué signé (titre / contenu)
export const searchCommuniques = async (query, page = 1, limit = 20) => {
  const response = await apiClient.get('/search/simple', {
    params: { q: query, page, limit },
  });
  return response.data; // { success, query, total, page, limit, results: [{communique, score}] }
};

// Suggestions d'auto-complétion pour la barre de recherche
export const getSearchSuggestions = async (query, limit = 5) => {
  const response = await apiClient.get('/search/suggestions', {
    params: { q: query, limit },
  });
  return response.data; // { query, suggestions: [...] }
};

// Détail public d'un communiqué (institution, signataire, etc.)
export const getCommuniqueDetail = async (id) => {
  const response = await apiClient.get(`/search/communique/${id}`);
  return response.data; // { success, communique: {...} }
};

// ─── VÉRIFICATION D'AUTHENTICITÉ ──────────────────────────────────────

// Vérifie l'authenticité d'un document (photo prise ou fichier choisi).
// `file` = { uri, name, type }
export const verifyDocument = async (file) => {
  const formData = new FormData();
  formData.append('file', {
    uri: file.uri,
    name: file.name || 'document.jpg',
    type: file.type || 'image/jpeg',
  });

  const response = await apiClient.post('/verify/document', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    timeout: 60000, // l'OCR peut prendre quelques secondes
  });
  return response.data; // { document_info, niveau1, niveau2, niveau3, verdict }
};

export default apiClient;
export { getApiBaseUrl } from '../config/serverConfig';