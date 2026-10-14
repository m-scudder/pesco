import React,{useEffect,useMemo,useState} from 'react';
import {Alert,Pressable,Text,TextInput,View} from 'react-native';
import {Screen} from '@/components/Screen';
import {Body} from '@/components/UI';
import {useAppTheme} from '@/theme/ThemeContext';
import {useCategories,type Category} from '@/lib/CategoryContext';
import type {Scope} from '@/theme/palette';

type ListedCategory=Category&{origin:Scope};
export default function Categories(){
 const {colors}=useAppTheme();
 const {household,personal,loading,error,refresh,create,rename,remove}=useCategories();
 const [editing,setEditing]=useState<ListedCategory|null>(null);
 const [draft,setDraft]=useState('');
 const [creating,setCreating]=useState(false);
 const [busy,setBusy]=useState(false);
 const list=useMemo(()=>{
  const byName=new Map<string,ListedCategory>();
  for(const item of personal)byName.set(item.name.toLocaleLowerCase(),{...item,origin:'personal'});
  for(const item of household)byName.set(item.name.toLocaleLowerCase(),{...item,origin:'household'});
  return Array.from(byName.values()).sort((a,b)=>a.name.localeCompare(b.name));
 },[household,personal]);
 useEffect(()=>{void refresh()},[refresh]);
 const cancel=()=>{setEditing(null);setCreating(false);setDraft('')};
 const save=async()=>{
  if(busy)return;
  const clean=draft.trim().replace(/\s+/g,' ');
  if(!clean||clean.length>40){Alert.alert('Invalid category','Enter a name up to 40 characters.');return}
  if(list.some(item=>item.name.toLocaleLowerCase()===clean.toLocaleLowerCase()&&item.id!==editing?.id)){
   Alert.alert('Category already exists');return;
  }
  setBusy(true);
  try{
   if(creating)await create('personal',clean);
   else if(editing)await rename(editing.origin,editing.id,clean);
   cancel();
  }catch(e){Alert.alert('Could not save',e instanceof Error?e.message:'Try again')}
  finally{setBusy(false)}
 };
 const start=(item?:ListedCategory)=>{setEditing(item??null);setCreating(!item);setDraft(item?.name??'')};
 const confirmRemove=(item:ListedCategory)=>Alert.alert(
  'Remove category?',item.name+' will no longer appear for new expenses. Existing transactions are unchanged.',[
   {text:'Cancel',style:'cancel'},
   {text:'Remove',style:'destructive',onPress:()=>{void remove(item.origin,item.id).catch(e=>Alert.alert('Could not remove',e instanceof Error?e.message:'Try again'))}}
  ]);
 const button=(label:string,onPress:()=>void,muted=false)=><Pressable accessibilityRole="button" disabled={busy} onPress={onPress}
  style={{paddingHorizontal:9,paddingVertical:8,minHeight:36,justifyContent:'center'}}>
  <Text style={{fontSize:13,fontFamily:'Inter_600SemiBold',color:muted?colors.muted:colors.household}}>{label}</Text>
 </Pressable>;
 const editor=<View style={{flexDirection:'row',alignItems:'center',gap:5}}>
  <TextInput accessibilityLabel="Category name" autoFocus value={draft} maxLength={40} onChangeText={setDraft}
   autoCapitalize="words" placeholder="Category name" placeholderTextColor={colors.muted}
   onSubmitEditing={()=>{void save()}} style={{flex:1,minWidth:0,height:42,borderWidth:1,borderColor:colors.border,borderRadius:9,color:colors.text,paddingHorizontal:10,fontSize:14}}/>
  {button('Save',()=>{void save()})}
  {button('Cancel',cancel,true)}
 </View>;
 return <Screen modal style={{gap:12}}>
  <Body muted>One category list for household and personal expenses.</Body>
  <View style={{backgroundColor:colors.surface,borderColor:colors.border,borderWidth:1,borderRadius:12,paddingHorizontal:12}}>
   {list.map((item,index)=><View key={item.origin+':'+item.id} style={{minHeight:50,borderBottomWidth:index===list.length-1?0:1,borderColor:colors.border,justifyContent:'center'}}>
    {editing?.id===item.id?editor:<View style={{flexDirection:'row',alignItems:'center',gap:6}}>
     <Text style={{flex:1,color:colors.text,fontSize:14}}>{item.name}</Text>
     {button('Edit',()=>start(item))}
     {button('Remove',()=>confirmRemove(item),true)}
    </View>}
   </View>)}
   {list.length===0?<View style={{paddingVertical:14}}><Body muted>No categories</Body></View>:null}
  </View>
  {creating?editor:<Pressable onPress={()=>start()} accessibilityRole="button"
   style={{minHeight:44,borderRadius:10,backgroundColor:colors.secondary,justifyContent:'center',alignItems:'center'}}>
   <Text style={{fontFamily:'Inter_600SemiBold',fontSize:14,color:colors.household}}>+ Add category</Text>
  </Pressable>}
  {loading?<Body muted>Updating…</Body>:null}
  {error?<Pressable onPress={()=>{void refresh()}}><Text style={{color:'#C94F4F',fontSize:13}}>Could not sync categories · Retry</Text></Pressable>:null}
 </Screen>;
}
