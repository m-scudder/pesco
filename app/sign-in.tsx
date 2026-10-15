import React,{useState} from 'react';
import {Alert,Pressable,Text} from 'react-native';
import {useRouter} from 'expo-router';
import {Screen} from '@/components/Screen';
import {useAppTheme} from '@/theme/ThemeContext';
import {useData} from '@/data';
import {useOnboarding} from '@/lib/OnboardingContext';
import {googleAuth} from '@/lib/googleAuth';

export default function SignIn(){
 const {colors}=useAppTheme();
 const router=useRouter();
 const {household,expenses,pendingEntries,pendingMutations}=useData();
 const {finish}=useOnboarding();
 const [busy,setBusy]=useState(false);
 const unsafe=!!household||pendingEntries.length>0||pendingMutations.length>0||
  expenses.some(e=>!e.id.startsWith('demo:'));
 async function login(){
  if(unsafe||busy)return;
  setBusy(true);
  try{
   const success=await googleAuth('sign-in');
   if(success){
    await finish();
    router.replace('/(tabs)');
   }
  }catch(e){Alert.alert('Google sign-in failed',e instanceof Error?e.message:'Try again')}
  finally{setBusy(false)}
 }
 return <Screen modal style={{gap:13}}>
  <Text style={{color:colors.text,fontFamily:'PlusJakartaSans_700Bold',fontSize:18}}>Recover your household</Text>
  <Text style={{color:colors.muted,fontSize:13,lineHeight:20}}>Use the same Google account you previously connected to PESCO. Household expenses and membership will be restored.</Text>
  {unsafe?<Text style={{color:'#C94F4F',fontSize:13}}>This device already contains expenses or a household. To protect that identity, connect Google through Settings → Account recovery rather than switching accounts.</Text>:null}
  <Pressable accessibilityRole="button" disabled={unsafe||busy} onPress={()=>void login()} style={{minHeight:46,borderRadius:10,backgroundColor:colors.household,alignItems:'center',justifyContent:'center',opacity:unsafe||busy?0.5:1}}>
   <Text style={{color:'#fff',fontFamily:'Inter_600SemiBold',fontSize:14}}>{busy?'Connecting…':'Continue with Google'}</Text>
  </Pressable>
 </Screen>;
}
