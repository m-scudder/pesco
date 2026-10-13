import React from 'react';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAppTheme } from '@/theme/ThemeContext';
export default function TabsLayout() {
  const { colors, scope } = useAppTheme();
  const accent = scope === 'household' ? colors.household : colors.personal;
  return <Tabs screenOptions={{ headerShown: false, tabBarActiveTintColor: accent, tabBarInactiveTintColor: colors.muted, tabBarStyle: { backgroundColor: colors.tab, borderTopColor: colors.border, height: 66, paddingBottom: 7 }, tabBarLabelStyle: { fontSize: 11 } }}>
    <Tabs.Screen name="index" options={{ title: 'Home', tabBarIcon: ({color,size}) => <Ionicons name="home-outline" color={color} size={size} /> }} />
    <Tabs.Screen name="expenses" options={{ title: 'Expenses', tabBarIcon: ({color,size}) => <Ionicons name="list-outline" color={color} size={size} /> }} />
    <Tabs.Screen name="insights" options={{ title: 'Insights', tabBarIcon: ({color,size}) => <Ionicons name="stats-chart-outline" color={color} size={size} /> }} />
    <Tabs.Screen name="settings" options={{ title: 'Settings', tabBarIcon: ({color,size}) => <Ionicons name="settings-outline" color={color} size={size} /> }} />
  </Tabs>;
}
