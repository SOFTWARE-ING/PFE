// src/config/serverConfig.js
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'shield_server_url';

// Toujours HTTP — communication locale uniquement
export const DEFAULT_SERVER_URL = 'http://192.168.1.145:8000';

let cachedServerUrl = null;

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

export const setServerUrl = async (url) => {
  const cleaned = normalizeUrl(url);
  await AsyncStorage.setItem(STORAGE_KEY, cleaned);
  cachedServerUrl = cleaned;
  return cleaned;
};

export const getApiBaseUrl = async () => {
  const base = await getServerUrl();
  return `${base}/api`;
};

// Force toujours http:// peu importe ce que l'utilisateur tape
const normalizeUrl = (value) => {
  let v = value.trim();
  if (!v) return DEFAULT_SERVER_URL;
  // Retire tout schéma existant (http:// ou https://)
  v = v.replace(/^https?:\/\//i, '');
  // Retire les slashes finaux
  v = v.replace(/\/+$/, '');
  // Force http://
  return `http://${v}`;
};

export const testServerConnection = async (url) => {
  const cleaned = normalizeUrl(url);
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 8000);
  try {
    const response = await fetch(`${cleaned}/api/search/recent?limit=1`, {
      method: 'GET',
      signal: controller.signal,
      headers: { 'Accept': 'application/json' },
    });
    clearTimeout(timeoutId);
    if (!response.ok && response.status !== 422) {
      throw new Error(`Serveur a répondu: ${response.status}`);
    }
    return true;
  } catch (error) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      throw new Error('Délai dépassé — serveur trop lent ou inaccessible');
    }
    throw error;
  }
};