import React from 'react';
import {Stack} from 'expo-router';
import {StatusBar} from 'expo-status-bar';
import {SafeAreaProvider} from 'react-native-safe-area-context';
import {ThemeProvider,useAppTheme} from '@/theme/ThemeContext';
import {DataProvider} from '@/data';
import {AuthProvider} from '@/lib/AuthContext';
import {OnboardingProvider} from '@/lib/OnboardingContext';
import {CategoryProvider} from '@/lib/CategoryContext';
function RootNavigation(){const {colors,resolved}=useAppTheme();return <><StatusBar style={resolved==='dark'?'light':'dark'}/><Stack screenOptions={{headerStyle:{backgroundColor:colors.background},headerTintColor:colors.text,contentStyle:{backgroundColor:colors.background},headerBackTitle:'Back',headerBackButtonDisplayMode:'minimal'}}><Stack.Screen name="(tabs)" options={{headerShown:false}}/><Stack.Screen name="expense/new" options={{title:'Add expense',presentation:'card'}}/><Stack.Screen name="expense/[id]" options={{title:'Expense details'}}/><Stack.Screen name="budget" options={{title:'Monthly budgets'}}/><Stack.Screen name="categories" options={{title:'Categories'}}/><Stack.Screen name="household" options={{title:'Household'}}/><Stack.Screen name="onboarding" options={{headerShown:false}}/></Stack></>}
export default function RootLayout(){return <SafeAreaProvider><ThemeProvider><AuthProvider><OnboardingProvider><DataProvider><CategoryProvider><RootNavigation/></CategoryProvider></DataProvider></OnboardingProvider></AuthProvider></ThemeProvider></SafeAreaProvider>}