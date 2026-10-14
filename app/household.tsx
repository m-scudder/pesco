import React,{useCallback,useEffect,useState} from 'react';
import {ActivityIndicator,Alert,Pressable,Share,Text,TextInput,View} from 'react-native';
import {Screen} from '@/components/Screen';
import {Body,Card,Heading} from '@/components/UI';
import {useAppTheme} from '@/theme/ThemeContext';
import {useAuth} from '@/lib/AuthContext';
import {createHousehold,createJoiningKey,getMyHousehold,joinWithKey,type Household} from '@/lib/households';

export default function HouseholdSetup(){
 const {colors}=useAppTheme();const {configured,ready,user,error:authError,retry}=useAuth();
 const [household,setHousehold]=useState<Household|null>(null);
 const [loading,setLoading]=useState(false);const [busy,setBusy]=useState(false);
 const [name,setName]=useState('Our Household');const [joinKey,setJoinKey]=useState('');
 const [invite,setInvite]=useState<string|null>(null);
 const [message,setMessage]=useState<string|null>(null);
 const refresh=useCallback(async()=>{
  if(!configured||!user)return;
  setLoading(true);
  try{setHousehold(await getMyHousehold())}catch(e){setMessage(e instanceof Error?e.message:String(e))}
  finally{setLoading(false)}
 },[configured,user?.id]);
 useEffect(()=>{refresh()},[refresh]);
 async function run(action:()=>Promise<void>){
  if(busy)return;
  setBusy(true);setMessage(null);
  try{await action();await refresh()}catch(e){Alert.alert('Could not continue',e instanceof Error?e.message:String(e))}
  finally{setBusy(false)}
 }
 const button=(label:string,onPress:()=>void,primary=true)=><Pressable accessibilityRole="button" disabled={busy||loading} onPress={onPress} style={{padding:15,borderRadius:12,alignItems:'center',backgroundColor:primary?colors.household:colors.secondary,opacity:busy?0.6:1}}><Text style={{color:primary?'#fff':colors.text,fontWeight:'700'}}>{label}</Text></Pressable>;
 const inputStyle={borderColor:colors.border,borderWidth:1 as const,borderRadius:12,padding:13,color:colors.text,fontSize:16};
 if(!configured)return <Screen><Heading>Household setup</Heading><Card><Body muted>Cloud setup is not connected on this device. Add your Supabase project URL and publishable key to .env, then restart Expo.</Body></Card></Screen>;
 if(!ready)return <Screen><Heading>Household setup</Heading><ActivityIndicator/></Screen>;
 if(!user)return <Screen><Heading>Household setup</Heading><Card><Body muted>Unable to establish a private anonymous account. Enable Anonymous Sign-Ins in Supabase Authentication, and check your connection.</Body>{authError?<Body muted>{authError}</Body>:null}{button('Try again',()=>{void retry()})}</Card></Screen>;
 return <Screen>
  <Heading subtitle="Connect with one partner, without email or password">Household</Heading>
  <Card><Body muted>Your PESCO account is active on this device. You can keep using Personal expenses without joining a household.</Body></Card>
  {loading?<ActivityIndicator/>:household?
   <Card><Heading subtitle="Household created or joined">{household.name}</Heading><Body muted>Members can view shared cloud expenses once synchronization is enabled. Your existing local entries are not uploaded automatically.</Body>
    {household.created_by===user.id?<>{button('Generate joining key',()=>void run(async()=>setInvite(await createJoiningKey(household.id))))}{invite?<View style={{gap:10,alignItems:'center',paddingVertical:12}}><Body muted>One-time joining key · Valid for 24 hours</Body><Text selectable style={{color:colors.text,fontSize:22,fontWeight:'800',textAlign:'center'}}>{invite}</Text>{button('Share key',()=>{void Share.share({message:'Join my PESCO household with this one-time key: '+invite})},false)}<Body muted>Creating another key invalidates the previous unused key.</Body></View>:null}</>:<Body muted>You have joined this household. Ask its creator for any membership changes.</Body>}</Card>
   :<><Card><Heading subtitle="Start a shared household">Create household</Heading><TextInput value={name} onChangeText={setName} placeholder="Household name" placeholderTextColor={colors.muted} maxLength={100} style={inputStyle}/>{button('Create household',()=>void run(async()=>{await createHousehold(name)}))}</Card>
   <Card><Heading subtitle="Enter the key shared by your partner">Join household</Heading><TextInput autoCapitalize="characters" autoCorrect={false} value={joinKey} onChangeText={setJoinKey} placeholder="K7M2Q9" maxLength={6} placeholderTextColor={colors.muted} style={inputStyle}/>{button('Join using key',()=>void run(async()=>{await joinWithKey(joinKey)}))}</Card></>}
  {message?<Body muted>{message}</Body>:null}
  <Body muted>Keep this device's session: losing or reinstalling the app may permanently lose access until account recovery is implemented.</Body>
 </Screen>
}
