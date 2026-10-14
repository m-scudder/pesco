import React from 'react';
import { Tabs, Redirect } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';
import { useOnboarding } from '@/lib/OnboardingContext';
import { Ionicons } from '@expo/vector-icons';
import { useAppTheme } from '@/theme/ThemeContext';
import { localDate } from '@/data';
export default function TabsLayout() {
  const { colors, scope } = useAppTheme();
  const {ready,complete}=useOnboarding();
  if(!ready)return <View style={{flex:1,justifyContent:'center'}}><ActivityIndicator/></View>;
  if(!complete)return <Redirect href="/onboarding"/>;
  const accent = scope === 'household' ? colors.household : colors.personal;
  const [year,month,day] = localDate().split('-');
  const todayLabel = `${day}/${month}`;
  return <Tabs screenOptions={{ headerShown: false, tabBarActiveTintColor: accent, tabBarInactiveTintColor: colors.muted, tabBarStyle: { backgroundColor: colors.tab, borderTopColor: colors.border, height: 66, paddingBottom: 7 }, tabBarLabelStyle: { fontSize: 11 } }}>
    <Tabs.Screen name="index" options={{ title: todayLabel, tabBarIcon: ({color,size}) => <Ionicons name="book-outline" color={color} size={size} /> }} />
    <Tabs.Screen name="house" options={{ title: 'House', tabBarIcon: ({color,size}) => <Ionicons name="people-outline" color={color} size={size} /> }} />
    <Tabs.Screen name="expenses" options={{ href: null }} />
    <Tabs.Screen name="insights" options={{ title: 'Insights', tabBarIcon: ({color,size}) => <Ionicons name="stats-chart-outline" color={color} size={size} /> }} />
    <Tabs.Screen name="settings" options={{ title: 'Settings', tabBarIcon: ({color,size}) => <Ionicons name="settings-outline" color={color} size={size} /> }} />
  </Tabs>;
}
