import React,{useCallback,useState} from 'react';
import {useFocusEffect} from 'expo-router';
import {useAuth} from '@/lib/AuthContext';
import {listHouseholdRecurring,saveHouseholdRecurring,toggleHouseholdRecurring,deleteHouseholdRecurring,generateHouseholdRecurring,type HouseholdRecurringRule} from '@/lib/householdRecurring';
import {Alert,Pressable,Text,TextInput,View,Switch} from 'react-native';
import {Screen} from '@/components/Screen';
import {useAppTheme} from '@/theme/ThemeContext';
import {useCategories} from '@/lib/CategoryContext';
import {formatMoney,localDate,parseMoney,useData} from '@/data';

export default function Recurring(){
 const {colors}=useAppTheme();
 const {household,refresh:refreshExpenses}=useData();
 const {user}=useAuth();
 const [scope,setScope]=useState<'personal'|'household'>('personal');
 const [shared,setShared]=useState<HouseholdRecurringRule[]>([]);
 const [busy,setBusy]=useState(false);
 const reload=useCallback(async()=>{
  if(!household){setShared([]);return}
  try{await generateHouseholdRecurring(household.id);setShared(await listHouseholdRecurring(household.id));await refreshExpenses()}
  catch(e){console.warn('Recurring sync failed',e)}
 },[household?.id,refreshExpenses]);
 useFocusEffect(useCallback(()=>{void reload()},[reload]));
 const {recurringRules,addRecurring,setRecurringActive,updateRecurring,deleteRecurring}=useData();
 const {names}=useCategories();
 const [open,setOpen]=useState(false);
 const [editingId,setEditingId]=useState<string|null>(null);
 const [note,setNote]=useState('');
 const [amount,setAmount]=useState('');
 const [category,setCategory]=useState('Groceries');
 const [day,setDay]=useState(String(new Date().getDate()));
 const [startMonth,setStartMonth]=useState(localDate().slice(0,7));
 const [showCategories,setShowCategories]=useState(false);
 const categories=names('personal');
 const input={height:44,borderWidth:1 as const,borderColor:colors.border,borderRadius:10,paddingHorizontal:12,color:colors.text,backgroundColor:colors.background,fontSize:15};
 function save(){
  const paise=parseMoney(amount),due=Number(day);
  if(paise===null){Alert.alert('Invalid amount','Enter a positive amount.');return}
  if(!Number.isInteger(due)||due<1||due>31){Alert.alert('Invalid day','Choose a day between 1 and 31.');return}
  if(!/^\d{4}-(0[1-9]|1[0-2])$/.test(startMonth)){Alert.alert('Invalid month','Use YYYY-MM.');return}
  if(startMonth>localDate().slice(0,7)){Alert.alert('Future start month','Choose this month or an earlier month.');return}
  if(!categories.includes(category)){Alert.alert('Choose a category');return}
  const draft={amountPaise:paise,category,note:note.trim(),day:due,startsOn:startMonth+'-01'};
  if(scope==='household'){
   if(!household){Alert.alert('Household required');return}
   setBusy(true);
   void saveHouseholdRecurring(household.id,{amount_paise:paise,category,note:note.trim(),day_of_month:due,starts_on:startMonth+'-01'},editingId??undefined)
    .then(reload).then(()=>{setOpen(false);setEditingId(null);setAmount('');setNote('')})
    .catch(e=>Alert.alert('Could not save',e instanceof Error?e.message:'Try again')).finally(()=>setBusy(false));
  }else{
   if(editingId)updateRecurring(editingId,draft);else addRecurring(draft);
   setOpen(false);setEditingId(null);setAmount('');setNote('');
  }
 }
 return <Screen modal style={{gap:14}}>
  <View style={{flexDirection:'row',gap:9}}>
   {(['personal','household'] as const).map(value=><Pressable key={value} onPress={()=>{setScope(value);setOpen(false);setEditingId(null)}} style={{flex:1,padding:12,borderRadius:10,alignItems:'center',backgroundColor:scope===value?colors.household:colors.secondary}}>
    <Text style={{color:scope===value?'#fff':colors.text}}>{value==='personal'?'Personal':'Household'}</Text>
   </Pressable>)}
  </View>
  <Text style={{color:colors.muted,fontSize:13}}>{scope==='personal'?'Personal recurring bills are stored on this device.':'Shared recurring bills are visible to both partners and generated once per month.'}</Text>
  {scope==='household'&&!household?<Text style={{color:colors.muted}}>Create or join a household to manage shared bills.</Text>:null}
  {scope==='household'?shared.map(rule=><View key={rule.id} style={{backgroundColor:colors.surface,borderWidth:1,borderColor:colors.border,borderRadius:14,padding:14,gap:8}}>
   <Text style={{color:colors.text,fontSize:15,fontFamily:'Inter_600SemiBold'}}>{rule.note||rule.category} · {formatMoney(rule.amount_paise)}</Text>
   <Text style={{color:colors.muted,fontSize:12}}>{rule.category} · Every month on day {rule.day_of_month}</Text>
   {rule.created_by===user?.id?<View style={{flexDirection:'row',justifyContent:'space-between',alignItems:'center'}}>
    <Pressable onPress={()=>{setEditingId(rule.id);setNote(rule.note);setAmount((rule.amount_paise/100).toFixed(2));setCategory(rule.category);setDay(String(rule.day_of_month));setStartMonth(rule.starts_on.slice(0,7));setOpen(true)}}><Text style={{color:colors.household}}>Edit</Text></Pressable>
    <Switch value={rule.active} onValueChange={value=>{void toggleHouseholdRecurring(rule.household_id,rule.id,value).then(reload).catch(e=>Alert.alert('Error',String(e)))}}/>
    <Pressable onPress={()=>Alert.alert('Delete rule?','Previously created expenses will remain.',[{text:'Cancel'},{text:'Delete',style:'destructive',onPress:()=>{void deleteHouseholdRecurring(rule.household_id,rule.id).then(reload)}}])}><Text style={{color:'#C94F4F'}}>Delete</Text></Pressable>
   </View>:null}
  </View>):null}
  {scope==='personal'?<>
  {recurringRules.map(rule=><View key={rule.id} style={{backgroundColor:colors.surface,borderWidth:1,borderColor:colors.border,borderRadius:14,padding:14,gap:10}}>
   <View style={{flexDirection:'row',justifyContent:'space-between',alignItems:'center',gap:10}}>
    <View style={{flex:1,gap:4}}>
     <Text style={{color:colors.text,fontFamily:'Inter_600SemiBold',fontSize:15}}>{rule.note||rule.category}</Text>
     <Text style={{color:colors.muted,fontSize:12}}>{rule.category} · Every month on day {rule.day}</Text>
     <Text style={{color:colors.text,fontSize:16}}>{formatMoney(rule.amountPaise)}</Text>
    </View>
    <Switch accessibilityLabel={'Recurring '+(rule.note||rule.category)} value={rule.active} onValueChange={value=>setRecurringActive(rule.id,value)} trackColor={{false:colors.border,true:colors.household}}/>
   </View>
   <Pressable accessibilityRole="button" onPress={()=>{setEditingId(rule.id);setNote(rule.note);setAmount((rule.amountPaise/100).toFixed(2));setCategory(rule.category);setDay(String(rule.day));setStartMonth(rule.startsOn.slice(0,7));setOpen(true)}}><Text style={{color:colors.household,fontSize:13}}>Edit rule</Text></Pressable>
   <Pressable accessibilityRole="button" onPress={()=>Alert.alert('Delete recurring rule?','Already created expenses will remain.',[
    {text:'Cancel',style:'cancel'},{text:'Delete rule',style:'destructive',onPress:()=>deleteRecurring(rule.id)}
   ])}><Text style={{color:'#C94F4F',fontSize:13}}>Delete rule</Text></Pressable>
  </View>)}
  {recurringRules.length===0?<View style={{paddingVertical:16,alignItems:'center'}}><Text style={{color:colors.muted}}>No recurring bills yet</Text></View>:null}
  </>:null}
  {open?<View style={{backgroundColor:colors.surface,borderWidth:1,borderColor:colors.border,borderRadius:14,padding:14,gap:11}}>
   <Text style={{color:colors.text,fontFamily:'Inter_600SemiBold',fontSize:16}}>{editingId?'Edit monthly expense':'New monthly expense'}</Text>
   <TextInput accessibilityLabel="Bill name" placeholder="Bill name (e.g. Rent)" placeholderTextColor={colors.muted} value={note} onChangeText={setNote} style={input}/>
   <TextInput accessibilityLabel="Monthly amount" placeholder="Amount ₹" keyboardType="decimal-pad" placeholderTextColor={colors.muted} value={amount} onChangeText={setAmount} style={input}/>
   <Pressable accessibilityRole="button" onPress={()=>setShowCategories(v=>!v)} style={{...input,justifyContent:'center'}}>
    <Text style={{color:colors.text}}>{category} ▾</Text>
   </Pressable>
   {showCategories?<View style={{flexDirection:'row',flexWrap:'wrap',gap:7}}>
    {categories.map(name=><Pressable key={name} onPress={()=>{setCategory(name);setShowCategories(false)}} style={{backgroundColor:colors.secondary,padding:9,borderRadius:8}}>
     <Text style={{color:colors.text}}>{name}</Text>
    </Pressable>)}
   </View>:null}
   <View style={{flexDirection:'row',gap:9}}>
    <View style={{flex:1,gap:4}}><Text style={{color:colors.muted,fontSize:12}}>Day of month (1–31)</Text><TextInput accessibilityLabel="Day of month" value={day} onChangeText={setDay} keyboardType="number-pad" maxLength={2} style={input}/></View>
    <View style={{flex:1,gap:4}}><Text style={{color:colors.muted,fontSize:12}}>Start month (YYYY-MM)</Text><TextInput accessibilityLabel="Start month" value={startMonth} onChangeText={setStartMonth} maxLength={7} placeholder="YYYY-MM" style={input}/></View>
   </View>
   <Text style={{color:colors.muted,fontSize:12}}>For shorter months, day 29–31 falls on the last day. Past months from the start month will also be generated.</Text>
   <Pressable accessibilityRole="button" disabled={busy} onPress={save} style={{backgroundColor:colors.household,borderRadius:10,padding:13,alignItems:'center'}}><Text style={{color:'#fff',fontFamily:'Inter_600SemiBold'}}>{editingId?'Save changes':'Create recurring bill'}</Text></Pressable>
   <Pressable accessibilityRole="button" onPress={()=>{setOpen(false);setEditingId(null)}} style={{padding:8,alignItems:'center'}}><Text style={{color:colors.muted}}>Cancel</Text></Pressable>
  </View>:<Pressable disabled={scope==='household'&&!household} accessibilityRole="button" onPress={()=>setOpen(true)} style={{backgroundColor:colors.household,borderRadius:11,padding:14,alignItems:'center'}}>
   <Text style={{color:'#fff',fontFamily:'Inter_600SemiBold'}}>+ Add recurring bill</Text>
  </Pressable>}
 </Screen>;
}
