import {fontSizes,fontFamilies,fontWeights} from '@/theme/typography';
import React,{useEffect,useState} from 'react';
import {ActivityIndicator,Image,Platform,Pressable,Text,TextInput,View} from 'react-native';
import {useRouter} from 'expo-router';
import {Screen} from '@/components/Screen';
import {Card,Heading,Body} from '@/components/UI';
import {useAuth} from '@/lib/AuthContext';
import {useData} from '@/data';
import {useOnboarding} from '@/lib/OnboardingContext';
import {useAppTheme} from '@/theme/ThemeContext';
import {createHousehold,getMyHousehold,joinWithKey} from '@/lib/households';
import {googleAuth} from '@/lib/googleAuth';
import {nativeAppleSignIn} from '@/lib/nativeAppleAuth';
import * as AppleAuthentication from 'expo-apple-authentication';
import {GoogleSignInButton} from '@/components/GoogleSignInButton';

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
 const authenticated=!!user&&!user.is_anonymous&&!!user.identities?.some(i=>i.provider==='google'||i.provider==='apple');
 useEffect(()=>{if(!authenticated)return;let active=true;
  void getMyHousehold().then(existing=>{if(active&&existing)void finish().then(()=>router.replace('/(tabs)'))}).catch(()=>{});
  return()=>{active=false};
 },[authenticated,user?.id]);
 const inputStyle={borderWidth:1 as const,borderColor:colors.border,borderRadius:9,height:44,paddingHorizontal:12,color:colors.text,fontSize:fontSizes.input};

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
   <Text style={{color:primary?'#fff':colors.text,fontSize:fontSizes.body,fontWeight:fontWeights.semibold}}>{label}</Text>
  </Pressable>
 );
 return <Screen style={{flexGrow:1,justifyContent:authenticated?'center':'space-between',paddingBottom:24,gap:22}}>
  <View style={{alignItems:'center',justifyContent:'center',gap:14,...(!authenticated?{flexGrow:1}:{} )}}>
   <Image source={require('../assets/icon.png')} accessibilityLabel="PESCO app logo" resizeMode="contain" style={{width:92,height:92,borderRadius:22}}/>
   <Text style={{color:colors.muted,fontSize:fontSizes.body,fontFamily:fontFamilies.regular,textAlign:'center'}}>Household expenses, together</Text>
  </View>
  {!authenticated?<View style={{paddingHorizontal:0,gap:14,paddingBottom:6}}>
   {Platform.OS==='android'?<GoogleSignInButton disabled={!configured||!ready||signingIn} loading={signingIn} onPress={()=>{void (async()=>{
    setSigningIn(true);setError(null);
    try{await googleAuth(user?'link':'sign-in')}
    catch(e){setError(e instanceof Error?e.message:'Google sign-in failed')}
    finally{setSigningIn(false)}
   })()}}/>:null}
   {Platform.OS==='ios'?<View style={{opacity:!configured||!ready||signingIn?0.55:1}}>
    <AppleAuthentication.AppleAuthenticationButton
     buttonType={AppleAuthentication.AppleAuthenticationButtonType.CONTINUE}
     buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
     cornerRadius={5}
     style={{height:52,width:'100%'}}
     onPress={()=>{if(signingIn||!configured||!ready)return;void (async()=>{
      setSigningIn(true);setError(null);
      try{await nativeAppleSignIn()}
      catch(e){setError(e instanceof Error?e.message:'Apple sign-in failed')}
      finally{setSigningIn(false)}
     })()}}
    />
   </View>:null}
   {!configured?<Text style={{color:'#C94F4F',textAlign:'center'}}>Cloud authentication is not configured.</Text>:null}
  </View>:mode==='choose'?<Card>
   <Text style={{fontSize:fontSizes.body,fontFamily:fontFamilies.semibold,color:colors.text,textAlign:'center',marginBottom:4}}>Set up your household</Text>
   {button('Create Household',()=>{setError(null);setMode('create')})}
   {button('Join With Code',()=>{setError(null);setMode('join')},false)}
   <Pressable accessibilityRole="button" onPress={()=>void submit(async()=>{})} style={{alignItems:'center',paddingVertical:10}}>
    <Text style={{color:colors.muted,fontSize:fontSizes.label}}>Use Personal Expenses Only</Text>
   </Pressable>
  </Card>:<Card>
   <View style={{flexDirection:'row',alignItems:'center',justifyContent:'space-between'}}>
    <Body>{mode==='join'?'Join Household':'Create Household'}</Body>
    <Pressable onPress={()=>{setError(null);setMode('choose')}}><Text style={{color:colors.muted,fontSize:fontSizes.label}}>Back</Text></Pressable>
   </View>
   {mode==='create'?
    <TextInput accessibilityLabel="Household name" value={name} onChangeText={setName} maxLength={100} style={inputStyle} placeholder="Household name" placeholderTextColor={colors.muted}/>:
    <TextInput accessibilityLabel="Six-character joining code" value={code} onChangeText={v=>setCode(v.toUpperCase().replace(/[^A-Z2-9]/g,'').slice(0,6))} maxLength={6} autoCapitalize="characters" autoCorrect={false} placeholder="K7M2Q9" placeholderTextColor={colors.muted} style={{...inputStyle,textAlign:'center',letterSpacing:4,fontSize:fontSizes.title}}/>
   }
   {!configured?<Body muted>Supabase is not configured. Add your URL and publishable key to .env.</Body>:
    !ready?<ActivityIndicator/>:
    !user?<View style={{gap:8}}><Body muted>{authError||'Unable to sign in'}</Body>{button('Retry Connection',()=>{void retry()},false)}</View>:
    mode==='create'?button('Create',()=>void submit(async()=>{if(!name.trim())throw new Error('Enter a household name');await createHousehold(name.trim())}),true,!name.trim()):
    button('Join',()=>void submit(async()=>{const joined=await joinWithKey(code);if(!joined)throw new Error('Invalid, expired or rate-limited code')}),true,!VALID_CODE.test(code))
   }
  </Card>}
  {error?<Text accessibilityRole="alert" style={{fontSize:fontSizes.label,color:'#C94F4F'}}>{error}</Text>:null}
 </Screen>
}
