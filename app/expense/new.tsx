import {fontSizes,fontFamilies,fontWeights} from '@/theme/typography';
import React,{useEffect,useRef,useState} from 'react';
import {Alert,Keyboard,KeyboardAvoidingView,Modal,Platform,Pressable,ScrollView,Text,TextInput,View} from 'react-native';
import {Stack,useLocalSearchParams,useRouter} from 'expo-router';
import {Screen} from '@/components/Screen';
import {ScopeSwitch} from '@/components/UI';
import {Ionicons} from '@expo/vector-icons';
import {AmountCalculator} from '@/components/AmountCalculator';
import {BottomCategoryPicker} from '@/components/BottomCategoryPicker';
import {CalendarDatePicker} from '@/components/CalendarDatePicker';
import {localDate,parseMoney,useData} from '@/data';
import {useCategories} from '@/lib/CategoryContext';
import {useAppTheme} from '@/theme/ThemeContext';
export default function ExpenseEditor(){
 const {id}=useLocalSearchParams<{id?:string}>();const router=useRouter();const {expenses,add,update,remove,loaded,household,currentUserId}=useData();const {colors,resolved,scope,setScope}=useAppTheme();const editing=id?expenses.find(e=>e.id===id):undefined;
 const {names:categoryNames}=useCategories();
 const availableCategories=categoryNames(scope);
 const options=editing&&!availableCategories.includes(editing.category)?[editing.category,...availableCategories]:availableCategories;
 const [datePickerOpen,setDatePickerOpen]=useState(false);
 const scrollRef=useRef<ScrollView>(null);
 const [noteFocused,setNoteFocused]=useState(false);
 const [calculatorDisplay,setCalculatorDisplay]=useState('');
 const [amountConfirmed,setAmountConfirmed]=useState(Boolean(id));
 const [amount,setAmount]=useState('');const [category,setCategory]=useState<string>('Groceries');const [note,setNote]=useState('');const [date,setDate]=useState(localDate());const [categoryOpen,setCategoryOpen]=useState(false);const [submitting,setSubmitting]=useState(false);const [calculatorOpen,setCalculatorOpen]=useState(!id);
 useEffect(()=>{if(!editing&&availableCategories.length&&!availableCategories.includes(category)){setCategory(availableCategories[0])}},[scope,availableCategories.join('|'),editing?.id]);
 useEffect(()=>{if(editing){setAmount(String(editing.amountPaise/100));setAmountConfirmed(true);setCategory(editing.category);setNote(editing.note);setDate(editing.date);setScope(editing.scope)}},[editing?.id]);
 async function save(){if(submitting)return;if(!amountConfirmed){Alert.alert('Confirm amount','Tap the checkmark on the calculator to apply your amount before saving.');setCalculatorOpen(true);return;}const paise=parseMoney(amount);if(paise===null){Alert.alert('Invalid amount','Enter a positive amount with up to two decimal places.');return}const parsed=new Date(date+'T12:00:00');if(!/^\d{4}-\d{2}-\d{2}$/.test(date)||!Number.isFinite(parsed.valueOf())||parsed.getFullYear()!==Number(date.slice(0,4))||parsed.getMonth()+1!==Number(date.slice(5,7))||parsed.getDate()!==Number(date.slice(8,10))){Alert.alert('Invalid date','Use YYYY-MM-DD.');return}
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
 function openDatePicker(){
  Keyboard.dismiss();setCalculatorOpen(false);setCategoryOpen(false);
  setDatePickerOpen(true);
 }
 const pickerCard={backgroundColor:colors.surface,borderColor:colors.border,borderWidth:1 as const,borderRadius:16,padding:16,width:'100%' as const,maxWidth:420};
 const line=()=> <View style={{height:1,backgroundColor:colors.border}}/>;
 return <><Stack.Screen options={{title:editing?'Edit Expense':'Add Expense'}}/>
 <KeyboardAvoidingView style={{flex:1,backgroundColor:colors.background}} behavior={Platform.OS==='ios'?'padding':undefined} keyboardVerticalOffset={Platform.OS==='ios'?90:0}>
 <ScrollView ref={scrollRef} keyboardShouldPersistTaps="handled" keyboardDismissMode="interactive" contentContainerStyle={{paddingHorizontal:16,paddingTop:6,paddingBottom:12,gap:8}}>
  <View style={{alignItems:'center',paddingTop:8,paddingBottom:10,gap:3}}>
   <Text style={{color:colors.muted,fontFamily:fontFamilies.medium,fontSize:fontSizes.caption,letterSpacing:0.8}}>AMOUNT</Text>
   <Pressable accessibilityRole="button" accessibilityLabel="Amount, open calculator" onPress={()=>{Keyboard.dismiss();setDatePickerOpen(false);setCategoryOpen(false);setCalculatorDisplay(amount||'0');setCalculatorOpen(v=>!v)}}
    style={{minHeight:50,minWidth:160,justifyContent:'center',alignItems:'center',paddingHorizontal:16}}>
    <Text adjustsFontSizeToFit numberOfLines={1} style={{color:amount?colors.text:colors.muted,fontSize:fontSizes.display,fontFamily:fontFamilies.displaySemibold,fontVariant:['tabular-nums']}}>{'₹ '+(calculatorOpen?calculatorDisplay||'0':amount||'0')}</Text>
   </Pressable>
   {calculatorOpen?<Text style={{color:colors.muted,fontSize:fontSizes.caption}}>Tap ✓ to apply amount</Text>:null}
  </View>
  <View style={{marginBottom:5,gap:6}}><ScopeSwitch/><Text accessibilityRole="text" style={{textAlign:'center',fontSize:fontSizes.caption,color:colors.muted}}>{scope==='household'?'Shared expense · Visible to household members':'Personal expense · Visible only to you'}</Text></View>
  <View style={{backgroundColor:colors.surface,borderRadius:12,borderWidth:1,borderColor:colors.border,paddingHorizontal:16}}>
   <Pressable accessibilityRole="button" accessibilityLabel="Choose category" onPress={()=>{Keyboard.dismiss();setCalculatorOpen(false);setDatePickerOpen(false);setCategoryOpen(true)}}
    style={{flexDirection:'row',alignItems:'center',gap:14,minHeight:58}}>
    <Ionicons name="pricetag-outline" size={19} color={colors.muted}/>
    <View style={{flex:1,gap:4}}>
     <Text style={{fontSize:fontSizes.caption,color:colors.muted,fontFamily:fontFamilies.medium}}>CATEGORY</Text>
     <Text style={{fontSize:fontSizes.input,color:colors.text,fontFamily:fontFamilies.medium}}>{category||'Select category'}</Text>
    </View>
    <Ionicons name="chevron-forward" size={17} color={colors.muted}/>
   </Pressable>
   {line()}
   <Pressable accessibilityRole="button" accessibilityLabel="Choose expense date" onPress={openDatePicker}
    style={{flexDirection:'row',alignItems:'center',gap:14,minHeight:58}}>
    <Ionicons name="calendar-outline" size={19} color={colors.muted}/>
    <View style={{flex:1,gap:4}}>
     <Text style={{fontSize:fontSizes.caption,color:colors.muted,fontFamily:fontFamilies.medium}}>DATE</Text>
     <Text style={{fontSize:fontSizes.input,color:colors.text,fontFamily:fontFamilies.medium}}>{new Date(date+'T12:00:00').toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'})}</Text>
    </View>
    <Ionicons name="chevron-forward" size={17} color={colors.muted}/>
   </Pressable>
   {line()}
   <View style={{flexDirection:'row',alignItems:'center',gap:14,minHeight:58}}>
    <Ionicons name="document-text-outline" size={19} color={colors.muted}/>
    <View style={{flex:1,gap:4,paddingVertical:10}}>
     <Text style={{fontSize:fontSizes.caption,color:colors.muted,fontFamily:fontFamilies.medium}}>NOTE</Text>
     <TextInput accessibilityLabel="Optional note" value={note} onChangeText={setNote} maxLength={500}
      onFocus={()=>{setNoteFocused(true);setCalculatorOpen(false);setTimeout(()=>scrollRef.current?.scrollToEnd({animated:true}),250)}} onBlur={()=>setNoteFocused(false)}
      placeholder="Add a note (optional)" placeholderTextColor={colors.muted}
      style={{fontSize:fontSizes.input,color:colors.text,padding:0,fontFamily:fontFamilies.regular}}/>
    </View>
   </View>
  </View>
  <View style={{height:4}}/>
  <Pressable accessibilityRole="button" disabled={submitting||!loaded} onPress={()=>{Keyboard.dismiss();void save()}}
   style={{backgroundColor:scope==='household'?colors.household:colors.personal,minHeight:50,borderRadius:10,alignItems:'center',justifyContent:'center',marginTop:8,opacity:submitting||!loaded?0.6:1}}>
   <Text style={{color:'#fff',fontFamily:fontFamilies.semibold,fontSize:fontSizes.input}}>{submitting?'Saving…':editing?'Save Changes':'Save Expense'}</Text>
  </Pressable>
  {editing?<Pressable accessibilityRole="button" accessibilityLabel="Delete expense" disabled={submitting} onPress={confirmDelete}
   style={{paddingVertical:11,alignItems:'center',opacity:submitting?0.5:1}}>
   <Text style={{color:'#C54B4B',fontFamily:fontFamilies.semibold,fontSize:fontSizes.body}}>Delete Expense</Text>
  </Pressable>:null}
  <CalendarDatePicker visible={datePickerOpen} value={date} onChange={setDate} onClose={()=>setDatePickerOpen(false)}/>
 </ScrollView>
 {!noteFocused&&categoryOpen?<View style={{paddingHorizontal:12,paddingTop:6,paddingBottom:8,backgroundColor:colors.background,borderTopWidth:1,borderTopColor:colors.border}}>
  <BottomCategoryPicker options={options} selected={category} onSelect={name=>{setCategory(name);setCategoryOpen(false)}} onClose={()=>setCategoryOpen(false)} onEdit={()=>{setCategoryOpen(false);router.push('/categories')}}/>
 </View>:null}
 {!noteFocused&&calculatorOpen?<View style={{paddingHorizontal:12,paddingTop:6,paddingBottom:8,backgroundColor:colors.background,borderTopWidth:1,borderTopColor:colors.border}}>
  <AmountCalculator value={amount} onChange={value=>{setAmount(value);setAmountConfirmed(true)}} onDisplayChange={display=>{setCalculatorDisplay(display);setAmountConfirmed(false)}} onDone={()=>setCalculatorOpen(false)}/>
 </View>:null}
 </KeyboardAvoidingView></>
}
