// src/config/serverConfig.js
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'shield_server_url';

// 🔧 Valeur par défaut utilisée si rien n'a encore été configuré.
// L'utilisateur peut la changer dans l'écran "Paramètres".
export const DEFAULT_SERVER_URL = 'http://192.168.1.100:8000';

let cachedServerUrl = null;

// Retourne l'URL de base du serveur (sans /api), ex: http://192.168.1.42:8000
export const getServerUrl = async () => {
  if (cachedServerUrl) return cachedServerUrl;
  try {
    const stored = await AsyncStorage.getItem(STORAGE_KEY);
    cachedServerUrl = stored || DEFAULT_SERVER_URL;
  } catch {
    cachedServerUrl = DEFAULT_SERVER_URL;
  }
  return cachedServerUrl;
};

// Enregistre une nouvelle adresse de serveur (appelé depuis l'écran Paramètres)
export const setServerUrl = async (url) => {
  const cleaned = url.trim().replace(/\/+$/, '');
  await AsyncStorage.setItem(STORAGE_KEY, cleaned);
  cachedServerUrl = cleaned;
  return cleaned;
};

// Retourne l'URL de base de l'API (avec /api), ex: http://192.168.1.42:8000/api
export const getApiBaseUrl = async () => {
  const base = await getServerUrl();
  return `${base}/api`;
};

// Teste la connexion au serveur en appelant sa route racine "/"
export const testServerConnection = async (url) => {
  const cleaned = url.trim().replace(/\/+$/, '');
  const response = await fetch(`${cleaned}/`, { method: 'GET' });
  if (!response.ok) {
    throw new Error(`Le serveur a répondu avec le code ${response.status}`);
  }
  return await response.json();
};