import {fontSizes,fontFamilies} from '@/theme/typography';
import React,{useEffect,useMemo,useState} from 'react';
import {Alert,Modal,Pressable,Text,TextInput,View} from 'react-native';
import {Ionicons} from '@expo/vector-icons';
import {Stack,useRouter} from 'expo-router';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {Screen} from '@/components/Screen';
import {Body} from '@/components/UI';
import {useAppTheme} from '@/theme/ThemeContext';
import {useCategories,type Category} from '@/lib/CategoryContext';
import {useData} from '@/data';
import type {Scope} from '@/theme/palette';

type ListedCategory=Category&{origin:Scope};
type SortField='name'|'createdAt';
export default function Categories(){
 const {colors}=useAppTheme();
 const router=useRouter();
 const insets=useSafeAreaInsets();
 const {household:activeHousehold}=useData();
 const [scope,setScope]=useState<Scope>(activeHousehold?'household':'personal');
 const {household,personal,loading,error,refresh,create,rename,remove}=useCategories();
 const [editing,setEditing]=useState<ListedCategory|null>(null);
 const [draft,setDraft]=useState('');
 const [modalVisible,setModalVisible]=useState(false);
 const [busy,setBusy]=useState(false);
 const [sortField,setSortField]=useState<SortField>('name');
 const [ascending,setAscending]=useState(true);
 const list=useMemo(()=>(scope==='household'?household:personal)
  .map(item=>({...item,origin:scope} as ListedCategory))
  .sort((a,b)=>{
   if(sortField==='createdAt'){
    // Presets/legacy categories lack timestamps. Treat those as oldest.
    const at=a.createdAt?Date.parse(a.createdAt):0;
    const bt=b.createdAt?Date.parse(b.createdAt):0;
    const result=(Number.isFinite(at)?at:0)-(Number.isFinite(bt)?bt:0);
    return (ascending?1:-1)*result||a.name.localeCompare(b.name);
   }
   return (ascending?1:-1)*a.name.localeCompare(b.name,undefined,{sensitivity:'base'});
  }),[scope,household,personal,sortField,ascending]);
 useEffect(()=>{void refresh()},[refresh]);
 useEffect(()=>{if(!activeHousehold&&scope==='household')setScope('personal')},[activeHousehold,scope]);
 const close=()=>{if(busy)return;setModalVisible(false);setEditing(null);setDraft('')};
 const save=async()=>{
  if(busy)return;
  const clean=draft.trim().replace(/\s+/g,' ');
  if(!clean||clean.length>40){Alert.alert('Invalid category','Enter a name up to 40 characters.');return}
  if(list.some(item=>item.name.toLocaleLowerCase()===clean.toLocaleLowerCase()&&item.id!==editing?.id)){
   Alert.alert('Category already exists');return;
  }
  setBusy(true);
  try{
   if(editing)await rename(editing.origin,editing.id,clean);
   else await create(scope,clean);
   setModalVisible(false);setEditing(null);setDraft('');
  }catch(e){Alert.alert('Could not save',e instanceof Error?e.message:'Try again')}
  finally{setBusy(false)}
 };
 const open=(item?:ListedCategory)=>{setEditing(item??null);setDraft(item?.name??'');setModalVisible(true)};
 const changeScope=(value:Scope)=>{close();setScope(value)};
 const confirmRemove=(item:ListedCategory)=>Alert.alert(
  'Remove category?',item.name+' will no longer appear for new expenses. Existing transactions keep their category name.',[
   {text:'Cancel',style:'cancel'},
   {text:'Remove',style:'destructive',onPress:()=>{void remove(item.origin,item.id).catch(e=>Alert.alert('Could not remove',e instanceof Error?e.message:'Try again'))}}
  ]);
 const toggleSort=(field:SortField)=>{if(sortField===field)setAscending(value=>!value);else{setSortField(field);setAscending(field!=='createdAt')}};
 return <><Stack.Screen options={{headerShown:false}}/>
 <View style={{flex:1,backgroundColor:colors.background}}>
  <View style={{paddingTop:insets.top+8,paddingHorizontal:16,paddingBottom:12,minHeight:insets.top+60,
   flexDirection:'row',alignItems:'center',justifyContent:'space-between',borderBottomWidth:1,borderColor:colors.border}}>
   <Pressable accessibilityRole="button" accessibilityLabel="Back" onPress={()=>router.back()}
    style={{width:40,height:40,alignItems:'flex-start',justifyContent:'center'}}>
    <Ionicons name="chevron-back" size={25} color={colors.text}/>
   </Pressable>
   <Text style={{fontFamily:fontFamilies.displayBold,fontSize:fontSizes.section,color:colors.text}}>Categories</Text>
   <Pressable accessibilityRole="button" accessibilityLabel="Add category" disabled={scope==='household'&&!activeHousehold}
    onPress={()=>open()} style={{width:40,height:40,alignItems:'flex-end',justifyContent:'center',opacity:scope==='household'&&!activeHousehold?0.4:1}}>
    <Ionicons name="add" size={26} color={colors.household}/>
   </Pressable>
  </View>
 <Screen modal style={{gap:12}}>
  {activeHousehold?<View style={{flexDirection:'row',padding:3,borderRadius:10,backgroundColor:colors.secondary}}>
   {(['household','personal'] as const).map(value=><Pressable key={value} accessibilityRole="button" accessibilityState={{selected:scope===value}} onPress={()=>changeScope(value)}
    style={{flex:1,alignItems:'center',justifyContent:'center',minHeight:36,borderRadius:8,backgroundColor:scope===value?colors.surface:undefined}}>
    <Text style={{fontFamily:scope===value?fontFamilies.semibold:fontFamilies.regular,fontSize:fontSizes.label,color:scope===value?colors.text:colors.muted}}>{value==='household'?'Household':'Personal'}</Text>
   </Pressable>)}
  </View>:null}
  <Text style={{fontSize:fontSizes.caption,color:colors.muted}}>{scope==='household'?'Shared categories sync with your partner.':'Personal categories stay on this device.'}</Text>
  <View style={{flexDirection:'row',gap:8,alignItems:'center',flexWrap:'wrap'}}>
   <Text style={{fontSize:fontSizes.caption,color:colors.muted,fontFamily:fontFamilies.semibold}}>Sort by</Text>
   {(['name','createdAt'] as const).map(field=><Pressable key={field} accessibilityRole="button" onPress={()=>toggleSort(field)}
    style={{flexDirection:'row',alignItems:'center',gap:5,paddingHorizontal:10,paddingVertical:8,borderRadius:8,backgroundColor:sortField===field?colors.secondary:colors.surface,borderWidth:1,borderColor:colors.border}}>
    <Text style={{fontSize:fontSizes.caption,color:sortField===field?colors.text:colors.muted}}>{field==='name'?'Name':'Created at'}</Text>
    {sortField===field?<Ionicons name={ascending?'arrow-up':'arrow-down'} size={13} color={colors.household}/>:null}
   </Pressable>)}
  </View>
  {scope==='household'&&!activeHousehold?<Body muted>Join a household to manage shared categories.</Body>:null}
  <View style={{backgroundColor:colors.surface,borderWidth:1,borderColor:colors.border,borderRadius:12,paddingHorizontal:12}}>
   {list.map((item,index)=><View key={item.origin+':'+item.id} style={{minHeight:54,borderBottomWidth:index===list.length-1?0:1,borderColor:colors.border,flexDirection:'row',alignItems:'center',gap:9}}>
    <View style={{flex:1,gap:3}}>
     <Text style={{color:colors.text,fontSize:fontSizes.body}}>{item.name}</Text>
      </View>
    <Pressable accessibilityRole="button" accessibilityLabel={'Edit '+item.name} onPress={()=>open(item)} style={{padding:9}}>
     <Ionicons name="pencil-outline" size={19} color={colors.household}/>
    </Pressable>
    <Pressable accessibilityRole="button" accessibilityLabel={'Delete '+item.name} onPress={()=>confirmRemove(item)} style={{padding:9}}>
     <Ionicons name="trash-outline" size={19} color="#C94F4F"/>
    </Pressable>
   </View>)}
   {list.length===0?<View style={{paddingVertical:14}}><Body muted>No categories</Body></View>:null}
  </View>
  {loading?<Body muted>Updating…</Body>:null}
  {error?<Pressable onPress={()=>{void refresh()}}><Text style={{color:'#C94F4F',fontSize:fontSizes.label}}>Could not sync categories · Retry</Text></Pressable>:null}
  <Modal visible={modalVisible} transparent animationType="fade" presentationStyle="overFullScreen" onRequestClose={close}>
   <View style={{flex:1,justifyContent:'center',padding:24,backgroundColor:'rgba(0,0,0,0.5)'}}>
    <Pressable accessibilityRole="button" accessibilityLabel="Dismiss category editor" onPress={close} style={{position:'absolute',top:0,bottom:0,left:0,right:0}}/>
    <View style={{backgroundColor:colors.surface,borderRadius:16,borderWidth:1,borderColor:colors.border,padding:18,gap:16}}>
     <Text style={{fontFamily:fontFamilies.displayBold,fontSize:fontSizes.section,color:colors.text}}>{editing?'Edit category':'Add category'}</Text>
     <TextInput accessibilityLabel="Category name" autoFocus value={draft} maxLength={40} onChangeText={setDraft}
      autoCapitalize="words" placeholder="Category name" placeholderTextColor={colors.muted} onSubmitEditing={()=>{void save()}}
      style={{height:48,borderWidth:1,borderColor:colors.border,borderRadius:10,color:colors.text,paddingHorizontal:12,fontSize:fontSizes.body}}/>
     <View style={{flexDirection:'row',gap:10}}>
      <Pressable disabled={busy} onPress={close} style={{flex:1,padding:13,alignItems:'center',backgroundColor:colors.secondary,borderRadius:10}}>
       <Text style={{color:colors.text,fontFamily:fontFamilies.semibold}}>Cancel</Text>
      </Pressable>
      <Pressable disabled={busy} onPress={()=>{void save()}} style={{flex:1,padding:13,alignItems:'center',backgroundColor:colors.household,borderRadius:10}}>
       <Text style={{color:'#FFFFFF',fontFamily:fontFamilies.semibold}}>{busy?'Saving…':'Save'}</Text>
      </Pressable>
     </View>
    </View>
   </View>
  </Modal>
 </Screen></View></>;
}
