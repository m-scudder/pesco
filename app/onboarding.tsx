import React,{useEffect,useState} from 'react';
import {ActivityIndicator,Pressable,Text,TextInput,View} from 'react-native';
import {Ionicons} from '@expo/vector-icons';
import {useRouter} from 'expo-router';
import {Screen} from '@/components/Screen';
import {Card,Heading,Body} from '@/components/UI';
import {useAuth} from '@/lib/AuthContext';
import {useData} from '@/data';
import {useOnboarding} from '@/lib/OnboardingContext';
import {useAppTheme} from '@/theme/ThemeContext';
import {createHousehold,getMyHousehold,joinWithKey} from '@/lib/households';
import {googleAuth} from '@/lib/googleAuth';

const VALID_CODE=/^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{6}$/;
type Mode='choose'|'create'|'join';

export default function Onboarding(){
 const router=useRouter();
 const {colors}=useAppTheme();
 const {refresh:refreshExpenses}=useData();
 const {configured,ready,user,error:authError,retry}=useAuth();
 const {finish}=useOnboarding();
 const [mode,setMode]=useState<Mode>('choose');
 const [name,setName]=useState('Our Household');
 const [code,setCode]=useState('');
 const [busy,setBusy]=useState(false);
 const [error,setError]=useState<string|null>(null);
 const [signingIn,setSigningIn]=useState(false);
 const authenticated=!!user&&!user.is_anonymous;
 useEffect(()=>{if(!authenticated)return;let active=true;
  void getMyHousehold().then(existing=>{if(active&&existing)void finish().then(()=>router.replace('/(tabs)'))}).catch(()=>{});
  return()=>{active=false};
 },[authenticated,user?.id]);
 const inputStyle={borderWidth:1 as const,borderColor:colors.border,borderRadius:9,height:44,paddingHorizontal:12,color:colors.text,fontSize:15};

 async function finishAndOpen(){
  await finish();
  router.replace('/(tabs)');
 }
 async function submit(action:()=>Promise<void>){
  if(busy)return;
  setBusy(true);setError(null);
  try{await action();await refreshExpenses();await finishAndOpen()}
  catch(e){setError(e instanceof Error?e.message:'Please try again')}
  finally{setBusy(false)}
 }
 const button=(label:string,onPress:()=>void,primary=true,disabled=false)=>(
  <Pressable accessibilityRole="button" disabled={busy||disabled} onPress={onPress}
   style={{minHeight:44,alignItems:'center',justifyContent:'center',borderRadius:10,paddingHorizontal:12,backgroundColor:primary?colors.household:colors.secondary,opacity:busy||disabled?0.45:1}}>
   <Text style={{color:primary?'#fff':colors.text,fontSize:14,fontWeight:'600'}}>{label}</Text>
  </Pressable>
 );
 return <Screen style={{justifyContent:'center',paddingBottom:44,gap:18}}>
  <View style={{alignItems:'center',gap:6,paddingTop:40}}><Heading subtitle="Your expenses, together">PESCO</Heading></View>
  {!authenticated?<View style={{borderRadius:16,padding:20,backgroundColor:colors.surface,borderWidth:1,borderColor:colors.border,gap:14}}>
   <Text style={{color:colors.text,fontSize:20,fontFamily:'PlusJakartaSans_700Bold',textAlign:'center'}}>Welcome to PESCO</Text>
   <Text style={{color:colors.muted,textAlign:'center',fontSize:13,lineHeight:20}}>Track your personal and household spending in one simple place.</Text>
   <Pressable accessibilityRole="button" disabled={signingIn||!configured||!ready} onPress={()=>{void (async()=>{setSigningIn(true);setError(null);try{await googleAuth(user?.is_anonymous?'link':'sign-in')}catch(e){setError(e instanceof Error?e.message:'Google sign-in failed')}finally{setSigningIn(false)}})()}} style={{minHeight:50,borderRadius:10,backgroundColor:colors.surface,borderWidth:1,borderColor:colors.border,flexDirection:'row',gap:12,alignItems:'center',justifyContent:'center',opacity:signingIn?0.6:1}}><Ionicons name="logo-google" size={20} color="#4285F4"/><Text style={{color:colors.text,fontSize:15,fontFamily:'Inter_600SemiBold'}}>{signingIn?'Connecting…':'Continue with Google'}</Text></Pressable>
   <Text style={{color:colors.muted,textAlign:'center',fontSize:11}}>Sign in securely to continue. Existing PESCO accounts keep their household data.</Text>
   {!configured?<Text style={{color:'#C94F4F'}}>Cloud authentication is not configured.</Text>:null}
  </View>:mode==='choose'?<Card>
   <Text style={{fontSize:14,fontFamily:'Inter_600SemiBold',color:colors.text,textAlign:'center',marginBottom:4}}>Set up your household</Text>
   {button('Create household',()=>{setError(null);setMode('create')})}
   {button('Join with code',()=>{setError(null);setMode('join')},false)}
   <Pressable accessibilityRole="button" onPress={()=>void submit(async()=>{})} style={{alignItems:'center',paddingVertical:10}}>
    <Text style={{color:colors.muted,fontSize:13}}>Use personal expenses only</Text>
   </Pressable>
  </Card>:<Card>
   <View style={{flexDirection:'row',alignItems:'center',justifyContent:'space-between'}}>
    <Body>{mode==='join'?'Join household':'Create household'}</Body>
    <Pressable onPress={()=>{setError(null);setMode('choose')}}><Text style={{color:colors.muted,fontSize:13}}>Back</Text></Pressable>
   </View>
   {mode==='create'?
    <TextInput accessibilityLabel="Household name" value={name} onChangeText={setName} maxLength={100} style={inputStyle} placeholder="Household name" placeholderTextColor={colors.muted}/>:
    <TextInput accessibilityLabel="Six-character joining code" value={code} onChangeText={v=>setCode(v.toUpperCase().replace(/[^A-Z2-9]/g,'').slice(0,6))} maxLength={6} autoCapitalize="characters" autoCorrect={false} placeholder="K7M2Q9" placeholderTextColor={colors.muted} style={{...inputStyle,textAlign:'center',letterSpacing:4,fontSize:22}}/>
   }
   {!configured?<Body muted>Supabase is not configured. Add your URL and publishable key to .env.</Body>:
    !ready?<ActivityIndicator/>:
    !user?<View style={{gap:8}}><Body muted>{authError||'Unable to sign in'}</Body>{button('Retry connection',()=>{void retry()},false)}</View>:
    mode==='create'?button('Create',()=>void submit(async()=>{if(!name.trim())throw new Error('Enter a household name');await createHousehold(name.trim())}),true,!name.trim()):
    button('Join',()=>void submit(async()=>{const joined=await joinWithKey(code);if(!joined)throw new Error('Invalid, expired or rate-limited code')}),true,!VALID_CODE.test(code))
   }
  </Card>}
  {error?<Text accessibilityRole="alert" style={{fontSize:13,color:'#C94F4F'}}>{error}</Text>:null}
 </Screen>
}
