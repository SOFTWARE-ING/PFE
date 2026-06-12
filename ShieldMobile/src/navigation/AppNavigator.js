// src/navigation/AppNavigator.js
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import {
  Text, View, ActivityIndicator, StyleSheet, StatusBar,
} from 'react-native';

import { useAuth } from '../context/AuthContext';
import { COLORS }  from '../theme/colors';

import LoginScreen         from '../screens/LoginScreen';
import HomeScreen          from '../screens/HomeScreen';
import DetailScreen        from '../screens/DetailScreen';
import ScanScreen          from '../screens/ScanScreen';
import VerifyScreen        from '../screens/VerifyScreen';
import NotificationsScreen from '../screens/NotificationsScreen';

const Tab   = createBottomTabNavigator();
const Stack = createStackNavigator();

// ─── Icônes tab bar ───────────────────────────────────────────────────
const TAB_ICONS = {
  Home:          { emoji: '🏠', label: 'Accueil' },
  Scanner:       { emoji: '📷', label: 'Scanner' },
  Notifications: { emoji: '🔔', label: 'Alertes' },
  Profile:       { emoji: '👤', label: 'Profil' },
};

// ─── Stack : Accueil → Détail ─────────────────────────────────────────
function HomeStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="HomeList" component={HomeScreen} />
      <Stack.Screen name="Detail"   component={DetailScreen} />
    </Stack.Navigator>
  );
}

// ─── Stack : Scanner → Résultat ───────────────────────────────────────
function ScanStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="ScanCamera" component={ScanScreen} />
      <Stack.Screen name="Verify"     component={VerifyScreen} />
    </Stack.Navigator>
  );
}

// ─── Placeholder Profil ───────────────────────────────────────────────
function ProfileScreen() {
  const { user, logout } = useAuth();
  const initials = user?.name
    ? user.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : 'U';

  return (
    <View style={pStyles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.bgDeep} />
      <View style={pStyles.header}>
        <Text style={pStyles.headerTitle}>Profil</Text>
      </View>
      <View style={pStyles.body}>
        <View style={pStyles.avatar}>
          <Text style={pStyles.avatarText}>{initials}</Text>
        </View>
        <Text style={pStyles.name}>{user?.name || 'Utilisateur'}</Text>
        <Text style={pStyles.email}>{user?.email || ''}</Text>
        <Text
          style={pStyles.logoutBtn}
          onPress={logout}
        >
          Se déconnecter
        </Text>
      </View>
    </View>
  );
}

const pStyles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bgDeep },
  header: {
    paddingHorizontal: 16, paddingTop: 54, paddingBottom: 16,
    backgroundColor: COLORS.bgDeep,
  },
  headerTitle: { color: COLORS.textWhite, fontSize: 20, fontWeight: '700' },
  body: {
    flex: 1, backgroundColor: COLORS.bgWhite,
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    alignItems: 'center', paddingTop: 40,
  },
  avatar: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: COLORS.accent,
    justifyContent: 'center', alignItems: 'center',
    marginBottom: 14,
  },
  avatarText: { color: '#fff', fontSize: 28, fontWeight: '700' },
  name:       { fontSize: 18, fontWeight: '700', color: COLORS.textPrimary, marginBottom: 4 },
  email:      { fontSize: 13, color: COLORS.textSecondary, marginBottom: 30 },
  logoutBtn: {
    fontSize: 14, color: COLORS.alertText, fontWeight: '600',
    paddingVertical: 10, paddingHorizontal: 24,
    borderWidth: 1.5, borderColor: COLORS.alertText,
    borderRadius: 10, overflow: 'hidden',
  },
});

// ─── Onglets principaux ───────────────────────────────────────────────
function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor:   COLORS.accentLight,
        tabBarInactiveTintColor: COLORS.accentDim,
        tabBarStyle: {
          backgroundColor: COLORS.bgMid,
          borderTopWidth: 0.5,
          borderTopColor: COLORS.border,
          paddingBottom: 8,
          paddingTop: 6,
          height: 62,
        },
        tabBarLabel: ({ color }) => (
          <Text style={{ color, fontSize: 10, marginBottom: 2 }}>
            {TAB_ICONS[route.name]?.label || route.name}
          </Text>
        ),
        tabBarIcon: ({ color, focused }) => (
          <Text style={{ fontSize: focused ? 22 : 20, opacity: focused ? 1 : 0.7 }}>
            {TAB_ICONS[route.name]?.emoji || '•'}
          </Text>
        ),
      })}
    >
      <Tab.Screen name="Home"          component={HomeStack} />
      <Tab.Screen name="Scanner"       component={ScanStack} />
      <Tab.Screen name="Notifications" component={NotificationsScreen} />
      <Tab.Screen name="Profile"       component={ProfileScreen} />
    </Tab.Navigator>
  );
}

// ─── Splash écran de chargement ───────────────────────────────────────
function SplashScreen() {
  return (
    <View style={splashStyles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.bgDeep} />
      <View style={splashStyles.logoBox}>
        <Text style={splashStyles.logoEmoji}>🛡️</Text>
      </View>
      <Text style={splashStyles.appName}>CommuniSigne</Text>
      <ActivityIndicator
        size="large"
        color={COLORS.accentLight}
        style={{ marginTop: 40 }}
      />
    </View>
  );
}

const splashStyles = StyleSheet.create({
  container: {
    flex: 1, justifyContent: 'center', alignItems: 'center',
    backgroundColor: COLORS.bgDeep,
  },
  logoBox: {
    width: 80, height: 80, borderRadius: 22,
    backgroundColor: COLORS.accent,
    justifyContent: 'center', alignItems: 'center',
    marginBottom: 16,
    shadowColor: COLORS.accent,
    shadowOpacity: 0.5, shadowRadius: 16,
    elevation: 10,
  },
  logoEmoji: { fontSize: 42 },
  appName:   { fontSize: 22, fontWeight: '700', color: COLORS.textWhite, letterSpacing: 0.5 },
});

// ─── Routeur principal ────────────────────────────────────────────────
export default function AppNavigator() {
  const { user, loading } = useAuth();

  if (loading) return <SplashScreen />;

  return (
    <NavigationContainer>
      {user ? (
        <MainTabs />
      ) : (
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          <Stack.Screen name="Login" component={LoginScreen} />
        </Stack.Navigator>
      )}
    </NavigationContainer>
  );
}