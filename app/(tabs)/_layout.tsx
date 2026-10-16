import {fontSizes,fontFamilies,fontWeights} from '@/theme/typography';
import React from 'react';
import { Tabs, Redirect } from 'expo-router';
import { PescoLoader } from '@/components/PescoLoader';
import { useAuth } from '@/lib/AuthContext';
import { useData } from '@/data';
import { useOnboarding } from '@/lib/OnboardingContext';
import { Ionicons } from '@expo/vector-icons';
import { useAppTheme } from '@/theme/ThemeContext';
import { localDate } from '@/data';
export default function TabsLayout() {
  const { colors, scope } = useAppTheme();
  const {ready,complete}=useOnboarding();
  const {ready:authReady,user}=useAuth();
  const {loaded}=useData();
  if(!ready||!authReady||(complete&&!loaded))return <PescoLoader message="Gathering your expenses…"/>;
  if(!user||user.is_anonymous||!user.identities?.some(identity=>identity.provider==='google'||identity.provider==='apple')||!complete)return <Redirect href="/onboarding"/>;
  const accent = scope === 'household' ? colors.household : colors.personal;
  const [year,month,day] = localDate().split('-');
  const todayLabel = `${day}/${month}`;
  return <Tabs screenOptions={{ headerShown: false, tabBarActiveTintColor: accent, tabBarInactiveTintColor: colors.muted, tabBarStyle: { backgroundColor: colors.tab, borderTopColor: colors.border, height: 66, paddingBottom: 7 }, tabBarLabelStyle: { fontSize:fontSizes.caption, fontFamily:fontFamilies.medium } }}>
    <Tabs.Screen name="index" options={{ title: todayLabel, tabBarIcon: ({color,size}) => <Ionicons name="book-outline" color={color} size={size} /> }} />
    <Tabs.Screen name="house" options={{ title: 'House', tabBarIcon: ({color,size}) => <Ionicons name="people-outline" color={color} size={size} /> }} />
    <Tabs.Screen name="expenses" options={{ href: null }} />
    <Tabs.Screen name="insights" options={{ title: 'Stats', tabBarIcon: ({color,size}) => <Ionicons name="bar-chart-outline" color={color} size={size} /> }} />
    <Tabs.Screen name="settings" options={{ title: 'Settings', tabBarIcon: ({color,size}) => <Ionicons name="settings-outline" color={color} size={size} /> }} />
  </Tabs>;
}
