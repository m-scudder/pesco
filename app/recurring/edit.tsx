import React,{useEffect,useRef,useState} from 'react';
import {Alert,Keyboard,KeyboardAvoidingView,Modal,Platform,Pressable,ScrollView,Text,TextInput,View} from 'react-native';
import DateTimePicker,{DateTimePickerAndroid} from '@react-native-community/datetimepicker';
import {Stack,useLocalSearchParams,useRouter} from 'expo-router';
import {Screen} from '@/components/Screen';
import {AmountCalculator} from '@/components/AmountCalculator';
import {BottomCategoryPicker} from '@/components/BottomCategoryPicker';
import {Ionicons} from '@expo/vector-icons';
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
 const [calculatorDisplay,setCalculatorDisplay]=useState('');
 const [calculatorOpen,setCalculatorOpen]=useState(!id);
 const [noteFocused,setNoteFocused]=useState(false);
 const scrollRef=useRef<ScrollView>(null);
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
     setAmount(String(amountValue/100));
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
  Keyboard.dismiss();setCategoryOpen(false);setCalculatorOpen(false);
  const value=new Date(firstDue+'T12:00:00');
  if(Platform.OS==='android')DateTimePickerAndroid.open({value,mode:'date',onChange:(event,date)=>{if(event.type==='set'&&date)setFirstDue(iso(date))}});
  else{setPendingDate(value);setDateOpen(true)}
 };
 const save=async()=>{
  if(busy)return;
  const value=parseMoney(amount.replace(/,/g,''));
  if(value===null){Alert.alert('Invalid amount','Enter a positive amount with up to two decimal places.');return}
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

 return <><Stack.Screen options={{title:id?'Edit recurring bill':'Add recurring bill',presentation:'card'}}/>
 <KeyboardAvoidingView style={{flex:1,backgroundColor:colors.background}} behavior={Platform.OS==='ios'?'padding':undefined} keyboardVerticalOffset={Platform.OS==='ios'?90:0}>
 <ScrollView ref={scrollRef} keyboardShouldPersistTaps="handled" keyboardDismissMode="interactive" contentContainerStyle={{paddingHorizontal:16,paddingTop:6,paddingBottom:20,gap:8}}>
 {loading?<Body muted>Loading bill…</Body>:loadError?<Body muted>{loadError}</Body>:<>
  <View style={{alignItems:'center',paddingTop:8,paddingBottom:10,gap:3}}>
   <Text style={{color:colors.muted,fontFamily:'Inter_500Medium',fontSize:12,letterSpacing:0.8}}>AMOUNT</Text>
   <Pressable accessibilityRole="button" accessibilityLabel="Amount, open calculator" onPress={()=>{Keyboard.dismiss();setCategoryOpen(false);setDateOpen(false);setCalculatorDisplay(amount||'0');setCalculatorOpen(true)}}
    style={{minHeight:50,minWidth:160,justifyContent:'center',alignItems:'center',paddingHorizontal:16}}>
    <Text adjustsFontSizeToFit numberOfLines={1} style={{color:amount?colors.text:colors.muted,fontSize:30,fontFamily:'PlusJakartaSans_600SemiBold',fontVariant:['tabular-nums']}}>{'₹ '+(calculatorOpen?calculatorDisplay||amount||'0':amount||'0')}</Text>
   </Pressable>
   <Text style={{color:colors.muted,fontSize:12}}>INR · Tap to edit</Text>
  </View>
  <View style={{marginBottom:5,gap:6}}>
   <View style={{flexDirection:'row',padding:3,borderRadius:11,backgroundColor:colors.secondary}}>
    <View style={{flex:1,alignItems:'center',paddingVertical:12,borderRadius:9,backgroundColor:accent}}>
     <Text style={{fontFamily:'Inter_600SemiBold',color:'#fff',fontSize:14}}>{scope==='household'?'Household':'Personal'}</Text>
    </View>
   </View>
   <Text style={{textAlign:'center',fontSize:12,color:colors.muted}}>{scope==='household'?'Shared recurring bill · Visible to household members':'Personal recurring bill · Visible only to you'}</Text>
  </View>
  <View style={{backgroundColor:colors.surface,borderRadius:12,borderWidth:1,borderColor:colors.border,paddingHorizontal:16}}>
   <Pressable accessibilityRole="button" accessibilityLabel="Choose category" onPress={()=>{Keyboard.dismiss();setCalculatorOpen(false);setDateOpen(false);setCategoryOpen(true)}}
    style={{flexDirection:'row',alignItems:'center',gap:14,minHeight:58}}>
    <Ionicons name="pricetag-outline" size={19} color={colors.muted}/>
    <View style={{flex:1,gap:4}}>
     <Text style={{fontSize:11,color:colors.muted,fontFamily:'Inter_500Medium'}}>CATEGORY</Text>
     <Text style={{fontSize:15,color:colors.text,fontFamily:'Inter_500Medium'}}>{category||'Select category'}</Text>
    </View>
    <Ionicons name="chevron-forward" size={17} color={colors.muted}/>
   </Pressable>
   {line()}
   <Pressable accessibilityRole="button" accessibilityLabel="Choose first due date" onPress={selectDate}
    style={{flexDirection:'row',alignItems:'center',gap:14,minHeight:58}}>
    <Ionicons name="calendar-outline" size={19} color={colors.muted}/>
    <View style={{flex:1,gap:4}}>
     <Text style={{fontSize:11,color:colors.muted,fontFamily:'Inter_500Medium'}}>FIRST DUE DATE</Text>
     <Text style={{fontSize:15,color:colors.text,fontFamily:'Inter_500Medium'}}>{labelDate(firstDue)}</Text>
    </View>
    <Ionicons name="chevron-forward" size={17} color={colors.muted}/>
   </Pressable>
   {line()}
   <View style={{flexDirection:'row',alignItems:'center',gap:14,minHeight:58}}>
    <Ionicons name="document-text-outline" size={19} color={colors.muted}/>
    <View style={{flex:1,gap:4,paddingVertical:10}}>
     <Text style={{fontSize:11,color:colors.muted,fontFamily:'Inter_500Medium'}}>NOTE</Text>
     <TextInput accessibilityLabel="Bill description" value={note} onChangeText={setNote} maxLength={500}
      onFocus={()=>{setNoteFocused(true);setCalculatorOpen(false);setTimeout(()=>scrollRef.current?.scrollToEnd({animated:true}),250)}} onBlur={()=>setNoteFocused(false)}
      placeholder="Add a note (optional)" placeholderTextColor={colors.muted}
      style={{fontSize:15,color:colors.text,padding:0,fontFamily:'Inter_400Regular'}}/>
    </View>
   </View>
  </View>
  <Text style={{fontSize:12,color:colors.muted,marginTop:4}}>Repeats monthly on the selected date. Short months use the last day.</Text>
  <Pressable accessibilityRole="button" disabled={busy} onPress={()=>{Keyboard.dismiss();void save()}}
   style={{backgroundColor:accent,minHeight:50,borderRadius:10,alignItems:'center',justifyContent:'center',marginTop:8,opacity:busy?0.6:1}}>
   <Text style={{color:'#fff',fontFamily:'Inter_600SemiBold',fontSize:15}}>{busy?'Saving…':id?'Save changes':'Save recurring bill'}</Text>
  </Pressable>
 </>}
 </ScrollView>
 {!noteFocused&&categoryOpen&&!loading&&!loadError?<View style={{paddingHorizontal:12,paddingBottom:8,backgroundColor:colors.background}}>
  <BottomCategoryPicker options={options} selected={category} onSelect={name=>{setCategory(name);setCategoryOpen(false)}} onClose={()=>setCategoryOpen(false)} onEdit={()=>{setCategoryOpen(false);router.push('/categories')}}/>
 </View>:null}
 {!noteFocused&&calculatorOpen&&!loading&&!loadError?<View style={{paddingHorizontal:12,paddingTop:6,paddingBottom:8,backgroundColor:colors.background}}>
  <AmountCalculator value={amount} onChange={setAmount} onDisplayChange={setCalculatorDisplay} onDone={()=>setCalculatorOpen(false)}/>
 </View>:null}
 </KeyboardAvoidingView>
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
</>;
}
