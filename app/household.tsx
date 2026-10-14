import React,{useCallback,useEffect,useState} from 'react';
import {ActivityIndicator,Alert,Pressable,Share,Text,TextInput,View} from 'react-native';
import {Screen} from '@/components/Screen';
import {Body,Card,Heading} from '@/components/UI';
import {useAppTheme} from '@/theme/ThemeContext';
import {useAuth} from '@/lib/AuthContext';
import {useData} from '@/data';
import {createHousehold,createJoiningKey,getMyHousehold,joinWithKey,type Household} from '@/lib/households';

const SIX=/^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{6}$/;
export default function HouseholdSetup(){
 const {colors}=useAppTheme();
 const {refresh:refreshExpenses}=useData();
 const {configured,ready,user,error:authError,retry}=useAuth();
 const [household,setHousehold]=useState<Household|null>(null);
 const [loading,setLoading]=useState(false);
 const [busy,setBusy]=useState(false);
 const [name,setName]=useState('Our Household');
 const [key,setKey]=useState('');
 const [invite,setInvite]=useState<string|null>(null);
 const [error,setError]=useState<string|null>(null);
 const [mode,setMode]=useState<'choose'|'create'|'join'>('choose');

 const refresh=useCallback(async()=>{
  if(!configured||!user)return;
  setLoading(true);
  try{setHousehold(await getMyHousehold());setError(null)}
  catch(e){setError(e instanceof Error?e.message:'Could not load household')}
  finally{setLoading(false)}
 },[configured,user?.id]);
 useEffect(()=>{void refresh()},[refresh]);

 async function submit(action:()=>Promise<void>){
  if(busy)return;
  setBusy(true);setError(null);
  try{await action();await refresh();await refreshExpenses()}
  catch(e){setError(e instanceof Error?e.message:'Try again')}
  finally{setBusy(false)}
 }
 const action=(label:string,press:()=>void,primary=true,disabled=false)=>(
  <Pressable accessibilityRole="button" disabled={busy||disabled} onPress={press}
   style={{borderRadius:10,minHeight:42,paddingHorizontal:14,alignItems:'center',justifyContent:'center',backgroundColor:primary?colors.household:colors.secondary,opacity:busy||disabled?0.5:1}}>
   <Text style={{color:primary?'#fff':colors.text,fontWeight:'600',fontSize:14}}>{label}</Text>
  </Pressable>
 );
 const input={borderColor:colors.border,borderWidth:1 as const,borderRadius:9,paddingHorizontal:12,height:44,color:colors.text,fontSize:15};
 if(!configured)return <Screen><Heading>Household</Heading><Card><Body muted>Add the Supabase URL and publishable key to .env.</Body></Card></Screen>;
 if(!ready||loading)return <Screen><Heading>Household</Heading><ActivityIndicator/></Screen>;
 if(!user)return <Screen><Heading>Household</Heading><Card><Body muted>{authError||'Connection unavailable'}</Body>{action('Retry',()=>{void retry()})}</Card></Screen>;

 return <Screen>
  <Heading subtitle="Share expenses with one partner">Household</Heading>
  {household?
   <Card>
    <View style={{flexDirection:'row',justifyContent:'space-between',alignItems:'center'}}>
     <View style={{flex:1}}><Text style={{color:colors.text,fontSize:18,fontWeight:'700'}}>{household.name}</Text><Text style={{color:colors.muted,fontSize:12}}>Household active</Text></View>
    </View>
    {household.created_by===user.id?<>
     {action('Invite partner',()=>{void submit(async()=>{const issued=await createJoiningKey(household.id);if(!SIX.test(issued))throw new Error('Server is not using 6-character keys');setInvite(issued)})})}
     {invite?<View style={{gap:9,alignItems:'center',paddingVertical:6}}>
      <Text selectable style={{fontSize:30,fontWeight:'800',letterSpacing:5,color:colors.text}}>{invite}</Text>
      <Body muted>Valid 24 hours · One use</Body>
      {action('Share code',()=>{void Share.share({message:'Join my PESCO household. Code: '+invite})},false)}
     </View>:null}
    </>:<Body muted>You're a member of this household.</Body>}
   </Card>
   :mode==='choose'?<Card>
    {action('Create household',()=>setMode('create'))}
    {action('Join with code',()=>setMode('join'),false)}
    <Body muted>Personal expenses work without a household.</Body>
   </Card>
   :mode==='create'?<Card>
    <Body>Household name</Body>
    <TextInput accessibilityLabel="Household name" value={name} onChangeText={setName} maxLength={100} style={input}/>
    {action('Create',()=>void submit(async()=>{if(!name.trim())throw new Error('Enter a household name');await createHousehold(name.trim())}),true,!name.trim())}
    {action('Back',()=>setMode('choose'),false)}
   </Card>
   :<Card>
    <Body>6-character code</Body>
    <TextInput accessibilityLabel="Household joining code" value={key} onChangeText={v=>setKey(v.toUpperCase().replace(/[^A-Z2-9]/g,'').slice(0,6))} autoCapitalize="characters" autoCorrect={false} maxLength={6} placeholder="K7M2Q9" placeholderTextColor={colors.muted} style={{...input,fontSize:22,letterSpacing:4,textAlign:'center'}}/>
    {action('Join household',()=>void submit(async()=>{const result=await joinWithKey(key);if(!result)throw new Error('Invalid, expired, or rate-limited code')}),true,!SIX.test(key))}
    {action('Back',()=>setMode('choose'),false)}
   </Card>}
  {error?<Text accessibilityRole="alert" style={{color:'#C94F4F',fontSize:13}}>{error}</Text>:null}
 </Screen>
}
