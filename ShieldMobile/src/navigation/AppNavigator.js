// src/navigation/AppNavigator.js
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { View, StyleSheet } from 'react-native';

import HomeScreen          from '../screens/HomeScreen';
import DetailScreen        from '../screens/DetailScreen';
import ScanScreen          from '../screens/ScanScreen';
import VerifyScreen        from '../screens/VerifyScreen';
import SearchScreen        from '../screens/SearchScreen';
import NotificationsScreen from '../screens/NotificationsScreen';
import SettingsScreen      from '../screens/SettingsScreen';
import { COLORS } from '../theme/colors';
import {
  IconHome, IconSearch, IconCamera, IconBell, IconSettings,
} from '../components/Icon';

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

function TabIcon({ Icon, focused }) {
  return (
    <View style={[styles.tabIcon, focused && styles.tabIconActive]}>
      <Icon size={22} color={focused ? COLORS.primary : COLORS.tabInactive} />
    </View>
  );
}

export default function AppNavigator() {
  return (
    <NavigationContainer>
      <Tab.Navigator
        screenOptions={{
          headerShown: false,
          tabBarStyle: {
            backgroundColor: COLORS.bgCard,
            borderTopWidth: 1,
            borderTopColor: COLORS.border,
            height: 64,
            paddingBottom: 8,
            paddingTop: 6,
          },
          tabBarActiveTintColor:   COLORS.primary,
          tabBarInactiveTintColor: COLORS.tabInactive,
          tabBarLabelStyle: { fontSize: 10, fontWeight: '600', marginTop: 0 },
        }}
      >
        <Tab.Screen
          name="Home"
          component={HomeStack}
          options={{
            tabBarLabel: 'Accueil',
            tabBarIcon: ({ focused }) => <TabIcon Icon={IconHome} focused={focused} />,
          }}
        />
        <Tab.Screen
          name="Search"
          component={SearchStack}
          options={{
            tabBarLabel: 'Recherche',
            tabBarIcon: ({ focused }) => <TabIcon Icon={IconSearch} focused={focused} />,
          }}
        />
        <Tab.Screen
          name="Scanner"
          component={ScanStack}
          options={{
            tabBarLabel: 'Vérifier',
            tabBarIcon: ({ focused }) => (
              <View style={styles.scanTabBtn}>
                <IconCamera size={26} color="#fff" />
              </View>
            ),
            tabBarLabelStyle: { fontSize: 10, fontWeight: '700', color: COLORS.primary },
          }}
        />
        <Tab.Screen
          name="Notifications"
          component={NotificationsScreen}
          options={{
            tabBarLabel: 'Alertes',
            tabBarIcon: ({ focused }) => <TabIcon Icon={IconBell} focused={focused} />,
          }}
        />
        <Tab.Screen
          name="Settings"
          component={SettingsScreen}
          options={{
            tabBarLabel: 'Paramètres',
            tabBarIcon: ({ focused }) => <TabIcon Icon={IconSettings} focused={focused} />,
          }}
        />
      </Tab.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  tabIcon: {
    width: 36, height: 36, borderRadius: 10,
    justifyContent: 'center', alignItems: 'center',
  },
  tabIconActive: {
    backgroundColor: COLORS.primaryPale,
  },
  scanTabBtn: {
    width: 50, height: 50, borderRadius: 25,
    backgroundColor: COLORS.primary,
    justifyContent: 'center', alignItems: 'center',
    marginBottom: 6,
    shadowColor: COLORS.primary,
    shadowOpacity: 0.4, shadowRadius: 8, shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },
});