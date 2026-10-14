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
 const rowLabel={width:94,color:colors.text,fontSize:14,fontFamily:'Inter_400Regular' as const};
 const pickerCard={backgroundColor:colors.surface,borderColor:colors.border,borderWidth:1 as const,borderRadius:16,padding:16,width:'100%' as const,maxWidth:420};

 return <Screen modal style={{gap:12}}>
  <View style={{flexDirection:'row',padding:3,borderRadius:11,backgroundColor:colors.secondary}}>
   {(['household','personal'] as const).map(value=><Pressable key={value} accessibilityRole="button" accessibilityState={{selected:scope===value}}
    onPress={()=>{setScope(value);close()}} style={{flex:1,paddingVertical:9,borderRadius:8,alignItems:'center',backgroundColor:scope===value?colors.surface:undefined}}>
    <Text style={{fontFamily:scope===value?'Inter_700Bold':'Inter_500Medium',fontSize:13,color:scope===value?(value==='household'?colors.household:colors.personal):colors.muted}}>{value==='household'?'Household':'Personal'}</Text>
   </Pressable>)}
  </View>
  <Body muted>{scope==='household'?'Shared monthly bills appear for both members.':'Personal bills are stored on this device.'}</Body>
  {scope==='household'&&!household?<Card><Body muted>Create or join a household to manage shared bills.</Body></Card>:null}
  {scope==='household'?shared.map(rule=><Card key={rule.id}>
   <View style={{flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:10}}>
    <View style={{flex:1,gap:3}}>
     <Text style={{color:colors.text,fontSize:15,fontFamily:'Inter_600SemiBold'}}>{rule.note||rule.category}</Text>
     <Text style={{color:colors.muted,fontSize:12}}>{rule.category} · Monthly on {rule.day_of_month}</Text>
    </View>
    <Text style={{color:colors.text,fontSize:15,fontFamily:'Inter_600SemiBold'}}>{formatMoney(rule.amount_paise)}</Text>
   </View>
   {rule.created_by===user?.id?<View style={{flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:12}}>
    <Pressable accessibilityRole="button" onPress={()=>begin({id:rule.id,note:rule.note,category:rule.category,amountPaise:rule.amount_paise,day:rule.day_of_month,startsOn:rule.starts_on})}><Text style={{color:accent,fontSize:13}}>Edit</Text></Pressable>
    <Switch accessibilityLabel="Recurring bill active" value={rule.active} onValueChange={value=>{void toggleHouseholdRecurring(rule.household_id,rule.id,value).then(reload).catch(e=>Alert.alert('Could not update',String(e)))}} trackColor={{false:colors.border,true:colors.household}}/>
    <Pressable accessibilityRole="button" onPress={()=>confirmDelete(rule.note||rule.category,async()=>{await deleteHouseholdRecurring(rule.household_id,rule.id);await reload()})}><Text style={{color:'#C94F4F',fontSize:13}}>Delete</Text></Pressable>
   </View>:<Text style={{color:colors.muted,fontSize:12}}>Added by partner</Text>}
  </Card>):recurringRules.map(rule=><Card key={rule.id}>
   <View style={{flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:10}}>
    <View style={{flex:1,gap:3}}>
     <Text style={{color:colors.text,fontSize:15,fontFamily:'Inter_600SemiBold'}}>{rule.note||rule.category}</Text>
     <Text style={{color:colors.muted,fontSize:12}}>{rule.category} · Monthly on {rule.day}</Text>
    </View>
    <Text style={{color:colors.text,fontSize:15,fontFamily:'Inter_600SemiBold'}}>{formatMoney(rule.amountPaise)}</Text>
   </View>
   <View style={{flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:12}}>
    <Pressable accessibilityRole="button" onPress={()=>begin({id:rule.id,note:rule.note,category:rule.category,amountPaise:rule.amountPaise,day:rule.day,startsOn:rule.startsOn})}><Text style={{color:accent,fontSize:13}}>Edit</Text></Pressable>
    <Switch accessibilityLabel="Recurring bill active" value={rule.active} onValueChange={value=>setRecurringActive(rule.id,value)} trackColor={{false:colors.border,true:colors.household}}/>
    <Pressable accessibilityRole="button" onPress={()=>confirmDelete(rule.note||rule.category,()=>deleteRecurring(rule.id))}><Text style={{color:'#C94F4F',fontSize:13}}>Delete</Text></Pressable>
   </View>
  </Card>)}
  {(scope==='personal'&&recurringRules.length===0||scope==='household'&&!!household&&shared.length===0)?<View style={{padding:16,alignItems:'center'}}><Body muted>No recurring bills yet</Body></View>:null}
  {!open&&!(scope==='household'&&!household)?<Pressable accessibilityRole="button" onPress={()=>begin()} style={{minHeight:46,justifyContent:'center',alignItems:'center',borderRadius:11,backgroundColor:accent}}>
   <Text style={{color:'#fff',fontFamily:'Inter_600SemiBold'}}>+ Add recurring bill</Text>
  </Pressable>:null}
  {open?<View style={{gap:10}}>
   <Text style={{fontFamily:'Inter_600SemiBold',color:colors.text,fontSize:15}}>{editingId?'Edit recurring bill':'New recurring bill'}</Text>
   <Card>
    <Pressable accessibilityRole="button" accessibilityLabel="Choose first due date" onPress={chooseDate} style={{flexDirection:'row',alignItems:'center',minHeight:44}}>
     <Text style={rowLabel}>First due</Text><Text style={{flex:1,color:colors.text,fontSize:15}}>{showDate(firstDate)}  ▾</Text>
    </Pressable>
    {line()}
    <View style={{flexDirection:'row',alignItems:'center',minHeight:44}}>
     <Text style={rowLabel}>Amount</Text>
     <Text style={{color:colors.muted,fontSize:16,marginRight:4}}>₹</Text>
     <TextInput accessibilityLabel="Monthly amount" value={amount} onChangeText={setAmount} keyboardType="decimal-pad"
      placeholder="0.00" placeholderTextColor={colors.muted} style={{flex:1,color:colors.text,fontSize:18,paddingVertical:8}}/>
    </View>
    {line()}
    <Pressable accessibilityRole="button" accessibilityLabel="Choose category" onPress={()=>{Keyboard.dismiss();setCategoryOpen(true)}} style={{flexDirection:'row',alignItems:'center',minHeight:44}}>
     <Text style={rowLabel}>Category</Text>
     <Text style={{flex:1,color:colors.text,fontSize:15}}>{category||'Select category'}  ▾</Text>
    </Pressable>
    {line()}
    <View style={{flexDirection:'row',alignItems:'center',minHeight:44}}>
     <Text style={rowLabel}>Note</Text>
     <TextInput accessibilityLabel="Bill description" value={note} onChangeText={setNote} maxLength={500} placeholder="Optional" placeholderTextColor={colors.muted}
      style={{flex:1,color:colors.text,fontSize:15,paddingVertical:8}}/>
    </View>
   </Card>
   <Body muted>Repeats monthly on day {Number(firstDate.slice(8,10))}. For shorter months, the last day is used. Older due dates are generated when synced.</Body>
   <Pressable accessibilityRole="button" disabled={busy} onPress={()=>{void save()}} style={{minHeight:46,borderRadius:10,alignItems:'center',justifyContent:'center',backgroundColor:accent,opacity:busy?0.6:1}}>
    <Text style={{color:'#fff',fontFamily:'Inter_700Bold'}}>{busy?'Saving…':editingId?'Save changes':'Create recurring bill'}</Text>
   </Pressable>
   <Pressable accessibilityRole="button" onPress={close} style={{alignItems:'center',padding:9}}><Text style={{color:colors.muted,fontSize:14}}>Cancel</Text></Pressable>
  </View>:null}
  {error?<Pressable accessibilityRole="button" onPress={()=>{void reload()}}><Text style={{color:'#C94F4F',fontSize:13}}>Could not sync recurring bills · Retry</Text></Pressable>:null}
  <Modal visible={dateOpen} transparent animationType="fade" presentationStyle="overFullScreen" onRequestClose={()=>setDateOpen(false)}>
   <View style={{flex:1,justifyContent:'center',paddingHorizontal:24,backgroundColor:'rgba(0,0,0,0.55)'}}>
    <Pressable accessibilityLabel="Dismiss date picker" onPress={()=>setDateOpen(false)} style={{position:'absolute',top:0,bottom:0,left:0,right:0}}/>
    <View style={pickerCard}>
     <Text style={{color:colors.text,fontSize:17,fontFamily:'Inter_700Bold',marginBottom:8}}>First due date</Text>
     <DateTimePicker value={pendingDate} mode="date" display="spinner" themeVariant={resolved} textColor={colors.text}
      style={{height:210,width:'100%',alignSelf:'center'}} onChange={(event,picked)=>{if(event.type==='set'&&picked)setPendingDate(picked)}}/>
     <View style={{flexDirection:'row',justifyContent:'flex-end',gap:10,marginTop:10}}>
      <Pressable accessibilityRole="button" onPress={()=>setDateOpen(false)} style={{padding:10}}><Text style={{color:colors.muted}}>Cancel</Text></Pressable>
      <Pressable accessibilityRole="button" onPress={()=>{setFirstDate(dateString(pendingDate));setDateOpen(false)}} style={{padding:10}}><Text style={{color:accent,fontFamily:'Inter_700Bold'}}>Done</Text></Pressable>
     </View>
    </View>
   </View>
  </Modal>
  <Modal visible={categoryOpen} transparent animationType="fade" presentationStyle="overFullScreen" onRequestClose={()=>setCategoryOpen(false)}>
   <View style={{flex:1,justifyContent:'center',paddingHorizontal:24,backgroundColor:'rgba(0,0,0,0.55)'}}>
    <Pressable accessibilityLabel="Dismiss categories" onPress={()=>setCategoryOpen(false)} style={{position:'absolute',top:0,bottom:0,left:0,right:0}}/>
    <View style={pickerCard}>
     <View style={{flexDirection:'row',justifyContent:'space-between',alignItems:'center',marginBottom:8}}>
      <Text style={{color:colors.text,fontSize:17,fontFamily:'Inter_700Bold'}}>Category</Text>
      <Pressable accessibilityRole="button" onPress={()=>setCategoryOpen(false)} style={{padding:8}}><Text style={{color:colors.muted}}>Close</Text></Pressable>
     </View>
     <ScrollView style={{maxHeight:390}} nestedScrollEnabled>
      {options.map((name,index)=><Pressable key={name} accessibilityRole="button" accessibilityState={{selected:category===name}}
       onPress={()=>{setCategory(name);setCategoryOpen(false)}} style={{flexDirection:'row',alignItems:'center',minHeight:47,borderBottomWidth:index===options.length-1?0:1,borderBottomColor:colors.border}}>
       <Text style={{flex:1,color:colors.text,fontSize:15}}>{name}</Text>
       {category===name?<Text style={{color:accent,fontSize:18,fontFamily:'Inter_700Bold'}}>✓</Text>:null}
      </Pressable>)}
     </ScrollView>
     <Body muted>Manage categories from Settings.</Body>
    </View>
   </View>
  </Modal>
 </Screen>;
}
