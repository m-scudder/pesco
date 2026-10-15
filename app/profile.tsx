import React,{useCallback,useState} from 'react';
import {ActivityIndicator,Alert,Pressable,Text,TextInput,View} from 'react-native';
import {useFocusEffect,useRouter} from 'expo-router';
import {Screen} from '@/components/Screen';
import {useAppTheme} from '@/theme/ThemeContext';
import {useAuth} from '@/lib/AuthContext';
import {supabase} from '@/lib/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {useData} from '@/data';
import {googleDisplayName} from '@/lib/profileName';

export default function Profile(){
 const {colors}=useAppTheme();
 const router=useRouter();
 const {pendingCount,pendingEditCount,expenses,recurringRules,budgets,clearAll}=useData();
 const {user,ready}=useAuth();
 const googleName=googleDisplayName(user);
 const [name,setName]=useState('');
 const [initial,setInitial]=useState('');
 const [busy,setBusy]=useState(false);
 const [loading,setLoading]=useState(true);
 const [error,setError]=useState<string|null>(null);
 const [deleting,setDeleting]=useState(false);
 const [loggingOut,setLoggingOut]=useState(false);
 const load=useCallback(async()=>{
  if(!ready)return;
  if(!supabase||!user){setLoading(false);return}
  setLoading(true);
  try{
   const {data,error:readError}=await supabase.from('profiles').select('display_name').eq('id',user.id).maybeSingle();
   if(readError)throw readError;
   const current=data?.display_name?.trim()??'';
   const nickname=current&&current!=='Member'&&current!==googleDisplayName(user)?current:'';
   setName(nickname);setInitial(nickname);setError(null);
  }catch(e){setError(e instanceof Error?e.message:'Unable to load profile')}
  finally{setLoading(false)}
 },[ready,user?.id]);
 useFocusEffect(useCallback(()=>{void load()},[load]));
 const save=async()=>{
  if(!supabase||!user)return;
  const clean=name.trim().replace(/\s+/g,' ');
  if(clean.length>80){Alert.alert('Invalid nickname','Use up to 80 characters.');return}
  setBusy(true);
  try{
   const {error:saveError}=await supabase.from('profiles').upsert({id:user.id,display_name:clean||googleName},{onConflict:'id'});
   if(saveError)throw saveError;
   setName(clean);setInitial(clean);
   Alert.alert('Saved',clean?'Your nickname will be shown to your household.':'Your Google name will be shown to your household.');
  }catch(e){Alert.alert('Could not save',e instanceof Error?e.message:'Try again')}
  finally{setBusy(false)}
 };
 const logout=()=>{
  if(loggingOut||deleting||busy)return;
  if(pendingCount+pendingEditCount>0){
   Alert.alert('Unsynced changes','Please sync or discard pending household changes before logging out.');
   return;
  }
  const hasLocalData=expenses.some(x=>x.scope==='personal'||(x.scope==='household'&&x.ownerId==='local-user'))||
   recurringRules.length>0||budgets.household!==null||budgets.personal!==null;
  Alert.alert('Log out of PESCO?',hasLocalData
   ?'Personal expenses, local budgets and recurring rules are stored only on this device. Logging out will erase these device-only records. Shared cloud expenses will remain. Export anything you need first.'
   :'You will need to sign in with Google again. Your shared household expenses stay in the cloud.',[
   {text:'Cancel',style:'cancel'},
   {text:hasLocalData?'Erase local data & log out':'Log out',style:hasLocalData?'destructive':'default',onPress:()=>{void (async()=>{
    if(!supabase)return;
    setLoggingOut(true);
    try{
     const {error}=await supabase.auth.signOut({scope:'local'});
     if(error)throw error;
     clearAll();
     // User-scoped queue/cache data remains inaccessible after logout; remove private local categories.
     await AsyncStorage.removeItem('pesco:personal-categories:v1');
     router.replace('/onboarding');
    }catch(e){Alert.alert('Could not log out',e instanceof Error?e.message:'Please try again')}
    finally{setLoggingOut(false)}
   })()}}
  ]);
 };
 const deleteAccount=()=>Alert.alert('Delete your PESCO account?','This permanently deletes your account and your expenses. If you own a shared household, ownership will pass to your partner when possible. This cannot be undone.',[
  {text:'Cancel',style:'cancel'},
  {text:'Continue',style:'destructive',onPress:()=>Alert.alert('Final confirmation','Delete account and associated data permanently?',[
   {text:'Keep account',style:'cancel'},
   {text:'Delete permanently',style:'destructive',onPress:()=>{void (async()=>{
    if(!supabase||!user)return;
    if(pendingCount+pendingEditCount>0){Alert.alert('Pending changes','Sync or discard pending changes before deleting your account.');return}
    setDeleting(true);
    try{
     const {data,error:requestError}=await supabase.functions.invoke('delete-account',{method:'POST'});
     if(requestError||!data?.deleted)throw requestError??new Error('Deletion was not confirmed');
     clearAll();
     await supabase.auth.signOut({scope:'local'}).catch(()=>{});
     await AsyncStorage.clear();
     router.replace('/onboarding');
    }catch(e){Alert.alert('Could not delete account',e instanceof Error?e.message:'Please retry. Your account was not confirmed deleted.')}
    finally{setDeleting(false)}
   })()}}
  ])}
 ]);
 return <Screen modal style={{gap:12}}>
  {loading?<ActivityIndicator color={colors.household}/>:<>
   <View style={{alignItems:'center',paddingVertical:12,gap:6}}>
    <View style={{height:64,width:64,borderRadius:32,backgroundColor:colors.secondary,alignItems:'center',justifyContent:'center'}}>
     <Text style={{fontSize:26,color:colors.household,fontFamily:'PlusJakartaSans_700Bold'}}>{(name.trim()[0]||googleName[0]||'P').toLocaleUpperCase()}</Text>
    </View>
    <Text style={{color:colors.text,fontFamily:'Inter_600SemiBold',fontSize:17}}>{googleName}</Text>
    <Text style={{color:colors.muted,fontSize:12}}>{user?.email??'Google account'}</Text>
   </View>
   <View style={{backgroundColor:colors.surface,borderColor:colors.border,borderWidth:1,borderRadius:12,padding:12,gap:8}}>
    <Text style={{color:colors.text,fontSize:13,fontFamily:'Inter_600SemiBold'}}>Nickname <Text style={{color:colors.muted,fontFamily:'Inter_400Regular'}}>(optional)</Text></Text>
    <View style={{flexDirection:'row',alignItems:'center',gap:8}}>
     <TextInput accessibilityLabel="Nickname" value={name} onChangeText={setName} maxLength={80} placeholder={googleName} placeholderTextColor={colors.muted} autoCapitalize="words"
      style={{flex:1,height:42,borderRadius:9,borderWidth:1,borderColor:colors.border,paddingHorizontal:10,color:colors.text,fontSize:14}}/>
     {name.trim()!==initial?<Pressable accessibilityRole="button" disabled={busy} onPress={()=>{void save()}}
      style={{minHeight:42,minWidth:66,alignItems:'center',justifyContent:'center',backgroundColor:colors.household,borderRadius:9,paddingHorizontal:12,opacity:busy?0.6:1}}>
      <Text style={{color:'#fff',fontSize:13,fontFamily:'Inter_600SemiBold'}}>{busy?'Saving…':'Save'}</Text>
     </Pressable>:null}
    </View>
   </View>
   <Pressable accessibilityRole="button" disabled={loggingOut||deleting||busy} onPress={logout}
    style={{paddingVertical:13,alignItems:'center',borderRadius:10,backgroundColor:colors.secondary}}>
    <Text style={{color:colors.text,fontSize:13,fontFamily:'Inter_600SemiBold'}}>{loggingOut?'Logging out…':'Log out'}</Text>
   </Pressable>
   <Pressable accessibilityRole="button" disabled={deleting||loggingOut||busy} onPress={deleteAccount}
    style={{paddingVertical:12,alignItems:'center',borderRadius:10}}>
    <Text style={{color:'#C94F4F',fontSize:13,fontFamily:'Inter_600SemiBold'}}>{deleting?'Deleting account…':'Delete account'}</Text>
   </Pressable>
   {error?<Pressable onPress={()=>{void load()}}><Text style={{color:'#C94F4F',fontSize:12}}>Could not load nickname · Retry</Text></Pressable>:null}
  </>}
 </Screen>;
}
