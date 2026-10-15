import React,{useState} from 'react';
import {Alert,Pressable,Text,View} from 'react-native';
import {Screen} from '@/components/Screen';
import {useAppTheme} from '@/theme/ThemeContext';
import {useAuth} from '@/lib/AuthContext';
import {googleAuth} from '@/lib/googleAuth';

export default function AccountSecurity(){
 const {colors}=useAppTheme();
 const {user}=useAuth();
 const [busy,setBusy]=useState(false);
 const [linked,setLinked]=useState(false);
 const googleLinked=linked||user?.identities?.some(identity=>identity.provider==='google');
 async function connect(){
  if(busy)return;
  setBusy(true);
  try{
   const success=await googleAuth('link');
   if(success){setLinked(true);Alert.alert('Google connected','Your household identity is protected with Google sign-in. Your existing expenses remain connected to this account.')}
  }catch(e){Alert.alert('Could not connect Google',e instanceof Error?e.message:'Try again')}
  finally{setBusy(false)}
 }
 return <Screen modal style={{gap:14}}>
  <Text style={{color:colors.text,fontFamily:'PlusJakartaSans_700Bold',fontSize:18}}>Account recovery</Text>
  <Text style={{color:colors.muted,fontSize:13,lineHeight:19}}>Connect a Google account to recover your household on a new phone without an email or password.</Text>
  <View style={{padding:14,borderWidth:1,borderColor:colors.border,borderRadius:12,backgroundColor:colors.surface,gap:12}}>
   <Text style={{fontSize:14,color:colors.text,fontFamily:'Inter_600SemiBold'}}>{googleLinked?'Google account connected':'Protect your account'}</Text>
   {user?.email?<Text style={{color:colors.muted,fontSize:12}}>{user.email}</Text>:null}
   <Pressable accessibilityRole="button" disabled={busy||googleLinked} onPress={()=>void connect()} style={{minHeight:46,borderRadius:10,backgroundColor:googleLinked?colors.secondary:colors.household,alignItems:'center',justifyContent:'center',opacity:busy?0.6:1}}>
    <Text style={{fontSize:14,fontFamily:'Inter_600SemiBold',color:googleLinked?colors.text:'#fff'}}>{busy?'Connecting…':googleLinked?'Google connected':'Continue with Google'}</Text>
   </Pressable>
   <Text style={{color:colors.muted,fontSize:12,lineHeight:18}}>Linking uses your existing PESCO identity. Do not uninstall or sign out until Google is connected successfully.</Text>
  </View>
 </Screen>;
}
