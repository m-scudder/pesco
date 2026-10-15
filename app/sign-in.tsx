import React,{useState} from 'react';
import {Alert,Pressable,Text,TextInput,View} from 'react-native';
import {useRouter} from 'expo-router';
import {Screen} from '@/components/Screen';
import {useAppTheme} from '@/theme/ThemeContext';
import {useAuth} from '@/lib/AuthContext';
import {useData} from '@/data';
import {useOnboarding} from '@/lib/OnboardingContext';
import {supabase} from '@/lib/supabase';

export default function SignIn(){
 const {colors}=useAppTheme();
 const router=useRouter();
 const {user}=useAuth();
 const {household,expenses,pendingEntries,pendingMutations}=useData();
 const {finish}=useOnboarding();
 const [email,setEmail]=useState('');
 const [password,setPassword]=useState('');
 const [busy,setBusy]=useState(false);
 const [recoveryBusy,setRecoveryBusy]=useState(false);
 // Signing in switches the Supabase user ID; block it if this device holds
 // any anonymous household/personal data that would become inaccessible.
 const unsafe=!!household||pendingEntries.length>0||pendingMutations.length>0||
  expenses.some(e=>!e.id.startsWith('demo:'));
 async function login(){
  if(!supabase||busy)return;
  if(unsafe){Alert.alert('Protect this device first','This device has existing expense data. Set up recovery for its current account before changing accounts.');return}
  if(!email.trim()||!password){Alert.alert('Missing details','Enter the email and password for your protected account.');return}
  setBusy(true);
  try{
   const {error}=await supabase.auth.signInWithPassword({email:email.trim().toLowerCase(),password});
   if(error)throw error;
   setPassword('');
   await finish();
   router.replace('/(tabs)');
  }catch(e){Alert.alert('Sign-in failed',e instanceof Error?e.message:'Try again')}
  finally{setBusy(false)}
 }
 async function resetPassword(){
  if(!supabase||recoveryBusy)return;
  if(!email.trim()){Alert.alert('Email required','Enter your recovery email first.');return}
  setRecoveryBusy(true);
  try{
   const {error}=await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase());
   if(error)throw error;
   Alert.alert('Check your inbox','If an account exists for that email, recovery instructions have been sent. Follow the link to reset your password.');
  }catch(e){Alert.alert('Recovery unavailable',e instanceof Error?e.message:'Try again')}
  finally{setRecoveryBusy(false)}
 }
 const field={height:44,borderWidth:1 as const,borderColor:colors.border,borderRadius:9,paddingHorizontal:12,fontSize:14,color:colors.text};
 return <Screen modal style={{gap:12}}>
  <Text style={{color:colors.text,fontFamily:'PlusJakartaSans_700Bold',fontSize:18}}>Recover your household</Text>
  <Text style={{color:colors.muted,fontSize:13,lineHeight:20}}>Sign in using an email that you previously verified and protected with a password. Your existing household membership will be restored.</Text>
  {unsafe?<Text style={{color:'#C94F4F',fontSize:13}}>This device already contains expenses or a household. Sign-in is disabled to prevent replacing an active identity. Protect your current account in Settings instead.</Text>:null}
  <TextInput accessibilityLabel="Account email" autoCapitalize="none" autoCorrect={false} keyboardType="email-address" placeholder="Recovery email" placeholderTextColor={colors.muted} value={email} onChangeText={setEmail} style={field}/>
  <TextInput accessibilityLabel="Account password" secureTextEntry autoCapitalize="none" placeholder="Password" placeholderTextColor={colors.muted} value={password} onChangeText={setPassword} style={field}/>
  <Pressable accessibilityRole="button" disabled={unsafe||busy} onPress={()=>void login()} style={{minHeight:44,borderRadius:10,backgroundColor:colors.household,alignItems:'center',justifyContent:'center',opacity:unsafe||busy?0.5:1}}>
   <Text style={{color:'#fff',fontFamily:'Inter_600SemiBold'}}>{busy?'Signing in…':'Sign in to existing account'}</Text>
  </Pressable>
  <Pressable accessibilityRole="button" disabled={recoveryBusy} onPress={()=>void resetPassword()} style={{padding:10,alignItems:'center'}}>
   <Text style={{color:colors.household,fontSize:13}}>{recoveryBusy?'Sending…':'Forgot password?'}</Text>
  </Pressable>
 </Screen>;
}
