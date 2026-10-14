import React from 'react';
import {Stack} from 'expo-router';
import {StatusBar} from 'expo-status-bar';
import {SafeAreaProvider} from 'react-native-safe-area-context';
import {ThemeProvider,useAppTheme} from '@/theme/ThemeContext';
import {DataProvider} from '@/data';
function RootNavigation(){const {colors,resolved}=useAppTheme();return <><StatusBar style={resolved==='dark'?'light':'dark'}/><Stack screenOptions={{headerStyle:{backgroundColor:colors.background},headerTintColor:colors.text,contentStyle:{backgroundColor:colors.background}}}><Stack.Screen name="(tabs)" options={{headerShown:false}}/><Stack.Screen name="expense/new" options={{title:'Expense',presentation:'modal'}}/><Stack.Screen name="expense/[id]" options={{title:'Expense details'}}/><Stack.Screen name="budget" options={{title:'Monthly budgets'}}/></Stack></>}
export default function RootLayout(){return <SafeAreaProvider><ThemeProvider><DataProvider><RootNavigation/></DataProvider></ThemeProvider></SafeAreaProvider>}