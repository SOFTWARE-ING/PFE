// src/navigation/AppNavigator.js
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { View, StyleSheet, Platform } from 'react-native';

import HomeScreen     from '../screens/HomeScreen';
import DetailScreen   from '../screens/DetailScreen';
import ScanScreen     from '../screens/ScanScreen';
import VerifyScreen   from '../screens/VerifyScreen';
import SearchScreen   from '../screens/SearchScreen';
import SettingsScreen from '../screens/SettingsScreen';
import { COLORS } from '../theme/colors';
import { IconHome, IconSearch, IconCamera, IconSettings, IconScan } from '../components/Icon';

const Tab   = createBottomTabNavigator();
const Stack = createStackNavigator();

function HomeStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="HomeList" component={HomeScreen} />
      <Stack.Screen name="Detail"   component={DetailScreen} />
    </Stack.Navigator>
  );
}

function SearchStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="SearchList" component={SearchScreen} />
      <Stack.Screen name="Detail"     component={DetailScreen} />
    </Stack.Navigator>
  );
}

function ScanStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="ScanCamera" component={ScanScreen} />
      <Stack.Screen name="Verify"     component={VerifyScreen} />
    </Stack.Navigator>
  );
}

function TabBarIcon({ focused, Icon }) {
  return (
    <View style={[styles.tabIcon, focused && styles.tabIconActive]}>
      <Icon size={22} color={focused ? COLORS.primary : COLORS.tabInactive} />
    </View>
  );
}

function ScanTabIcon() {
  return (
    <View style={styles.scanFab}>
      <View style={styles.scanFabInner}>
        <IconScan size={26} color="#fff" />
      </View>
    </View>
  );
}

export default function AppNavigator() {
  return (
    <NavigationContainer>
      <Tab.Navigator
        screenOptions={{
          headerShown: false,
          tabBarStyle: styles.tabBar,
          tabBarActiveTintColor:   COLORS.primary,
          tabBarInactiveTintColor: COLORS.tabInactive,
          tabBarShowLabel: false,
        }}
      >
        <Tab.Screen name="Home"
          component={HomeStack}
          options={{ tabBarIcon: ({ focused }) => <TabBarIcon focused={focused} Icon={IconHome} /> }}
        />
        <Tab.Screen name="Search"
          component={SearchStack}
          options={{ tabBarIcon: ({ focused }) => <TabBarIcon focused={focused} Icon={IconSearch} /> }}
        />
        <Tab.Screen name="Scanner"
          component={ScanStack}
          options={{ tabBarIcon: () => <ScanTabIcon /> }}
        />
        <Tab.Screen name="Settings"
          component={SettingsScreen}
          options={{ tabBarIcon: ({ focused }) => <TabBarIcon focused={focused} Icon={IconSettings} /> }}
        />
      </Tab.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: COLORS.bgNav,
    borderTopWidth: 0,
    height: Platform.OS === 'android' ? 68 : 80,
    paddingBottom: Platform.OS === 'android' ? 8 : 20,
    paddingTop: 10,
    elevation: 0,
    shadowOpacity: 0,
  },
  tabIcon: {
    width: 44, height: 44, borderRadius: 14,
    justifyContent: 'center', alignItems: 'center',
  },
  tabIconActive: {
    backgroundColor: COLORS.primaryPale,
  },
  scanFab: {
    width: 58, height: 58, borderRadius: 18,
    backgroundColor: COLORS.bgApp,
    justifyContent: 'center', alignItems: 'center',
    marginBottom: Platform.OS === 'android' ? 10 : 0,
  },
  scanFabInner: {
    width: 52, height: 52, borderRadius: 16,
    backgroundColor: COLORS.primary,
    justifyContent: 'center', alignItems: 'center',
    shadowColor: COLORS.primary,
    shadowOpacity: 0.6, shadowRadius: 12, elevation: 10,
  },
});