import React,{useCallback,useEffect,useState} from 'react';
import {Alert,Keyboard,Modal,Platform,Pressable,ScrollView,Switch,Text,TextInput,View} from 'react-native';
import DateTimePicker,{DateTimePickerAndroid} from '@react-native-community/datetimepicker';
import {useFocusEffect} from 'expo-router';
import {Screen} from '@/components/Screen';
import {Body,Card} from '@/components/UI';
import {useAppTheme} from '@/theme/ThemeContext';
import {useAuth} from '@/lib/AuthContext';
import {useCategories} from '@/lib/CategoryContext';
import {formatMoney,localDate,parseMoney,useData} from '@/data';
import {listHouseholdRecurring,saveHouseholdRecurring,toggleHouseholdRecurring,deleteHouseholdRecurring,generateHouseholdRecurring,type HouseholdRecurringRule} from '@/lib/householdRecurring';

type BillScope='personal'|'household';
const dateString=(date:Date)=>date.getFullYear()+'-'+String(date.getMonth()+1).padStart(2,'0')+'-'+String(date.getDate()).padStart(2,'0');
const showDate=(date:string)=>new Date(date+'T12:00:00').toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'});
const existingFirstDate=(startsOn:string,day:number)=>{
 const [y,m]=startsOn.slice(0,7).split('-').map(Number);
 return dateString(new Date(y,m-1,Math.min(day,new Date(y,m,0).getDate()),12));
};

