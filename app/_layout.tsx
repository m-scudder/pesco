import React from 'react';
import {Stack} from 'expo-router';
import {PescoLoader} from '@/components/PescoLoader';
import {useFonts as useInterFonts,Inter_400Regular,Inter_500Medium,Inter_600SemiBold,Inter_700Bold} from '@expo-google-fonts/inter';
import {useFonts as useJakartaFonts,PlusJakartaSans_500Medium,PlusJakartaSans_600SemiBold,PlusJakartaSans_700Bold} from '@expo-google-fonts/plus-jakarta-sans';
import {StatusBar} from 'expo-status-bar';
import {SafeAreaProvider} from 'react-native-safe-area-context';
import {ThemeProvider,useAppTheme} from '@/theme/ThemeContext';
import {DataProvider} from '@/data';
import {AuthProvider} from '@/lib/AuthContext';
import {OnboardingProvider} from '@/lib/OnboardingContext';
import {CategoryProvider} from '@/lib/CategoryContext';
function RootNavigation(){const {colors,resolved}=useAppTheme();return <><StatusBar style={resolved==='dark'?'light':'dark'}/><Stack screenOptions={{headerStyle:{backgroundColor:colors.background},headerTintColor:colors.text,contentStyle:{backgroundColor:colors.background},headerBackTitle:'Back',headerBackButtonDisplayMode:'minimal'}}><Stack.Screen name="(tabs)" options={{headerShown:false}}/><Stack.Screen name="expense/new" options={{title:'Add expense',presentation:'card'}}/><Stack.Screen name="expense/[id]" options={{title:'Expense details'}}/><Stack.Screen name="budget" options={{title:'Monthly budgets'}}/><Stack.Screen name="categories" options={{title:'Categories'}}/><Stack.Screen name="household" options={{title:'Household'}}/><Stack.Screen name="profile" options={{title:'My profile'}}/><Stack.Screen name="account-security" options={{title:'Account recovery'}}/><Stack.Screen name="sign-in" options={{title:'Recover account'}}/><Stack.Screen name="recurring" options={{title:'Recurring bills'}}/><Stack.Screen name="recurring/edit" options={{title:'Add recurring bill'}}/><Stack.Screen name="sync" options={{title:'Pending uploads'}}/><Stack.Screen name="history" options={{title:'Expense history'}}/><Stack.Screen name="onboarding" options={{headerShown:false}}/></Stack></>}
export default function RootLayout(){
 const [interLoaded]=useInterFonts({Inter_400Regular,Inter_500Medium,Inter_600SemiBold,Inter_700Bold});
 const [jakartaLoaded]=useJakartaFonts({PlusJakartaSans_500Medium,PlusJakartaSans_600SemiBold,PlusJakartaSans_700Bold});
 if(!interLoaded||!jakartaLoaded)return <PescoLoader message="Setting up your space…"/>;
 return <SafeAreaProvider><ThemeProvider><AuthProvider><OnboardingProvider><DataProvider><CategoryProvider><RootNavigation/></CategoryProvider></DataProvider></OnboardingProvider></AuthProvider></ThemeProvider></SafeAreaProvider>}