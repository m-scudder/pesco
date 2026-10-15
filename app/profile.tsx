import React,{useCallback,useState} from 'react';
import {ActivityIndicator,Alert,Pressable,Text,TextInput,View} from 'react-native';
import {useFocusEffect,useRouter} from 'expo-router';
import {Screen} from '@/components/Screen';
import {useAppTheme} from '@/theme/ThemeContext';
import {useAuth} from '@/lib/AuthContext';
import {supabase} from '@/lib/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {useData} from '@/data';

export default function Profile(){
 const {colors}=useAppTheme();
 const router=useRouter();
 const {pendingCount,pendingEditCount,clearAll}=useData();
 const {user,ready}=useAuth();
 const [name,setName]=useState('');
 const [initial,setInitial]=useState('');
 const [busy,setBusy]=useState(false);
 const [loading,setLoading]=useState(true);
 const [error,setError]=useState<string|null>(null);
 const [deleting,setDeleting]=useState(false);
 const load=useCallback(async()=>{
  if(!ready)return;
  if(!supabase||!user){setLoading(false);return}
  setLoading(true);
  try{
   const {data,error:readError}=await supabase.from('profiles').select('display_name').eq('id',user.id).maybeSingle();
   if(readError)throw readError;
   const current=data?.display_name??'';
   setName(current);setInitial(current);setError(null);
  }catch(e){setError(e instanceof Error?e.message:'Unable to load profile')}
  finally{setLoading(false)}
 },[ready,user?.id]);
 useFocusEffect(useCallback(()=>{void load()},[load]));
 const save=async()=>{
  if(!supabase||!user)return;
  const clean=name.trim().replace(/\s+/g,' ');
  if(!clean||clean.length>80){Alert.alert('Invalid name','Enter a name between 1 and 80 characters.');return}
  setBusy(true);
  try{
   const {error:saveError}=await supabase.from('profiles').upsert({id:user.id,display_name:clean},{onConflict:'id'});
   if(saveError)throw saveError;
   setName(clean);setInitial(clean);
   Alert.alert('Saved','Your name is now visible to your household partner.');
  }catch(e){Alert.alert('Could not save',e instanceof Error?e.message:'Try again')}
  finally{setBusy(false)}
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
 return <Screen modal style={{gap:14}}>
  {loading?<ActivityIndicator color={colors.household}/>:<>
   <View style={{alignItems:'center',paddingVertical:12,gap:8}}>
    <View style={{height:74,width:74,borderRadius:37,backgroundColor:colors.secondary,alignItems:'center',justifyContent:'center'}}>
     <Text style={{fontSize:30,color:colors.household,fontFamily:'PlusJakartaSans_700Bold'}}>{(name.trim()[0]||'P').toLocaleUpperCase()}</Text>
    </View>
    <Text style={{color:colors.muted,fontSize:13}}>Your profile</Text>
   </View>
   <View style={{borderRadius:14,borderColor:colors.border,borderWidth:1,backgroundColor:colors.surface,padding:14,gap:9}}>
    <Text style={{color:colors.text,fontSize:14,fontFamily:'Inter_600SemiBold'}}>Display name</Text>
    <TextInput accessibilityLabel="Display name" value={name} onChangeText={setName} maxLength={80}
     placeholder="Your name" placeholderTextColor={colors.muted} autoCapitalize="words"
     style={{height:44,borderRadius:9,borderColor:colors.border,borderWidth:1,paddingHorizontal:12,color:colors.text,fontSize:15}}/>
    <Text style={{fontSize:12,color:colors.muted}}>Your household partner can see this name.</Text>
   </View>
   <Pressable accessibilityRole="button" disabled={busy||name.trim()===initial||!name.trim()} onPress={()=>{void save()}}
    style={{backgroundColor:colors.household,minHeight:46,borderRadius:11,justifyContent:'center',alignItems:'center',opacity:busy||name.trim()===initial?0.6:1}}>
    <Text style={{color:'#fff',fontFamily:'Inter_600SemiBold'}}>{busy?'Saving…':'Save profile'}</Text>
   </Pressable>
   <View style={{borderRadius:14,borderWidth:1,borderColor:colors.border,backgroundColor:colors.surface,padding:14,gap:9}}>
    <Text style={{color:colors.text,fontSize:14,fontFamily:'Inter_600SemiBold'}}>Connected account</Text>
    <Text style={{color:colors.muted,fontSize:13}}>{user?.email??'No email available'}</Text>
    <Text style={{color:colors.muted,fontSize:12}}>Google · {user?.identities?.some(x=>x.provider==='google')?'Connected':'Not connected'}</Text>
   </View>
   <Pressable accessibilityRole="button" disabled={deleting||busy} onPress={deleteAccount} style={{marginTop:12,paddingVertical:13,alignItems:'center',borderRadius:10,borderWidth:1,borderColor:'#C94F4F'}}>
    <Text style={{color:'#C94F4F',fontSize:13,fontFamily:'Inter_600SemiBold'}}>{deleting?'Deleting account…':'Delete account'}</Text>
   </Pressable>
   <Text style={{color:colors.muted,fontSize:11,textAlign:'center'}}>Permanently removes your account and its expense history.</Text>
   {error?<Pressable onPress={()=>{void load()}}><Text style={{color:'#C94F4F'}}>Could not load profile · Retry</Text></Pressable>:null}
  </>}
 </Screen>;
}