export default function Recurring(){
 const {colors,resolved}=useAppTheme();
 const {household,refresh:refreshExpenses,recurringRules,addRecurring,setRecurringActive,updateRecurring,deleteRecurring}=useData();
 const {user}=useAuth();
 const {names}=useCategories();
 const [scope,setScope]=useState<BillScope>('personal');
 const [shared,setShared]=useState<HouseholdRecurringRule[]>([]);
 const [error,setError]=useState<string|null>(null);
 const [busy,setBusy]=useState(false);
 const [open,setOpen]=useState(false);
 const [editingId,setEditingId]=useState<string|null>(null);
 const [note,setNote]=useState('');
 const [amount,setAmount]=useState('');
 const [category,setCategory]=useState('Groceries');
 const [firstDate,setFirstDate]=useState(localDate());
 const [originalSchedule,setOriginalSchedule]=useState<{shown:string;startsOn:string;day:number}|null>(null);
 const [pendingDate,setPendingDate]=useState(new Date(localDate()+'T12:00:00'));
 const [dateOpen,setDateOpen]=useState(false);
 const [categoryOpen,setCategoryOpen]=useState(false);
 const categories=names(scope);
 const options=category&&!categories.includes(category)?[category,...categories]:categories;
 const accent=scope==='household'?colors.household:colors.personal;

 const reload=useCallback(async()=>{
  if(!household){setShared([]);return}
  try{
   await generateHouseholdRecurring(household.id);
   setShared(await listHouseholdRecurring(household.id));
   await refreshExpenses();
   setError(null);
  }catch(e){setError(e instanceof Error?e.message:'Could not refresh recurring bills')}
 },[household?.id,refreshExpenses]);
 useFocusEffect(useCallback(()=>{void reload()},[reload]));
 useEffect(()=>{if(!options.includes(category)&&categories.length)setCategory(categories[0])},[scope,categories.join('|')]);

 const close=()=>{setOpen(false);setEditingId(null);setDateOpen(false);setCategoryOpen(false)};
 const begin=(rule?:{id:string;note:string;amountPaise:number;category:string;day:number;startsOn:string})=>{
  Keyboard.dismiss();
  setEditingId(rule?.id??null);
  setNote(rule?.note??'');
  setAmount(rule?(rule.amountPaise/100).toFixed(2):'');
  setCategory(rule?.category??categories[0]??'Groceries');
  const shown=rule?existingFirstDate(rule.startsOn,rule.day):localDate();
  setFirstDate(shown);
  setOriginalSchedule(rule?{shown,startsOn:rule.startsOn,day:rule.day}:null);
  setOpen(true);
 };
 const chooseDate=()=>{
  Keyboard.dismiss();setCategoryOpen(false);
  const current=new Date(firstDate+'T12:00:00');
  if(Platform.OS==='android'){
   DateTimePickerAndroid.open({value:current,mode:'date',onChange:(event,picked)=>{if(event.type==='set'&&picked)setFirstDate(dateString(picked))}});
  }else{setPendingDate(current);setDateOpen(true)}
 };
 const save=async()=>{
  if(busy)return;
  const paise=parseMoney(amount.replace(/,/g,''));
  if(paise===null){Alert.alert('Invalid amount','Enter a positive amount with up to two decimal places.');return}
  if(!options.includes(category)){Alert.alert('Category required','Choose a category.');return}
  if(!/^\d{4}-\d{2}-\d{2}$/.test(firstDate)){Alert.alert('Invalid date','Choose a first due date.');return}
  const unchanged=!!originalSchedule&&originalSchedule.shown===firstDate;
  const due=unchanged?originalSchedule.day:Number(firstDate.slice(8,10));
  const startsOn=unchanged?originalSchedule.startsOn:firstDate;
  // Future dates are allowed. Generation begins only when the first due date arrives.
  const draft={amountPaise:paise,category,note:note.trim(),day:due,startsOn};
  setBusy(true);
  try{
   if(scope==='household'){
    if(!household)throw new Error('Create or join a household first.');
    await saveHouseholdRecurring(household.id,{amount_paise:paise,category,note:draft.note,day_of_month:due,starts_on:startsOn},editingId??undefined);
    await reload();
   }else if(editingId)updateRecurring(editingId,draft);
   else addRecurring(draft);
   close();
  }catch(e){Alert.alert('Could not save',e instanceof Error?e.message:'Try again')}
  finally{setBusy(false)}
 };
 const confirmDelete=(label:string,run:()=>Promise<void>|void)=>Alert.alert('Delete recurring bill?',label+' will stop repeating. Existing expense history will remain.',[
  {text:'Cancel',style:'cancel'},
  {text:'Delete',style:'destructive',onPress:()=>{void Promise.resolve(run()).catch(e=>Alert.alert('Could not delete',e instanceof Error?e.message:'Try again'))}}
 ]);
 const line=()=> <View style={{height:1,backgroundColor:colors.border}}/>;
 const rowLabel={width:82,color:colors.text,fontSize:14,fontFamily:'Inter_400Regular' as const};
 const pickerCard={backgroundColor:colors.surface,borderColor:colors.border,borderWidth:1 as const,borderRadius:16,padding:16,width:'100%' as const,maxWidth:420};

 return <View style={{flex:1,backgroundColor:colors.background}}><Screen modal style={{gap:10,paddingBottom:116}}>
  <View style={{flexDirection:'row',padding:3,borderRadius:11,backgroundColor:colors.secondary}}>
   {(['household','personal'] as const).map(value=><Pressable key={value} accessibilityRole="button" accessibilityState={{selected:scope===value}}
    onPress={()=>{setScope(value);close()}} style={{flex:1,paddingVertical:9,borderRadius:8,alignItems:'center',backgroundColor:scope===value?colors.surface:undefined}}>
    <Text style={{fontFamily:scope===value?'Inter_700Bold':'Inter_500Medium',fontSize:13,color:scope===value?(value==='household'?colors.household:colors.personal):colors.muted}}>{value==='household'?'Household':'Personal'}</Text>
   </Pressable>)}
  </View>
  <Text style={{color:colors.muted,fontSize:12}}>{scope==='household'?'Shared with your household':'Only visible on this device'}</Text>
  {scope==='household'&&!household?<Card><Body muted>Create or join a household to manage shared bills.</Body></Card>:null}
  <View style={{backgroundColor:colors.surface,borderRadius:12,borderWidth:1,borderColor:colors.border,overflow:'hidden'}}>
   {(scope==='household'?shared:recurringRules).map((rule,index)=>{
    const isShared=scope==='household';
    const title=rule.note||rule.category;
    const amountValue=isShared?(rule as HouseholdRecurringRule).amount_paise:(rule as typeof recurringRules[number]).amountPaise;
    const day=isShared?(rule as HouseholdRecurringRule).day_of_month:(rule as typeof recurringRules[number]).day;
    const startsOn=isShared?(rule as HouseholdRecurringRule).starts_on:(rule as typeof recurringRules[number]).startsOn;
    const owner=!isShared||(rule as HouseholdRecurringRule).created_by===user?.id;
    const edit=()=>begin({id:rule.id,note:rule.note,category:rule.category,amountPaise:amountValue,day,startsOn});
    const deleteRule=()=>confirmDelete(title,async()=>{
     if(isShared&&household){await deleteHouseholdRecurring(household.id,rule.id);await reload()}
     else deleteRecurring(rule.id);
    });
    return <View key={rule.id} style={{borderBottomWidth:index===(isShared?shared.length:recurringRules.length)-1?0:1,borderColor:colors.border}}>
     <View style={{flexDirection:'row',alignItems:'center',paddingHorizontal:12,minHeight:62,gap:11}}>
      <Pressable accessibilityRole="button" disabled={!owner} onPress={edit} style={{flex:1,paddingVertical:10,gap:4}}>
       <Text numberOfLines={1} style={{color:rule.active?colors.text:colors.muted,fontFamily:'Inter_600SemiBold',fontSize:14}}>{title}</Text>
       <Text numberOfLines={1} style={{color:colors.muted,fontFamily:'Inter_400Regular',fontSize:11}}>{rule.category} · {day}{day===1?'st':day===2?'nd':day===3?'rd':'th'} monthly{!rule.active?' · Paused':''}</Text>
      </Pressable>
      <Text style={{color:colors.text,fontFamily:'Inter_600SemiBold',fontSize:13}}>{formatMoney(amountValue)}</Text>
      {owner?<Switch accessibilityLabel={'Active '+title} value={rule.active}
       onValueChange={value=>{
        if(isShared&&household)void toggleHouseholdRecurring(household.id,rule.id,value).then(reload).catch(e=>Alert.alert('Could not update',String(e)));
        else setRecurringActive(rule.id,value);
       }} style={{transform:[{scaleX:0.78},{scaleY:0.78}],marginHorizontal:-5}} trackColor={{false:colors.border,true:colors.household}}/>:null}
      {owner?<Pressable accessibilityRole="button" accessibilityLabel={'More options for '+title} onPress={()=>Alert.alert(title,'Manage this recurring bill',[
       {text:'Edit',onPress:edit},{text:'Delete',style:'destructive',onPress:deleteRule},{text:'Cancel',style:'cancel'}
      ])} style={{padding:6}}><Text style={{color:colors.muted,fontSize:21}}>⋯</Text></Pressable>:null}
     </View>
    </View>;
   })}
   {(scope==='personal'&&recurringRules.length===0||scope==='household'&&shared.length===0)?
    <View style={{paddingVertical:24,alignItems:'center'}}><Text style={{color:colors.muted,fontSize:13}}>No recurring bills yet</Text></View>:null}
  </View>
  <Modal visible={open} transparent animationType="slide" presentationStyle="overFullScreen" onRequestClose={close}>
   <View style={{flex:1,justifyContent:'flex-end'}}>
    <Pressable onPress={close} accessibilityLabel="Dismiss bill editor" style={{position:'absolute',top:0,left:0,right:0,bottom:0,backgroundColor:'rgba(0,0,0,0.40)'}}/>
    <View style={{backgroundColor:colors.background,borderTopLeftRadius:20,borderTopRightRadius:20,paddingHorizontal:18,paddingTop:12,paddingBottom:38,gap:14}}>
     <View style={{alignItems:'center'}}><View style={{width:34,height:4,borderRadius:2,backgroundColor:colors.border}}/></View>
     <View style={{flexDirection:'row',alignItems:'center',justifyContent:'space-between'}}>
      <Pressable accessibilityRole="button" onPress={close} style={{paddingVertical:6}}><Text style={{color:colors.muted,fontSize:14}}>Cancel</Text></Pressable>
      <Text style={{color:colors.text,fontFamily:'Inter_600SemiBold',fontSize:15}}>{editingId?'Edit bill':'New bill'}</Text>
      <Pressable accessibilityRole="button" disabled={busy||dateOpen||categoryOpen} onPress={()=>{void save()}} style={{paddingVertical:6}}><Text style={{color:accent,fontFamily:'Inter_700Bold',fontSize:14}}>{busy?'Saving…':'Save'}</Text></Pressable>
     </View>
     {dateOpen?<View style={{backgroundColor:colors.surface,borderRadius:12,padding:8}}>
      <Text style={{color:colors.text,fontSize:14,fontFamily:'Inter_600SemiBold',padding:8}}>First due date</Text>
      <DateTimePicker value={pendingDate} mode="date" display="spinner" themeVariant={resolved} textColor={colors.text}
       style={{height:210,width:'100%'}} onChange={(_event,picked)=>{if(picked)setPendingDate(picked)}}/>
      <View style={{flexDirection:'row',justifyContent:'flex-end',gap:15,padding:8}}>
       <Pressable accessibilityRole="button" onPress={()=>setDateOpen(false)}><Text style={{color:colors.muted}}>Cancel</Text></Pressable>
       <Pressable accessibilityRole="button" onPress={()=>{setFirstDate(dateString(pendingDate));setDateOpen(false)}}><Text style={{color:accent,fontFamily:'Inter_600SemiBold'}}>Done</Text></Pressable>
      </View>
     </View>:categoryOpen?<View style={{backgroundColor:colors.surface,borderRadius:12,padding:10}}>
      <Text style={{color:colors.text,fontSize:14,fontFamily:'Inter_600SemiBold',padding:7}}>Select category</Text>
      <ScrollView nestedScrollEnabled style={{maxHeight:260}}>
       {options.map(name=><Pressable key={name} accessibilityRole="button" onPress={()=>{setCategory(name);setCategoryOpen(false)}} style={{minHeight:44,flexDirection:'row',alignItems:'center',paddingHorizontal:9,borderBottomWidth:1,borderColor:colors.border}}>
        <Text style={{flex:1,color:colors.text,fontSize:14}}>{name}</Text>
        {name===category?<Text style={{color:accent}}>✓</Text>:null}
       </Pressable>)}
      </ScrollView>
      <Pressable accessibilityRole="button" onPress={()=>setCategoryOpen(false)} style={{alignSelf:'flex-end',padding:10}}><Text style={{color:colors.muted}}>Cancel</Text></Pressable>
     </View>:<>
     <View style={{backgroundColor:colors.surface,borderRadius:12,borderWidth:1,borderColor:colors.border,paddingHorizontal:13}}>
      <Pressable accessibilityRole="button" onPress={chooseDate} style={{minHeight:49,flexDirection:'row',alignItems:'center'}}>
       <Text style={{...rowLabel,fontSize:13}}>First due</Text>
       <Text style={{flex:1,color:colors.text,fontSize:14}}>{showDate(firstDate)}</Text>
       <Text style={{color:colors.muted,fontSize:17}}>›</Text>
      </Pressable>
      {line()}
      <View style={{minHeight:49,flexDirection:'row',alignItems:'center'}}>
       <Text style={{...rowLabel,fontSize:13}}>Amount</Text>
       <Text style={{color:colors.muted,fontSize:14,marginRight:3}}>₹</Text>
       <TextInput accessibilityLabel="Monthly amount" keyboardType="decimal-pad" value={amount} onChangeText={setAmount} placeholder="0.00" placeholderTextColor={colors.muted} style={{flex:1,color:colors.text,fontSize:15,paddingVertical:7}}/>
      </View>
      {line()}
      <Pressable accessibilityRole="button" onPress={()=>{Keyboard.dismiss();setCategoryOpen(true)}} style={{minHeight:49,flexDirection:'row',alignItems:'center'}}>
       <Text style={{...rowLabel,fontSize:13}}>Category</Text>
       <Text numberOfLines={1} style={{flex:1,color:colors.text,fontSize:14}}>{category}</Text>
       <Text style={{color:colors.muted,fontSize:17}}>›</Text>
      </Pressable>
      {line()}
      <View style={{minHeight:49,flexDirection:'row',alignItems:'center'}}>
       <Text style={{...rowLabel,fontSize:13}}>Note</Text>
       <TextInput accessibilityLabel="Bill description" value={note} onChangeText={setNote} maxLength={500} placeholder="Optional" placeholderTextColor={colors.muted} style={{flex:1,color:colors.text,fontSize:14,paddingVertical:7}}/>
      </View>
     </View>
     </>}
     {!dateOpen&&!categoryOpen?<Text style={{color:colors.muted,fontSize:11,lineHeight:16}}>Repeats monthly on the selected day. Short months use their last day.</Text>:null}
    </View>
   </View>
  </Modal>
  {error?<Pressable accessibilityRole="button" onPress={()=>{void reload()}}><Text style={{color:'#C94F4F',fontSize:13}}>Could not sync recurring bills · Retry</Text></Pressable>:null}
  </Screen>
  {!open&&!(scope==='household'&&!household)?<Pressable accessibilityRole="button" accessibilityLabel="Add recurring bill" onPress={()=>begin()}
   style={{position:'absolute',right:20,bottom:28,width:54,height:54,borderRadius:27,backgroundColor:accent,alignItems:'center',justifyContent:'center',shadowColor:'#000',shadowOpacity:0.18,shadowRadius:8,shadowOffset:{width:0,height:3},elevation:5}}>
   <Text style={{color:'#fff',fontSize:29,lineHeight:34}}>+</Text>
  </Pressable>:null}
 </View>;
}
