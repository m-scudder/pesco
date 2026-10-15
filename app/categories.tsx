import React,{useEffect,useMemo,useState} from 'react';
import {Alert,Pressable,Text,TextInput,View} from 'react-native';
import {Screen} from '@/components/Screen';
import {Body} from '@/components/UI';
import {useAppTheme} from '@/theme/ThemeContext';
import {useCategories,type Category} from '@/lib/CategoryContext';
import {useData} from '@/data';
import type {Scope} from '@/theme/palette';

type ListedCategory=Category&{origin:Scope};
export default function Categories(){
 const {colors}=useAppTheme();
 const {household:activeHousehold}=useData();
 const [scope,setScope]=useState<Scope>(activeHousehold?'household':'personal');
 const {household,personal,loading,error,refresh,create,rename,remove}=useCategories();
 const [editing,setEditing]=useState<ListedCategory|null>(null);
 const [draft,setDraft]=useState('');
 const [creating,setCreating]=useState(false);
 const [busy,setBusy]=useState(false);
 const list=useMemo(()=> (scope==='household'?household:personal)
  .map(item=>({...item,origin:scope} as ListedCategory)).sort((a,b)=>a.name.localeCompare(b.name)),[scope,household,personal]);
 useEffect(()=>{void refresh()},[refresh]);
 useEffect(()=>{if(!activeHousehold&&scope==='household')setScope('personal')},[activeHousehold,scope]);
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
   if(creating)await create(scope,clean);
   else if(editing)await rename(editing.origin,editing.id,clean);
   cancel();
  }catch(e){Alert.alert('Could not save',e instanceof Error?e.message:'Try again')}
  finally{setBusy(false)}
 };
 const start=(item?:ListedCategory)=>{setEditing(item??null);setCreating(!item);setDraft(item?.name??'')};
 const changeScope=(value:Scope)=>{cancel();setScope(value)};
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
  {activeHousehold?<View style={{flexDirection:'row',padding:3,borderRadius:10,backgroundColor:colors.secondary}}> 
   {(['household','personal'] as const).map(value=><Pressable key={value} accessibilityRole="button" accessibilityState={{selected:scope===value}} onPress={()=>changeScope(value)}
    style={{flex:1,alignItems:'center',justifyContent:'center',minHeight:36,borderRadius:8,backgroundColor:scope===value?colors.surface:undefined}}>
    <Text style={{fontFamily:scope===value?'Inter_600SemiBold':'Inter_400Regular',fontSize:13,color:scope===value?colors.text:colors.muted}}>{value==='household'?'Household':'Personal'}</Text>
   </Pressable>)}
  </View>:null}
  <Text style={{color:colors.muted,fontSize:12}}>{scope==='household'?'Categories created here sync with your partner.':'Personal categories stay on this device.'}</Text>
  {scope==='household'&&!activeHousehold?<Body muted>Join or create a household to manage shared categories.</Body>:null}
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
  {creating?editor:<Pressable disabled={scope==='household'&&!activeHousehold} onPress={()=>start()} accessibilityRole="button"
   style={{minHeight:44,borderRadius:10,backgroundColor:colors.secondary,opacity:scope==='household'&&!activeHousehold?0.4:1,justifyContent:'center',alignItems:'center'}}>
   <Text style={{fontFamily:'Inter_600SemiBold',fontSize:14,color:colors.household}}>+ Add category</Text>
  </Pressable>}
  {loading?<Body muted>Updating…</Body>:null}
  {error?<Pressable onPress={()=>{void refresh()}}><Text style={{color:'#C94F4F',fontSize:13}}>Could not sync categories · Retry</Text></Pressable>:null}
 </Screen>;
}
