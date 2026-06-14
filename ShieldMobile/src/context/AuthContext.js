// src/context/AuthContext.js
import React, { createContext, useState, useContext, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser]       = useState(null);
  const [token, setToken]     = useState(null);
  const [loading, setLoading] = useState(true); // vérifie si déjà connecté au démarrage

  // Au démarrage : vérifie si un token existe déjà en mémoire
  useEffect(() => {
    const loadStoredAuth = async () => {
      try {
        const storedToken = await AsyncStorage.getItem('jwt_token');
        const storedUser  = await AsyncStorage.getItem('user_data');
        if (storedToken && storedUser) {
          setToken(storedToken);
          setUser(JSON.parse(storedUser));
        }
      } catch (e) {
        console.error('Erreur chargement auth:', e);
      } finally {
        setLoading(false);
      }
    };
    loadStoredAuth();
  }, []);

  // Appelé après connexion réussie
  const login = async (userData, jwtToken) => {
    await AsyncStorage.setItem('jwt_token', jwtToken);
    await AsyncStorage.setItem('user_data', JSON.stringify(userData));
    setToken(jwtToken);
    setUser(userData);
  };

  // Déconnexion
  const logout = async () => {
    await AsyncStorage.removeItem('jwt_token');
    await AsyncStorage.removeItem('user_data');
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

// Hook pratique : const { user, login, logout } = useAuth();
export const useAuth = () => useContext(AuthContext);