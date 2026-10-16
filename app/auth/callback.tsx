import React,{useEffect,useState} from 'react';
import {ActivityIndicator,Text,View} from 'react-native';
import * as Linking from 'expo-linking';
import {useLocalSearchParams,useRouter} from 'expo-router';
import {completeGoogleSignIn} from '@/lib/googleAuth';
import {useAppTheme} from '@/theme/ThemeContext';

export default function GoogleAuthCallback(){
 const router=useRouter();
 const {colors}=useAppTheme();
 const url=Linking.useURL();
 const params=useLocalSearchParams();
 const [error,setError]=useState<string|null>(null);
 useEffect(()=>{
  let active=true;
  const fallback=new URLSearchParams();
  for(const key of ['code','access_token','refresh_token','error','error_description'] as const){
   const value=params[key];
   if(typeof value==='string')fallback.set(key,value);
  }
  const callbackUrl=url?.startsWith('pesco://auth/callback')?url:
   fallback.size?'pesco://auth/callback?'+fallback.toString():null;
  if(!callbackUrl)return;
  void completeGoogleSignIn(callbackUrl).then(()=>{
   if(active)router.replace('/onboarding');
  }).catch(e=>{
   if(active)setError(e instanceof Error?e.message:'Unable to complete Google sign-in');
  });
  return()=>{active=false};
 },[url,params.code,params.access_token,params.refresh_token,params.error,params.error_description]);
 return <View style={{flex:1,justifyContent:'center',alignItems:'center',gap:12,padding:24,backgroundColor:colors.background}}>
  {error?<Text accessibilityRole="alert" style={{color:colors.text,textAlign:'center'}}>{error}</Text>:<>
   <ActivityIndicator color={colors.household}/>
   <Text style={{color:colors.muted}}>Completing sign-in…</Text>
  </>}
 </View>;
}
