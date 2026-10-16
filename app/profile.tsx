import {fontSizes,fontFamilies,fontWeights} from '@/theme/typography';
import React,{useCallback,useState} from 'react';
import {ActivityIndicator,Alert,Pressable,Text,TextInput,View} from 'react-native';
import {useFocusEffect} from 'expo-router';
import {Screen} from '@/components/Screen';
import {useAppTheme} from '@/theme/ThemeContext';
import {useAuth} from '@/lib/AuthContext';
import {supabase} from '@/lib/supabase';
import {googleDisplayName} from '@/lib/profileName';

export default function Profile(){
 const {colors}=useAppTheme();
 const {user,ready}=useAuth();
 const googleName=googleDisplayName(user);
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
 return <Screen modal style={{gap:12}}>
  {loading?<ActivityIndicator color={colors.household}/>:<>
   <View style={{alignItems:'center',paddingVertical:12,gap:6}}>
    <View style={{height:64,width:64,borderRadius:0,backgroundColor:colors.secondary,alignItems:'center',justifyContent:'center'}}>
     <Text style={{fontSize:fontSizes.summary,color:colors.household,fontFamily:fontFamilies.displayBold}}>{(name.trim()[0]||googleName[0]||'P').toLocaleUpperCase()}</Text>
    </View>
    <Text style={{color:colors.text,fontFamily:fontFamilies.semibold,fontSize:fontSizes.section}}>{googleName}</Text>
    <Text style={{color:colors.muted,fontSize:fontSizes.caption}}>{user?.email??'Google account'}</Text>
   </View>
   <View style={{backgroundColor:colors.surface,borderColor:colors.border,borderWidth:1,borderRadius:0,padding:12,gap:8}}>
    <Text style={{color:colors.text,fontSize:fontSizes.label,fontFamily:fontFamilies.semibold}}>Nickname <Text style={{color:colors.muted,fontFamily:fontFamilies.regular}}>(optional)</Text></Text>
    <View style={{flexDirection:'row',alignItems:'center',gap:8}}>
     <TextInput accessibilityLabel="Nickname" value={name} onChangeText={setName} maxLength={80} placeholder={googleName} placeholderTextColor={colors.muted} autoCapitalize="words"
      style={{flex:1,height:42,borderRadius:0,borderWidth:1,borderColor:colors.border,paddingHorizontal:10,color:colors.text,fontSize:fontSizes.body}}/>
     {name.trim()!==initial?<Pressable accessibilityRole="button" disabled={busy} onPress={()=>{void save()}}
      style={{minHeight:42,minWidth:66,alignItems:'center',justifyContent:'center',backgroundColor:colors.household,borderRadius:0,paddingHorizontal:12,opacity:busy?0.6:1}}>
      <Text style={{color:'#fff',fontSize:fontSizes.label,fontFamily:fontFamilies.semibold}}>{busy?'Saving…':'Save'}</Text>
     </Pressable>:null}
    </View>
   </View>
   {error?<Pressable onPress={()=>{void load()}}><Text style={{color:'#C94F4F',fontSize:fontSizes.caption}}>Could not load nickname · Retry</Text></Pressable>:null}
  </>}
 </Screen>;
}
