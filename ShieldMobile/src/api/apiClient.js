// src/api/apiClient.js
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

// 🔧 Adresse IP locale de la machine qui héberge le backend FastAPI.
// Depuis un téléphone, "localhost" désigne le téléphone lui-même —
// utilisez l'IP locale de votre PC (ex: 192.168.1.42) sur le même réseau Wi-Fi,
// et lancez le backend avec :
//   uvicorn app.main:app --host 0.0.0.0 --port 8000
export const BASE_URL = 'http://192.168.1.100:8000/api';

const apiClient = axios.create({
  baseURL: BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Ajoute automatiquement le token JWT à chaque requête
apiClient.interceptors.request.use(
  async (config) => {
    const token = await AsyncStorage.getItem('jwt_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Gère les erreurs globalement (ex: token expiré)
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      await AsyncStorage.removeItem('jwt_token');
      await AsyncStorage.removeItem('user_data');
    }
    return Promise.reject(error);
  }
);

// ─── AUTHENTIFICATION ─────────────────────────────────────────────────

// Connexion via Google : envoie le id_token Google au backend,
// reçoit un JWT SHIELD + les infos utilisateur en retour.
export const loginWithGoogle = async (idToken) => {
  const response = await apiClient.post('/auth/google', { id_token: idToken });
  return response.data; // { success, message, access_token, user }
};

export const getMe = async () => {
  const response = await apiClient.get('/auth/me');
  return response.data;
};

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