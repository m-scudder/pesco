import React,{useEffect,useState} from 'react';
import {Alert,Keyboard,Modal,Platform,Pressable,ScrollView,Text,TextInput,View} from 'react-native';
import DateTimePicker,{DateTimePickerAndroid} from '@react-native-community/datetimepicker';
import {Stack,useLocalSearchParams,useRouter} from 'expo-router';
import {Screen} from '@/components/Screen';
import {ScopeSwitch} from '@/components/UI';
import {Ionicons} from '@expo/vector-icons';
import {AmountCalculator} from '@/components/AmountCalculator';
import {localDate,parseMoney,useData} from '@/data';
import {useCategories} from '@/lib/CategoryContext';
import {useAppTheme} from '@/theme/ThemeContext';
export default function ExpenseEditor(){
 const {id}=useLocalSearchParams<{id?:string}>();const router=useRouter();const {expenses,add,update,remove,loaded,household,currentUserId}=useData();const {colors,resolved,scope,setScope}=useAppTheme();const editing=id?expenses.find(e=>e.id===id):undefined;
 const {names:categoryNames}=useCategories();
 const availableCategories=categoryNames(scope);
 const options=editing&&!availableCategories.includes(editing.category)?[editing.category,...availableCategories]:availableCategories;
 const [datePickerOpen,setDatePickerOpen]=useState(false);
 const [pendingDate,setPendingDate]=useState<Date>(()=>new Date(localDate()+'T12:00:00'));
 const [amount,setAmount]=useState('');const [category,setCategory]=useState<string>('Groceries');const [note,setNote]=useState('');const [date,setDate]=useState(localDate());const [categoryOpen,setCategoryOpen]=useState(false);const [submitting,setSubmitting]=useState(false);const [calculatorOpen,setCalculatorOpen]=useState(false);
 useEffect(()=>{if(!editing&&availableCategories.length&&!availableCategories.includes(category)){setCategory(availableCategories[0])}},[scope,availableCategories.join('|'),editing?.id]);
 useEffect(()=>{if(editing){setAmount((editing.amountPaise/100).toFixed(2));setCategory(editing.category);setNote(editing.note);setDate(editing.date);setScope(editing.scope)}},[editing?.id]);
 async function save(){if(submitting)return;const paise=parseMoney(amount);if(paise===null){Alert.alert('Invalid amount','Enter a positive amount with up to two decimal places.');return}const parsed=new Date(date+'T12:00:00');if(!/^\d{4}-\d{2}-\d{2}$/.test(date)||!Number.isFinite(parsed.valueOf())||parsed.getFullYear()!==Number(date.slice(0,4))||parsed.getMonth()+1!==Number(date.slice(5,7))||parsed.getDate()!==Number(date.slice(8,10))){Alert.alert('Invalid date','Use YYYY-MM-DD.');return}
 if(!category.trim()||(!options.includes(category)&&!editing)){Alert.alert('Category required','Choose a category or add one in Settings.');return}
 const draft={scope,amountPaise:paise,category,note:note.trim(),date};
 if(scope==='household'&&!household){Alert.alert('Household required','Create or join a household to share expenses.');return}
 if(editing&&editing.ownerId!=='local-user'&&editing.ownerId!==currentUserId){Alert.alert('Cannot edit','Only the person who added this expense can edit it.');return}
 const commit=async()=>{
  setSubmitting(true);
  try{
   if(editing)await update(editing.id,draft);else await add(draft);
   router.back();
  }catch(error){Alert.alert('Could not save',error instanceof Error?error.message:'Try again');setSubmitting(false)}
 };
 if(editing&&draft.scope!==editing.scope){
  Alert.alert('Cannot change type','Expense type cannot be changed after creation.');
  return;
 }
 await commit();
}
 function confirmDelete(){
  if(!editing||submitting)return;
  Alert.alert('Delete expense?','This cannot be undone.',[
   {text:'Cancel',style:'cancel'},
   {text:'Delete',style:'destructive',onPress:()=>{
    setSubmitting(true);
    void remove(editing.id).then(()=>router.back()).catch(error=>{
     setSubmitting(false);
     Alert.alert('Could not delete',error instanceof Error?error.message:'Please try again');
    });
   }}
  ]);
 }
 function formatISO(picked:Date){
  return picked.getFullYear()+'-'+String(picked.getMonth()+1).padStart(2,'0')+'-'+String(picked.getDate()).padStart(2,'0');
 }
 function openDatePicker(){
  Keyboard.dismiss();setCalculatorOpen(false);setCategoryOpen(false);
  const current=new Date(date+'T12:00:00');
  if(Platform.OS==='android'){
   DateTimePickerAndroid.open({
    value:current,mode:'date',
    onChange:(event,picked)=>{if(event.type==='set'&&picked)setDate(formatISO(picked))}
   });
  }else{setPendingDate(current);setDatePickerOpen(true)}
 }
 const pickerCard={backgroundColor:colors.surface,borderColor:colors.border,borderWidth:1 as const,borderRadius:16,padding:16,width:'100%' as const,maxWidth:420};
 const line=()=> <View style={{height:1,backgroundColor:colors.border}}/>;
 return <><Stack.Screen options={{title:editing?'Edit expense':'Add expense'}}/>
 <Screen modal>
  <View style={{alignItems:'center',paddingTop:18,paddingBottom:22,gap:7}}>
   <Text style={{color:colors.muted,fontFamily:'Inter_500Medium',fontSize:12,letterSpacing:0.8}}>AMOUNT</Text>
   <Pressable accessibilityRole="button" accessibilityLabel="Amount, open calculator" onPress={()=>{Keyboard.dismiss();setDatePickerOpen(false);setCategoryOpen(false);setCalculatorOpen(v=>!v)}}
    style={{minHeight:58,minWidth:180,justifyContent:'center',alignItems:'center',paddingHorizontal:16}}>
    <Text adjustsFontSizeToFit numberOfLines={1} style={{color:amount?colors.text:colors.muted,fontSize:30,fontFamily:'PlusJakartaSans_600SemiBold',fontVariant:['tabular-nums']}}>{amount?'₹ '+amount:'₹ 0.00'}</Text>
   </Pressable>
   <Text style={{color:colors.muted,fontSize:12}}>INR · Tap to edit</Text>
  </View>
  <View style={{marginBottom:18}}><ScopeSwitch/></View>
  <View style={{backgroundColor:colors.surface,borderRadius:12,borderWidth:1,borderColor:colors.border,paddingHorizontal:16}}>
   <Pressable accessibilityRole="button" accessibilityLabel="Choose category" onPress={()=>{Keyboard.dismiss();setCalculatorOpen(false);setDatePickerOpen(false);setCategoryOpen(true)}}
    style={{flexDirection:'row',alignItems:'center',gap:14,minHeight:68}}>
    <Ionicons name="pricetag-outline" size={19} color={colors.muted}/>
    <View style={{flex:1,gap:4}}>
     <Text style={{fontSize:11,color:colors.muted,fontFamily:'Inter_500Medium'}}>CATEGORY</Text>
     <Text style={{fontSize:15,color:colors.text,fontFamily:'Inter_500Medium'}}>{category||'Select category'}</Text>
    </View>
    <Ionicons name="chevron-forward" size={17} color={colors.muted}/>
   </Pressable>
   {line()}
   <Pressable accessibilityRole="button" accessibilityLabel="Choose expense date" onPress={openDatePicker}
    style={{flexDirection:'row',alignItems:'center',gap:14,minHeight:68}}>
    <Ionicons name="calendar-outline" size={19} color={colors.muted}/>
    <View style={{flex:1,gap:4}}>
     <Text style={{fontSize:11,color:colors.muted,fontFamily:'Inter_500Medium'}}>DATE</Text>
     <Text style={{fontSize:15,color:colors.text,fontFamily:'Inter_500Medium'}}>{new Date(date+'T12:00:00').toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'})}</Text>
    </View>
    <Ionicons name="chevron-forward" size={17} color={colors.muted}/>
   </Pressable>
   {line()}
   <View style={{flexDirection:'row',alignItems:'center',gap:14,minHeight:68}}>
    <Ionicons name="document-text-outline" size={19} color={colors.muted}/>
    <View style={{flex:1,gap:4,paddingVertical:10}}>
     <Text style={{fontSize:11,color:colors.muted,fontFamily:'Inter_500Medium'}}>NOTE</Text>
     <TextInput accessibilityLabel="Optional note" value={note} onChangeText={setNote} maxLength={500}
      placeholder="Add a note (optional)" placeholderTextColor={colors.muted}
      style={{fontSize:15,color:colors.text,padding:0,fontFamily:'Inter_400Regular'}}/>
    </View>
   </View>
  </View>
  <View style={{flex:1,minHeight:20}}/>
  <Modal visible={datePickerOpen} transparent animationType="fade" presentationStyle="overFullScreen" onRequestClose={()=>setDatePickerOpen(false)}>
 <View style={{flex:1,justifyContent:'center',paddingHorizontal:24,backgroundColor:'rgba(0,0,0,0.55)'}}>
  <Pressable onPress={()=>setDatePickerOpen(false)} style={{position:'absolute',top:0,bottom:0,left:0,right:0}} accessibilityLabel="Dismiss date picker"/>
  <View style={pickerCard}>
   <Text style={{color:colors.text,fontWeight:'700',fontSize:17,marginBottom:8}}>Select date</Text>
   <DateTimePicker value={pendingDate} mode="date" display="spinner" themeVariant={resolved} textColor={colors.text}
    style={{height:210,width:'100%',alignSelf:'center'}} onChange={(event,picked)=>{if(event.type==='set'&&picked)setPendingDate(picked)}}/>
   <View style={{flexDirection:'row',justifyContent:'flex-end',gap:10,marginTop:10}}>
    <Pressable accessibilityRole="button" onPress={()=>setDatePickerOpen(false)} style={{padding:10}}><Text style={{color:colors.muted,fontSize:14}}>Cancel</Text></Pressable>
    <Pressable accessibilityRole="button" onPress={()=>{setDate(formatISO(pendingDate));setDatePickerOpen(false)}} style={{padding:10}}><Text style={{color:colors.household,fontSize:14,fontWeight:'700'}}>Done</Text></Pressable>
   </View>
  </View>
 </View>
 </Modal>
 <Modal visible={categoryOpen} transparent animationType="fade" presentationStyle="overFullScreen" onRequestClose={()=>setCategoryOpen(false)}>
 <View style={{flex:1,justifyContent:'center',paddingHorizontal:24,backgroundColor:'rgba(0,0,0,0.55)'}}>
  <Pressable onPress={()=>setCategoryOpen(false)} style={{position:'absolute',top:0,bottom:0,left:0,right:0}} accessibilityLabel="Dismiss categories"/>
  <View style={pickerCard}>
   <View style={{flexDirection:'row',justifyContent:'space-between',alignItems:'center',marginBottom:8}}>
    <Text style={{color:colors.text,fontWeight:'700',fontSize:17}}>Category</Text>
    <Pressable accessibilityRole="button" onPress={()=>setCategoryOpen(false)} style={{padding:8}}><Text style={{color:colors.muted,fontSize:14}}>Close</Text></Pressable>
   </View>
   <ScrollView style={{maxHeight:390}} nestedScrollEnabled>
    {options.map((name,index)=><Pressable key={name} accessibilityRole="button" accessibilityState={{selected:category===name}}
     onPress={()=>{setCategory(name);setCategoryOpen(false)}} style={{flexDirection:'row',alignItems:'center',minHeight:47,borderBottomWidth:index===options.length-1?0:1,borderBottomColor:colors.border}}>
      <Text style={{flex:1,color:colors.text,fontSize:15}}>{name}</Text>
      {category===name?<Text style={{color:colors.household,fontSize:18,fontWeight:'700'}}>✓</Text>:null}
     </Pressable>)}
   </ScrollView>
   <Pressable accessibilityRole="button" onPress={()=>{setCategoryOpen(false);router.push('/categories')}} style={{paddingVertical:13,marginTop:6}}>
    <Text style={{color:colors.household,fontSize:14,fontWeight:'600'}}>Manage categories ›</Text>
   </Pressable>
  </View>
 </View>
 </Modal>
 {calculatorOpen?<AmountCalculator value={amount} onChange={setAmount} onDone={()=>setCalculatorOpen(false)}/>:null}<Pressable disabled={submitting||!loaded||calculatorOpen} onPress={()=>{void save()}} style={{backgroundColor:scope==='household'?colors.household:colors.personal,padding:15,borderRadius:7,alignItems:'center',marginTop:16,minHeight:50}}><Text style={{color:'#fff',fontFamily:'Inter_600SemiBold',fontSize:15}}>{submitting?'Saving…':editing?'Save changes':'Save expense'}</Text></Pressable>{editing?<Pressable accessibilityRole="button" accessibilityLabel="Delete expense" disabled={submitting} onPress={confirmDelete}
 style={{paddingVertical:16,alignItems:'center',opacity:submitting?0.5:1}}>
 <Text style={{color:'#C54B4B',fontFamily:'Inter_600SemiBold',fontSize:14}}>Delete expense</Text>
 </Pressable>:null}</Screen></>
}