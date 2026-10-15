import React,{useState} from 'react';
import {Alert,Pressable,Text,TextInput,View} from 'react-native';
import {Screen} from '@/components/Screen';
import {useAppTheme} from '@/theme/ThemeContext';
import {useAuth} from '@/lib/AuthContext';
import {supabase} from '@/lib/supabase';

export default function AccountSecurity(){
 const {colors}=useAppTheme();
 const {user}=useAuth();
 const [email,setEmail]=useState('');
 const [code,setCode]=useState('');
 const [password,setPassword]=useState('');
 const [busy,setBusy]=useState(false);
 const [notice,setNotice]=useState('');
 const anonymous=user?.is_anonymous!==false;
 const verified=!anonymous&&!!user?.email_confirmed_at;
 async function run(action:()=>Promise<void>){
  if(busy)return;
  setBusy(true);setNotice('');
  try{await action()}catch(e){Alert.alert('Account security',e instanceof Error?e.message:'Please try again')}
  finally{setBusy(false)}
 }
 const sendEmail=()=>run(async()=>{
  if(!supabase||!user)throw new Error('Sign in to continue');
  const clean=email.trim().toLowerCase();
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean))throw new Error('Enter a valid email address');
  const {error}=await supabase.auth.updateUser({email:clean});
  if(error)throw error;
  setNotice('Check your inbox for a confirmation link or verification code. Keep this app installed until verification is complete.');
 });
 const verifyCode=()=>run(async()=>{
  if(!supabase)throw new Error('Sign in to continue');
  const clean=email.trim().toLowerCase();
  if(!/^\d{6,8}$/.test(code.trim()))throw new Error('Enter the verification code from your email');
  const {error}=await supabase.auth.verifyOtp({email:clean,token:code.trim(),type:'email_change'});
  if(error)throw error;
  setNotice('Email verified. You can now set an account password.');
 });
 const setAccountPassword=()=>run(async()=>{
  if(!supabase||!user||!verified)throw new Error('Verify your email first');
  if(password.length<12)throw new Error('Use a password of at least 12 characters');
  const {error}=await supabase.auth.updateUser({password});
  if(error)throw error;
  setPassword('');
  setNotice('Password updated. You can use your verified email and password to recover access on another device.');
 });
 const field={borderWidth:1 as const,borderColor:colors.border,borderRadius:9,paddingHorizontal:12,height:44,color:colors.text,backgroundColor:colors.surface,fontSize:14};
 const button=(label:string,click:()=>void,disabled=false)=><Pressable accessibilityRole="button" disabled={disabled||busy} onPress={click} style={{backgroundColor:colors.household,borderRadius:9,minHeight:43,alignItems:'center',justifyContent:'center',opacity:disabled||busy?0.5:1}}><Text style={{color:'#fff',fontFamily:'Inter_600SemiBold',fontSize:13}}>{busy?'Please wait…':label}</Text></Pressable>;
 return <Screen modal style={{gap:13}}>
  <Text style={{color:colors.text,fontFamily:'PlusJakartaSans_700Bold',fontSize:18}}>Account recovery</Text>
  <Text style={{color:colors.muted,fontSize:13,lineHeight:19}}>Keep your existing household identity when changing or reinstalling devices. Attach a verified email before setting a password.</Text>
  <View style={{backgroundColor:colors.surface,borderColor:colors.border,borderWidth:1,borderRadius:12,padding:13,gap:11}}>
   <Text style={{color:colors.text,fontFamily:'Inter_600SemiBold',fontSize:14}}>{verified?'Email verified':anonymous?'Unprotected anonymous account':'Email confirmation pending'}</Text>
   {user?.email?<Text style={{color:colors.muted,fontSize:12}}>{user.email}</Text>:null}
   {!verified?<><TextInput accessibilityLabel="Recovery email" keyboardType="email-address" autoCapitalize="none" autoCorrect={false} placeholder="Email address" placeholderTextColor={colors.muted} value={email} onChangeText={setEmail} style={field}/>
    {button('Send verification email',sendEmail)}
    <TextInput accessibilityLabel="Email verification code" keyboardType="number-pad" placeholder="Verification code (optional)" placeholderTextColor={colors.muted} value={code} onChangeText={setCode} style={field}/>
    {button('Verify email code',verifyCode)}
    <Text style={{color:colors.muted,fontSize:12,lineHeight:17}}>If you received a confirmation link instead, open it first, then return here. Do not sign out or uninstall before recovery is set up.</Text>
   </>:null}
   {verified?<><TextInput accessibilityLabel="New account password" secureTextEntry autoCapitalize="none" autoCorrect={false} placeholder="Password (12+ characters)" placeholderTextColor={colors.muted} value={password} onChangeText={setPassword} style={field}/>
    {button('Set recovery password',setAccountPassword)}
   </>:null}
   {notice?<Text style={{color:colors.household,fontSize:12,lineHeight:18}}>{notice}</Text>:null}
  </View>
 </Screen>;
}
