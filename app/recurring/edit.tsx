import React,{useEffect,useState} from 'react';
import {Alert,Keyboard,Modal,Platform,Pressable,ScrollView,Text,TextInput,View} from 'react-native';
import DateTimePicker,{DateTimePickerAndroid} from '@react-native-community/datetimepicker';
import {Stack,useLocalSearchParams,useRouter} from 'expo-router';
import {Screen} from '@/components/Screen';
import {Body} from '@/components/UI';
import {useAppTheme} from '@/theme/ThemeContext';
import {useCategories} from '@/lib/CategoryContext';
import {localDate,parseMoney,useData} from '@/data';
import {listHouseholdRecurring,saveHouseholdRecurring,generateHouseholdRecurring} from '@/lib/householdRecurring';
import type {Scope} from '@/theme/palette';

const iso=(d:Date)=>d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
const labelDate=(isoDate:string)=>new Date(isoDate+'T12:00:00').toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'});
const shownDue=(start:string,day:number)=>{const [y,m]=start.slice(0,7).split('-').map(Number);return iso(new Date(y,m-1,Math.min(day,new Date(y,m,0).getDate()),12))};

export default function RecurringEditor(){
 const router=useRouter();
 const {scope:scopeParam,id}=useLocalSearchParams<{scope?:string;id?:string}>();
 const scope:Scope=scopeParam==='household'?'household':'personal';
 const {colors,resolved}=useAppTheme();
 const {household,recurringRules,addRecurring,updateRecurring,refresh}=useData();
 const {names}=useCategories();
 const categories=names(scope);
 const [category,setCategory]=useState(categories[0]??'Groceries');
 const [amount,setAmount]=useState('');
 const [note,setNote]=useState('');
 const [firstDue,setFirstDue]=useState(localDate());
 const [original,setOriginal]=useState<{display:string;startsOn:string;day:number}|null>(null);
 const [dateOpen,setDateOpen]=useState(false);
 const [pendingDate,setPendingDate]=useState(new Date(localDate()+'T12:00:00'));
 const [categoryOpen,setCategoryOpen]=useState(false);
 const [busy,setBusy]=useState(false);
 const [loading,setLoading]=useState(!!id&&scope==='household');
 const [loadError,setLoadError]=useState<string|null>(null);
 const accent=scope==='household'?colors.household:colors.personal;
 const options=category&&!categories.includes(category)?[category,...categories]:categories;

 useEffect(()=>{
  let active=true;
  const rule=id&&scope==='personal'?recurringRules.find(r=>r.id===id):null;
  async function load(){
   try{
    const selected=scope==='household'&&id&&household?
     (await listHouseholdRecurring(household.id)).find(r=>r.id===id):rule;
    if(!active)return;
    if(id&&!selected){setLoadError('This recurring bill could not be found.');return}
    if(selected){
     const day='day_of_month' in selected?selected.day_of_month:selected.day;
     const start='starts_on' in selected?selected.starts_on:selected.startsOn;
     const amountValue='amount_paise' in selected?selected.amount_paise:selected.amountPaise;
     const displayed=shownDue(start,day);
     setFirstDue(displayed);
     setOriginal({display:displayed,startsOn:start,day});
     setAmount((amountValue/100).toFixed(2));
     setNote(selected.note);
     setCategory(selected.category);
    }
   }catch(e){if(active)setLoadError(e instanceof Error?e.message:'Could not load bill')}
   finally{if(active)setLoading(false)}
  }
  void load();
  return()=>{active=false};
 },[id,scope,household?.id]);

 useEffect(()=>{if(!id&&!categories.includes(category)&&categories.length)setCategory(categories[0])},[scope,categories.join('|'),id]);
 const selectDate=()=>{
  Keyboard.dismiss();setCategoryOpen(false);
  const value=new Date(firstDue+'T12:00:00');
  if(Platform.OS==='android')DateTimePickerAndroid.open({value,mode:'date',onChange:(event,date)=>{if(event.type==='set'&&date)setFirstDue(iso(date))}});
  else{setPendingDate(value);setDateOpen(true)}
 };
 const save=async()=>{
  if(busy)return;
  const value=parseMoney(amount.replace(/,/g,''));
  if(value===null){Alert.alert('Invalid amount','Enter a positive amount with up to two decimals.');return}
  if(!options.includes(category)){Alert.alert('Invalid category','Choose a category.');return}
  const unchanged=!!original&&firstDue===original.display;
  const day=unchanged?original.day:Number(firstDue.slice(8,10));
  const startsOn=unchanged?original.startsOn:firstDue;
  setBusy(true);
  try{
   if(scope==='household'){
    if(!household)throw new Error('Create or join a household first');
    await saveHouseholdRecurring(household.id,{amount_paise:value,category,note:note.trim(),day_of_month:day,starts_on:startsOn},id);
    await generateHouseholdRecurring(household.id);
    await refresh();
   }else{
    const draft={amountPaise:value,category,note:note.trim(),day,startsOn};
    if(id)updateRecurring(id,draft);else addRecurring(draft);
   }
   router.back();
  }catch(e){Alert.alert('Could not save',e instanceof Error?e.message:'Try again')}
  finally{setBusy(false)}
 };
 const line=()=> <View style={{height:1,backgroundColor:colors.border}}/>;
 const fieldLabel=()=>({width:83});
 const pickerCard={backgroundColor:colors.surface,borderColor:colors.border,borderWidth:1 as const,borderRadius:16,padding:16,width:'100%' as const,maxWidth:420};

 return <><Stack.Screen options={{title:id?'Edit bill':'Add bill',presentation:'card'}}/><Screen modal style={{gap:10}}>
  {loading?<Body muted>Loading bill…</Body>:loadError?<Body muted>{loadError}</Body>:<>
   <Text style={{fontFamily:'Inter_500Medium',fontSize:11,color:colors.muted,marginHorizontal:2}}>{scope==='household'?'HOUSEHOLD · MONTHLY':'PERSONAL · MONTHLY'}</Text>
   <View style={{backgroundColor:colors.surface,borderWidth:1,borderColor:colors.border,borderRadius:10,paddingHorizontal:12}}>
    <View style={{flexDirection:'row',alignItems:'center',minHeight:42}}>
     <View style={fieldLabel()}><Text style={{fontFamily:'Inter_400Regular',fontSize:13,color:colors.muted}}>First due</Text></View>
     <Pressable accessibilityRole="button" accessibilityLabel="Choose first due date" onPress={selectDate} style={{flex:1,minHeight:42,justifyContent:'center'}}>
      <Text style={{color:colors.text,fontSize:14,fontFamily:'Inter_500Medium'}}>{labelDate(firstDue)}  ▾</Text>
     </Pressable>
    </View>
    {line()}
    <View style={{flexDirection:'row',alignItems:'center',minHeight:42}}>
     <View style={fieldLabel()}><Text style={{fontFamily:'Inter_400Regular',fontSize:13,color:colors.muted}}>Amount</Text></View>
     <Text style={{color:colors.muted,fontSize:14,marginRight:4}}>₹</Text>
     <TextInput accessibilityLabel="Monthly amount" keyboardType="decimal-pad" value={amount} onChangeText={setAmount} placeholder="0.00" placeholderTextColor={colors.muted}
      style={{flex:1,color:colors.text,fontSize:16,fontFamily:'Inter_500Medium',paddingVertical:7}}/>
    </View>
    {line()}
    <Pressable accessibilityRole="button" accessibilityLabel="Choose category" onPress={()=>{Keyboard.dismiss();setCategoryOpen(true)}} style={{flexDirection:'row',alignItems:'center',minHeight:42}}>
     <View style={fieldLabel()}><Text style={{fontFamily:'Inter_400Regular',fontSize:13,color:colors.muted}}>Category</Text></View>
     <Text style={{flex:1,color:colors.text,fontSize:14,fontFamily:'Inter_500Medium'}}>{category||'Choose category'}  ▾</Text>
    </Pressable>
    {line()}
    <View style={{flexDirection:'row',alignItems:'center',minHeight:42}}>
     <View style={fieldLabel()}><Text style={{fontFamily:'Inter_400Regular',fontSize:13,color:colors.muted}}>Note</Text></View>
     <TextInput accessibilityLabel="Bill description" value={note} onChangeText={setNote} maxLength={500} placeholder="Optional" placeholderTextColor={colors.muted}
      style={{flex:1,color:colors.text,fontSize:14,paddingVertical:7}}/>
    </View>
   </View>
   <Text style={{color:colors.muted,fontSize:11,lineHeight:16}}>Repeats monthly on the selected date. Short months use the last day.</Text>
   <Pressable accessibilityRole="button" disabled={busy} onPress={()=>{void save()}} style={{backgroundColor:accent,padding:11,borderRadius:9,alignItems:'center',opacity:busy?0.6:1}}>
    <Text style={{color:'#fff',fontFamily:'Inter_600SemiBold',fontSize:13}}>{busy?'Saving…':id?'Save changes':'Save recurring bill'}</Text>
   </Pressable>
  </>}
 </Screen>
 <Modal visible={dateOpen} transparent animationType="fade" presentationStyle="overFullScreen" onRequestClose={()=>setDateOpen(false)}>
  <View style={{flex:1,justifyContent:'center',paddingHorizontal:24,backgroundColor:'rgba(0,0,0,0.55)'}}>
   <Pressable onPress={()=>setDateOpen(false)} style={{position:'absolute',top:0,bottom:0,left:0,right:0}} accessibilityLabel="Dismiss date picker"/>
   <View style={pickerCard}>
    <Text style={{color:colors.text,fontFamily:'Inter_700Bold',fontSize:17,marginBottom:8}}>First due date</Text>
    <DateTimePicker value={pendingDate} mode="date" display="spinner" themeVariant={resolved} textColor={colors.text} style={{height:210,width:'100%'}}
     onChange={(event,date)=>{if(event.type==='set'&&date)setPendingDate(date)}}/>
    <View style={{flexDirection:'row',justifyContent:'flex-end',gap:10,marginTop:10}}>
     <Pressable accessibilityRole="button" onPress={()=>setDateOpen(false)} style={{padding:10}}><Text style={{color:colors.muted}}>Cancel</Text></Pressable>
     <Pressable accessibilityRole="button" onPress={()=>{setFirstDue(iso(pendingDate));setDateOpen(false)}} style={{padding:10}}><Text style={{color:accent,fontFamily:'Inter_700Bold'}}>Done</Text></Pressable>
    </View>
   </View>
  </View>
 </Modal>
 <Modal visible={categoryOpen} transparent animationType="fade" presentationStyle="overFullScreen" onRequestClose={()=>setCategoryOpen(false)}>
  <View style={{flex:1,justifyContent:'center',paddingHorizontal:24,backgroundColor:'rgba(0,0,0,0.55)'}}>
   <Pressable onPress={()=>setCategoryOpen(false)} style={{position:'absolute',top:0,bottom:0,left:0,right:0}} accessibilityLabel="Dismiss category picker"/>
   <View style={pickerCard}>
    <Text style={{color:colors.text,fontFamily:'Inter_700Bold',fontSize:17,marginBottom:8}}>Category</Text>
    <ScrollView style={{maxHeight:390}} nestedScrollEnabled>
     {options.map((name,index)=><Pressable key={name} accessibilityRole="button" onPress={()=>{setCategory(name);setCategoryOpen(false)}}
      style={{minHeight:47,flexDirection:'row',alignItems:'center',borderBottomWidth:index===options.length-1?0:1,borderColor:colors.border}}>
      <Text style={{flex:1,color:colors.text,fontSize:15}}>{name}</Text>
      {name===category?<Text style={{color:accent,fontSize:18}}>✓</Text>:null}
     </Pressable>)}
    </ScrollView>
    <Pressable accessibilityRole="button" onPress={()=>setCategoryOpen(false)} style={{alignSelf:'flex-end',padding:10}}><Text style={{color:colors.muted}}>Close</Text></Pressable>
   </View>
  </View>
 </Modal></>;
}
