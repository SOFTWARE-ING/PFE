// src/api/apiClient.js
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

// 🔧 Change cette URL par l'adresse de ton serveur
const BASE_URL = 'http://TON_IP_SERVEUR:PORT/api';

const apiClient = axios.create({
  baseURL: BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Intercepteur : ajoute automatiquement le token JWT à chaque requête
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

// Intercepteur : gère les erreurs globalement (ex: token expiré)
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      // Token expiré → on supprime et on redirige vers login
      await AsyncStorage.removeItem('jwt_token');
      await AsyncStorage.removeItem('user_data');
    }
    return Promise.reject(error);
  }
);

// ─── Fonctions API ────────────────────────────────────────────────

// Connexion avec Google (envoie le token Google à ton backend)
export const loginWithGoogle = async (googleToken) => {
  const response = await apiClient.post('/auth/google', { token: googleToken });
  return response.data;
};

// Liste des communiqués publiés
export const getCommuniques = async (page = 1, limit = 10) => {
  const response = await apiClient.get('/communiques', {
    params: { page, limit, statut: 'PUBLIE' },
  });
  return response.data;
};

// Détail d'un communiqué
export const getCommuniqueById = async (id) => {
  const response = await apiClient.get(`/communiques/${id}`);
  return response.data;
};

// Vérifier l'authenticité d'un communiqué (par ID ou hash)
export const verifyCommunique = async (identifier) => {
  const response = await apiClient.get(`/communiques/verify/${identifier}`);
  return response.data;
};

// Vérifier via QR code (contient l'URL ou l'ID)
export const verifyByQRCode = async (qrData) => {
  const response = await apiClient.post('/communiques/verify-qr', { data: qrData });
  return response.data;
};

export default apiClient;
