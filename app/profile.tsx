import React,{useCallback,useEffect,useState} from 'react';
import {ActivityIndicator,Alert,Pressable,Text,TextInput,View} from 'react-native';
import {useFocusEffect} from 'expo-router';
import {Screen} from '@/components/Screen';
import {useAppTheme} from '@/theme/ThemeContext';
import {useAuth} from '@/lib/AuthContext';
import {supabase} from '@/lib/supabase';

export default function Profile(){
 const {colors}=useAppTheme();
 const {user,ready}=useAuth();
 const [name,setName]=useState('');
 const [initial,setInitial]=useState('');
 const [busy,setBusy]=useState(false);
 const [loading,setLoading]=useState(true);
 const [error,setError]=useState<string|null>(null);
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
   {error?<Pressable onPress={()=>{void load()}}><Text style={{color:'#C94F4F'}}>Could not load profile · Retry</Text></Pressable>:null}
  </>}
 </Screen>;
}
