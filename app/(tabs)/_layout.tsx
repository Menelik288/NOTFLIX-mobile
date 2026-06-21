import { Tabs } from 'expo-router';
import React from 'react';
import { Platform, View, StyleSheet } from 'react-native';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { CustomTabBar } from '../../components/CustomTabBar';

export default function TabLayout() {
  return (
    <Tabs
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{
        headerShown: false,
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color }) => <MaterialIcons name="home" size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="movies"
        options={{
          title: 'Movies',
          tabBarIcon: ({ color }) => <MaterialIcons name="movie" size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="foryou"
        options={{
          title: 'For You',
          tabBarIcon: ({ color }) => <MaterialIcons name="stars" size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="tv"
        options={{
          title: 'TV',
          tabBarIcon: ({ color }) => <MaterialIcons name="tv" size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="watchlist"
        options={{
          title: 'Watchlist',
          tabBarIcon: ({ color }) => <MaterialIcons name="bookmark" size={24} color={color} />,
        }}
      />
    </Tabs>
  );
}
