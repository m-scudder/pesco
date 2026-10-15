import React,{useState} from 'react';
import {ActivityIndicator,Pressable,Text,TextInput,View} from 'react-native';
import {useRouter} from 'expo-router';
import {Screen} from '@/components/Screen';
import {Card,Heading,Body} from '@/components/UI';
import {useAuth} from '@/lib/AuthContext';
import {useData} from '@/data';
import {useOnboarding} from '@/lib/OnboardingContext';
import {useAppTheme} from '@/theme/ThemeContext';
import {createHousehold,joinWithKey} from '@/lib/households';

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
 return <Screen style={{justifyContent:'center',paddingBottom:44}}>
  <Heading subtitle="Household expenses, together">PESCO</Heading>
  {mode==='choose'?<Card>
   {button('Create household',()=>{setError(null);setMode('create')})}
   {button('Join with code',()=>{setError(null);setMode('join')},false)}
   {button('Continue with Google',()=>router.push('/sign-in'),false)}
   <Pressable accessibilityRole="button" onPress={()=>void submit(async()=>{})} style={{alignItems:'center',paddingVertical:10}}>
    <Text style={{color:colors.muted,fontSize:13}}>Continue without household</Text>
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
