// src/navigation/AppNavigator.js
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { Text } from 'react-native';

import HomeScreen          from '../screens/HomeScreen';
import DetailScreen        from '../screens/DetailScreen';
import ScanScreen          from '../screens/ScanScreen';
import VerifyScreen        from '../screens/VerifyScreen';
import SearchScreen        from '../screens/SearchScreen';
import NotificationsScreen from '../screens/NotificationsScreen';
import SettingsScreen      from '../screens/SettingsScreen';
import { COLORS } from '../theme/colors';

const Tab   = createBottomTabNavigator();
const Stack = createStackNavigator();

// ─── Icônes tab bar ───────────────────────────────────────────────────
const TAB_ICONS = {
  Home:          { emoji: '🏠', label: 'Accueil' },
  Search:        { emoji: '🔍', label: 'Recherche' },
  Scanner:       { emoji: '📷', label: 'Vérifier' },
  Notifications: { emoji: '🔔', label: 'Alertes' },
  Settings:      { emoji: '⚙️', label: 'Paramètres' },
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

// ─── Stack : Recherche → Détail ───────────────────────────────────────
function SearchStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="SearchList" component={SearchScreen} />
      <Stack.Screen name="Detail"     component={DetailScreen} />
    </Stack.Navigator>
  );
}

// ─── Stack : Scanner/Upload → Résultat ─────────────────────────────────
function ScanStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="ScanCamera" component={ScanScreen} />
      <Stack.Screen name="Verify"     component={VerifyScreen} />
    </Stack.Navigator>
  );
}

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
      <Tab.Screen name="Search"        component={SearchStack} />
      <Tab.Screen name="Scanner"       component={ScanStack} />
      <Tab.Screen name="Notifications" component={NotificationsScreen} />
      <Tab.Screen name="Settings"      component={SettingsScreen} />
    </Tab.Navigator>
  );
}

// ─── Routeur principal (pas d'authentification pour cette v1) ──────────
export default function AppNavigator() {
  return (
    <NavigationContainer>
      <MainTabs />
    </NavigationContainer>
  );
}