import React,{useEffect,useState} from 'react';
import {Alert,Pressable,Text,TextInput,View} from 'react-native';
import {Screen} from '@/components/Screen';
import {ScopeSwitch,Body} from '@/components/UI';
import {useAppTheme} from '@/theme/ThemeContext';
import {useCategories,type Category} from '@/lib/CategoryContext';
import {useData} from '@/data';
import type {Scope} from '@/theme/palette';

export default function Categories(){
 const {scope,colors}=useAppTheme();
 const {household:membership}=useData();
 const {household,personal,loading,error,refresh,create,rename,remove}=useCategories();
 const [editing,setEditing]=useState<string|null>(null);
 const [draft,setDraft]=useState('');
 const [creating,setCreating]=useState(false);
 const [busy,setBusy]=useState(false);
 const list=scope==='household'?household:personal;
 useEffect(()=>{setEditing(null);setDraft('');setCreating(false);if(scope==='household')void refresh()},[scope,refresh]);
 const save=async()=>{
  if(busy)return;
  setBusy(true);
  try{
   if(creating)await create(scope,draft);else if(editing)await rename(scope,editing,draft);
   setEditing(null);setCreating(false);setDraft('');
  }catch(e){Alert.alert('Could not save',e instanceof Error?e.message:'Try again')}
  finally{setBusy(false)}
 };
 const start=(item?:Category)=>{setEditing(item?.id??null);setCreating(!item);setDraft(item?.name??'')};
 const confirmRemove=(id:string,name:string)=>Alert.alert('Remove category?',name+' will no longer appear for new expenses. Existing transactions are unchanged.',[
  {text:'Cancel',style:'cancel'},
  {text:'Remove',style:'destructive',onPress:()=>{void (async()=>{
   try{await remove(scope,id)}catch(e){Alert.alert('Could not remove',e instanceof Error?e.message:'Try again')}
  })()}}
 ]);
 const button=(text:string,action:()=>void,muted=false)=>(
  <Pressable accessibilityRole="button" onPress={action} disabled={busy} style={{paddingHorizontal:10,paddingVertical:8,minHeight:36,justifyContent:'center'}}>
   <Text style={{color:muted?colors.muted:scope==='household'?colors.household:colors.personal,fontSize:13,fontWeight:'600'}}>{text}</Text>
  </Pressable>
 );
 const editor=(
  <View style={{flexDirection:'row',alignItems:'center',gap:6}}>
   <TextInput accessibilityLabel="Category name" autoFocus value={draft} maxLength={40} onChangeText={setDraft}
    autoCapitalize="words" placeholder="Category name" placeholderTextColor={colors.muted}
    onSubmitEditing={()=>{void save()}} style={{flex:1,minWidth:0,height:42,borderWidth:1,borderColor:colors.border,borderRadius:9,color:colors.text,paddingHorizontal:12,fontSize:14}}/>
   {button('Save',()=>{void save()})}
   {button('Cancel',()=>{setEditing(null);setCreating(false);setDraft('')},true)}
  </View>
 );
 return <Screen modal>
  <ScopeSwitch/>
  {scope==='household'&&!membership?<Body muted>Create or join a household first.</Body>:<>
   <View style={{backgroundColor:colors.surface,borderColor:colors.border,borderWidth:1,borderRadius:12,paddingHorizontal:12}}>
    {list.map((item,index)=><View key={item.id} style={{minHeight:50,borderBottomWidth:index===list.length-1?0:1,borderColor:colors.border,justifyContent:'center'}}>
     {editing===item.id?editor:<View style={{flexDirection:'row',alignItems:'center',gap:6}}>
      <Text style={{flex:1,color:colors.text,fontSize:14}}>{item.name}</Text>
      {button('Edit',()=>start(item))}
      {button('Remove',()=>confirmRemove(item.id,item.name),true)}
     </View>}
    </View>)}
    {list.length===0?<View style={{paddingVertical:14}}><Body muted>No categories</Body></View>:null}
   </View>
   {creating?editor:<Pressable onPress={()=>start()} accessibilityRole="button" style={{minHeight:44,borderRadius:10,backgroundColor:colors.secondary,justifyContent:'center',alignItems:'center'}}>
    <Text style={{fontWeight:'600',fontSize:14,color:scope==='household'?colors.household:colors.personal}}>+ Add category</Text>
   </Pressable>}
   {loading?<Body muted>Updating…</Body>:null}
   {error?<Pressable onPress={()=>{void refresh()}}><Text style={{color:'#C94F4F',fontSize:13}}>Could not sync categories · Retry</Text></Pressable>:null}
  </>}
 </Screen>;
}
