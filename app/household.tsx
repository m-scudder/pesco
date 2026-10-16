import {fontSizes,fontFamilies,fontWeights} from '@/theme/typography';
import React,{useCallback,useEffect,useState} from 'react';
import {ActivityIndicator,Alert,Pressable,Share,Text,TextInput,View} from 'react-native';
import {Screen} from '@/components/Screen';
import {Body,Card} from '@/components/UI';
import {useAppTheme} from '@/theme/ThemeContext';
import {useAuth} from '@/lib/AuthContext';
import {useData} from '@/data';
import {createHousehold,createJoiningKey,getMyHousehold,joinWithKey,getHouseholdMembers,renameHousehold,removeHouseholdPartner,type Household,type HouseholdMember} from '@/lib/households';

const SIX=/^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{6}$/;
export default function HouseholdSetup(){
 const {colors}=useAppTheme();
 const {refresh:refreshExpenses}=useData();
 const {configured,ready,user,error:authError,retry}=useAuth();
 const [household,setHousehold]=useState<Household|null>(null);
 const [members,setMembers]=useState<HouseholdMember[]>([]);
 const [editingName,setEditingName]=useState(false);
 const [draftName,setDraftName]=useState('');
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
  try{const current=await getMyHousehold();setHousehold(current);setMembers(current?await getHouseholdMembers(current.id):[]);setDraftName(current?.name??'');setError(null)}
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
   <Text style={{color:primary?'#fff':colors.text,fontWeight:fontWeights.semibold,fontSize:fontSizes.body}}>{label}</Text>
  </Pressable>
 );
 const input={borderColor:colors.border,borderWidth:1 as const,borderRadius:9,paddingHorizontal:12,height:44,color:colors.text,fontSize:fontSizes.input};
 if(!configured)return <Screen modal style={{gap:12}}><Card><Body muted>Add the Supabase URL and publishable key to .env.</Body></Card></Screen>;
 if(!ready||loading)return <Screen modal style={{gap:12}}><ActivityIndicator/></Screen>;
 if(!user)return <Screen modal style={{gap:12}}><Card><Body muted>{authError||'Connection unavailable'}</Body>{action('Retry',()=>{void retry()})}</Card></Screen>;

 return <Screen modal style={{gap:12}}>
  <Text style={{color:colors.muted,fontSize:fontSizes.label,marginBottom:2}}>Share expenses with one partner</Text>
  {household?
   <>
    <Card>
     <View style={{gap:4}}>
      <Text style={{color:colors.muted,fontSize:fontSizes.caption}}>Your household</Text>
      <Text style={{color:colors.text,fontSize:fontSizes.title,fontWeight:fontWeights.bold}}>{household.name}</Text>
      <Text style={{color:colors.muted,fontSize:fontSizes.caption}}>{household.created_by===user.id?'You are the creator':'You are a member'}</Text>
     </View>
     {household.created_by===user.id?<>
      {editingName?<View style={{gap:10}}>
       <TextInput accessibilityLabel="Edit household name" value={draftName} onChangeText={setDraftName} maxLength={100} style={input}/>
       {action('Save Name',()=>void submit(async()=>{await renameHousehold(household.id,draftName);setEditingName(false)}),true,!draftName.trim()||draftName.trim()===household.name)}
       {action('Cancel',()=>{setEditingName(false);setDraftName(household.name)},false)}
      </View>:action('Edit household name',()=>setEditingName(true),false)}
     </>:null}
    </Card>
    <Card>
     <Text style={{color:colors.text,fontWeight:fontWeights.bold,fontSize:fontSizes.section}}>Members · {members.length}/2</Text>
     {members.map(member=><View key={member.user_id} style={{gap:5,paddingVertical:10,borderBottomWidth:1,borderColor:colors.border}}>
      <View style={{flexDirection:'row',justifyContent:'space-between',alignItems:'center',gap:8}}>
       <Text style={{flex:1,color:colors.text,fontSize:fontSizes.input,fontWeight:fontWeights.semibold}}>{member.display_name==='Member'?(member.user_id===user.id?'You':'Partner'):member.display_name}{member.user_id===user.id?' (You)':''}</Text>
       <Text style={{fontSize:fontSizes.caption,color:colors.muted}}>{member.is_owner?'Creator':'Partner'}</Text>
      </View>
      <Text style={{fontSize:fontSizes.caption,color:colors.muted}}>Joined {new Date(member.joined_at).toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric'})}</Text>
      {household.created_by===user.id&&!member.is_owner?(
       <Pressable accessibilityRole="button" onPress={()=>Alert.alert('Remove partner?', 'This will immediately revoke their access to this household and its shared expenses. Existing expenses will remain.',[
        {text:'Cancel',style:'cancel'},
        {text:'Remove',style:'destructive',onPress:()=>{void submit(()=>removeHouseholdPartner(household.id,member.user_id))}}
       ])} style={{paddingVertical:7,alignSelf:'flex-start'}}>
        <Text style={{color:'#C94F4F',fontSize:fontSizes.label,fontWeight:fontWeights.semibold}}>Remove Partner</Text>
       </Pressable>
      ):null}
     </View>)}
     {members.length===1?<Body muted>No partner has joined yet.</Body>:null}
    </Card>
    {household.created_by===user.id&&members.length<2?<Card>
     {action('Invite Partner',()=>{void submit(async()=>{const issued=await createJoiningKey(household.id);if(!SIX.test(issued))throw new Error('Server is not using 6-character keys');setInvite(issued)})})}
     {invite?<View style={{gap:9,alignItems:'center',paddingVertical:6}}>
      <Text selectable style={{fontSize:fontSizes.display,fontWeight:'800',letterSpacing:5,color:colors.text}}>{invite}</Text>
      <Body muted>Valid 24 hours · One use</Body>
      {action('Share Code',()=>{void Share.share({message:'Join my PESCO household. Code: '+invite})},false)}
     </View>:null}
    </Card>:null}
   </>
   :mode==='choose'?<Card>
    {action('Create Household',()=>setMode('create'))}
    {action('Join With Code',()=>setMode('join'),false)}
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
    <TextInput accessibilityLabel="Household joining code" value={key} onChangeText={v=>setKey(v.toUpperCase().replace(/[^A-Z2-9]/g,'').slice(0,6))} autoCapitalize="characters" autoCorrect={false} maxLength={6} placeholder="K7M2Q9" placeholderTextColor={colors.muted} style={{...input,fontSize:fontSizes.title,letterSpacing:4,textAlign:'center'}}/>
    {action('Join Household',()=>void submit(async()=>{const result=await joinWithKey(key);if(!result)throw new Error('Invalid, expired, or rate-limited code')}),true,!SIX.test(key))}
    {action('Back',()=>setMode('choose'),false)}
   </Card>}
  {error?<Text accessibilityRole="alert" style={{color:'#C94F4F',fontSize:fontSizes.label}}>{error}</Text>:null}
 </Screen>
}
