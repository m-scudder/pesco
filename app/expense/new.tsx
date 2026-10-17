import {fontSizes,fontFamilies,fontWeights} from '@/theme/typography';
import React,{useEffect,useRef,useState} from 'react';
import {Alert,Image,Keyboard,KeyboardAvoidingView,Modal,Platform,Pressable,ScrollView,Text,TextInput,View} from 'react-native';
import {Stack,useLocalSearchParams,useRouter} from 'expo-router';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {Screen} from '@/components/Screen';
import {ScopeSwitch} from '@/components/UI';
import {Ionicons} from '@expo/vector-icons';
import {AmountCalculator} from '@/components/AmountCalculator';
import {BottomCategoryPicker} from '@/components/BottomCategoryPicker';
import {CalendarDatePicker} from '@/components/CalendarDatePicker';
import {ExpenseReceipts,uploadReceiptFile,type LocalReceipt} from '@/components/ExpenseReceipts';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import {supabase} from '@/lib/supabase';
import {localDate,parseMoney,useData} from '@/data';
import {useCategories} from '@/lib/CategoryContext';
import {useAppTheme} from '@/theme/ThemeContext';
export default function ExpenseEditor(){
 const {id,scope:initialScope}=useLocalSearchParams<{id?:string;scope?:'household'|'personal'}>();const router=useRouter();const {expenses,add,syncNow,update,remove,loaded,household,currentUserId}=useData();const {colors,resolved,scope,setScope}=useAppTheme();const editing=id?expenses.find(e=>e.id===id):undefined;
 const {names:categoryNames}=useCategories();
 const availableCategories=categoryNames(scope);
 const options=editing&&!availableCategories.includes(editing.category)?[editing.category,...availableCategories]:availableCategories;
 const [datePickerOpen,setDatePickerOpen]=useState(false);
 const scrollRef=useRef<ScrollView>(null);
 const insets=useSafeAreaInsets();
 const [noteFocused,setNoteFocused]=useState(false);
 const [deleting,setDeleting]=useState(false);
 const [calculatorDisplay,setCalculatorDisplay]=useState('');
 const [draftReceipts,setDraftReceipts]=useState<LocalReceipt[]>([]);
 const createdId=useRef<string|null>(null);
 const addDraftReceipt=(file:LocalReceipt)=>setDraftReceipts(prev=>prev.length>=5?prev:[...prev,file]);
 const pickDraftPhoto=async(camera:boolean)=>{
  if(camera){
   const {granted}=await ImagePicker.requestCameraPermissionsAsync();
   if(!granted){Alert.alert('Camera access required','Allow PESCO to use the camera in device settings.');return}
  }
  const result=camera?await ImagePicker.launchCameraAsync({mediaTypes:['images'],quality:0.75}):
   await ImagePicker.launchImageLibraryAsync({mediaTypes:['images'],quality:0.75});
  if(result.canceled)return;
  for(const file of result.assets.slice(0,5-draftReceipts.length)){
   addDraftReceipt({uri:file.uri,name:file.fileName??'Receipt.jpg',mime:file.mimeType??'image/jpeg'});
  }
 };
 const pickDraftFile=async()=>{
  const result=await DocumentPicker.getDocumentAsync({type:['application/pdf','image/jpeg','image/png','image/webp'],copyToCacheDirectory:true});
  if(!result.canceled)for(const file of result.assets.slice(0,5-draftReceipts.length))
   addDraftReceipt({uri:file.uri,name:file.name,mime:file.mimeType??'application/pdf'});
 };
 const chooseDraftReceipt=()=>{
  if(scope==='personal'){Alert.alert('Household receipts','Receipt attachments are currently available for household expenses.');return}
  if(draftReceipts.length>=5){Alert.alert('Receipt limit','A maximum of five receipts is supported.');return}
  Keyboard.dismiss();setCalculatorOpen(false);setCategoryOpen(false);
  Alert.alert('Add Receipt','Select a source',[
   {text:'Camera',onPress:()=>{void pickDraftPhoto(true)}},
   {text:'Photo Library',onPress:()=>{void pickDraftPhoto(false)}},
   {text:'File',onPress:()=>{void pickDraftFile()}},
   {text:'Cancel',style:'cancel'}
  ]);
 };

 const [amount,setAmount]=useState('');const [category,setCategory]=useState<string>('Groceries');const [note,setNote]=useState('');const [date,setDate]=useState(localDate());const [categoryOpen,setCategoryOpen]=useState(false);const [submitting,setSubmitting]=useState(false);const [calculatorOpen,setCalculatorOpen]=useState(!id);
 useEffect(()=>{if(!id&&(initialScope==='household'||initialScope==='personal'))setScope(initialScope)},[id,initialScope,setScope]);
 useEffect(()=>{if(!editing&&availableCategories.length&&!availableCategories.includes(category)){setCategory(availableCategories[0])}},[scope,availableCategories.join('|'),editing?.id]);
 useEffect(()=>{if(editing){setAmount(String(editing.amountPaise/100));setCategory(editing.category);setNote(editing.note);setDate(editing.date);setScope(editing.scope)}},[editing?.id]);
 async function save(){if(submitting)return;const paise=parseMoney(amount);if(paise===null){Alert.alert('Invalid amount','Enter a positive amount with up to two decimal places.');return}const parsed=new Date(date+'T12:00:00');if(!/^\d{4}-\d{2}-\d{2}$/.test(date)||!Number.isFinite(parsed.valueOf())||parsed.getFullYear()!==Number(date.slice(0,4))||parsed.getMonth()+1!==Number(date.slice(5,7))||parsed.getDate()!==Number(date.slice(8,10))){Alert.alert('Invalid date','Use YYYY-MM-DD.');return}
 if(!category.trim()||(!options.includes(category)&&!editing)){Alert.alert('Category required','Choose a category or add one in Settings.');return}
 const draft={scope,amountPaise:paise,category,note:note.trim(),date};
 if(scope==='household'&&!household){Alert.alert('Household required','Create or join a household to share expenses.');return}
 if(editing&&editing.ownerId!=='local-user'&&editing.ownerId!==currentUserId){Alert.alert('Cannot edit','Only the person who added this expense can edit it.');return}
 const commit=async()=>{
  setSubmitting(true);
  try{
   if(editing)await update(editing.id,draft);
   else if(!createdId.current)createdId.current=await add(draft);
   if(!editing&&draftReceipts.length){
    if(!supabase||scope!=='household')throw new Error('Receipt uploads require a household account');
    await syncNow();
    const {data:exists,error:lookupError}=await supabase.from('expenses').select('id').eq('id',createdId.current!).maybeSingle();
    if(lookupError||!exists)throw new Error('Expense saved locally. Could not upload receipts yet. Reopen this screen when syncing completes.');
    for(const file of draftReceipts){
     await uploadReceiptFile(createdId.current!,file);
     setDraftReceipts(prev=>prev.filter(item=>item!==file));
    }
   }
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
  if(!editing||submitting||deleting)return;
  Alert.alert('Delete expense?','This cannot be undone.',[
   {text:'Cancel',style:'cancel'},
   {text:'Delete',style:'destructive',onPress:()=>{
    setDeleting(true);
    void remove(editing.id).then(()=>router.back()).catch(error=>{
     setDeleting(false);
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
   <Text style={{color:colors.muted,fontFamily:fontFamilies.medium,fontSize:fontSizes.caption,letterSpacing:0}}>Amount</Text>
   <Pressable accessibilityRole="button" accessibilityLabel="Amount, open calculator" onPress={()=>{Keyboard.dismiss();setDatePickerOpen(false);setCategoryOpen(false);setCalculatorDisplay(amount||'0');setCalculatorOpen(v=>!v)}}
    style={{minHeight:50,minWidth:160,justifyContent:'center',alignItems:'center',paddingHorizontal:16}}>
    <Text adjustsFontSizeToFit numberOfLines={1} style={{color:amount?colors.text:colors.muted,fontSize:fontSizes.display,fontFamily:fontFamilies.displaySemibold,fontVariant:['tabular-nums']}}>{'₹ '+(calculatorOpen?calculatorDisplay||'0':amount||'0')}</Text>
   </Pressable>

  </View>
  {editing?
   <View style={{alignItems:'center',marginBottom:5}}>
    <View accessibilityRole="text" style={{flexDirection:'row',alignItems:'center',gap:7,paddingHorizontal:12,paddingVertical:7,borderRadius:20,backgroundColor:colors.secondary}}>
     <Ionicons name={editing.scope==='household'?'people-outline':'lock-closed-outline'} size={15} color={colors.muted}/>
     <Text style={{fontFamily:fontFamilies.medium,fontSize:fontSizes.label,color:colors.text}}>
      {editing.scope==='household'?'Household expense':'Personal expense'}
     </Text>
    </View>
   </View>:
   <View style={{marginBottom:5,gap:6}}><ScopeSwitch/><Text accessibilityRole="text" style={{textAlign:'center',fontSize:fontSizes.caption,color:colors.muted}}>{scope==='household'?'Shared expense · Visible to household members':'Personal expense · Visible only to you'}</Text></View>}
  <View style={{backgroundColor:colors.surface,borderRadius:12,borderWidth:1,borderColor:colors.border,paddingHorizontal:16}}>
   <Pressable accessibilityRole="button" accessibilityLabel="Choose category" onPress={()=>{Keyboard.dismiss();setCalculatorOpen(false);setDatePickerOpen(false);setCategoryOpen(true)}}
    style={{flexDirection:'row',alignItems:'center',gap:14,minHeight:58}}>
    <Ionicons name="pricetag-outline" size={19} color={colors.muted}/>
    <View style={{flex:1,gap:4}}>
     <Text style={{fontSize:fontSizes.caption,color:colors.muted,fontFamily:fontFamilies.medium}}>Category</Text>
     <Text style={{fontSize:fontSizes.input,color:colors.text,fontFamily:fontFamilies.medium}}>{category||'Select category'}</Text>
    </View>
    <Ionicons name="chevron-forward" size={17} color={colors.muted}/>
   </Pressable>
   {line()}
   <Pressable accessibilityRole="button" accessibilityLabel="Choose expense date" onPress={openDatePicker}
    style={{flexDirection:'row',alignItems:'center',gap:14,minHeight:58}}>
    <Ionicons name="calendar-outline" size={19} color={colors.muted}/>
    <View style={{flex:1,gap:4}}>
     <Text style={{fontSize:fontSizes.caption,color:colors.muted,fontFamily:fontFamilies.medium}}>Date</Text>
     <Text style={{fontSize:fontSizes.input,color:colors.text,fontFamily:fontFamilies.medium}}>{new Date(date+'T12:00:00').toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'})}</Text>
    </View>
    <Ionicons name="chevron-forward" size={17} color={colors.muted}/>
   </Pressable>
   {line()}
   <View style={{flexDirection:'row',alignItems:'center',gap:14,minHeight:58}}>
    <Ionicons name="document-text-outline" size={19} color={colors.muted}/>
    <View style={{flex:1,gap:4,paddingVertical:10}}>
     <Text style={{fontSize:fontSizes.caption,color:colors.muted,fontFamily:fontFamilies.medium}}>Note</Text>
     <TextInput accessibilityLabel="Optional note" value={note} onChangeText={setNote} maxLength={500}
      onFocus={()=>{setNoteFocused(true);setCalculatorOpen(false);setTimeout(()=>scrollRef.current?.scrollToEnd({animated:true}),250)}} onBlur={()=>setNoteFocused(false)}
      placeholder="Add a note (optional)" placeholderTextColor={colors.muted}
      style={{fontSize:fontSizes.input,color:colors.text,padding:0,fontFamily:fontFamilies.regular}}/>
    </View>
   </View>
   {line()}
   <View style={{flexDirection:'row',alignItems:'center',gap:14,minHeight:64,paddingVertical:12}}>
    <Ionicons name="receipt-outline" size={19} color={colors.muted}/>
    <View style={{flex:1,gap:7}}>
     <Text style={{fontSize:fontSizes.caption,color:colors.muted,fontFamily:fontFamilies.medium}}>Receipts</Text>
     {editing?<ExpenseReceipts expenseId={editing.id} editable={editing.ownerId==='local-user'||editing.ownerId===currentUserId}/>:
      <View style={{flexDirection:'row',gap:8,alignItems:'center',flexWrap:'wrap'}}>
       <Pressable accessibilityRole="button" onPress={chooseDraftReceipt} style={{borderRadius:9,borderWidth:1,borderColor:colors.border,backgroundColor:colors.secondary,paddingHorizontal:12,paddingVertical:9}}>
        <Text style={{fontSize:fontSizes.label,color:colors.text,fontFamily:fontFamilies.medium}}>Add Receipt</Text>
       </Pressable>
       {draftReceipts.map((file,index)=><View key={file.uri+index} style={{width:48,height:48}}>
        {file.mime.startsWith('image/')?<Image source={{uri:file.uri}} style={{width:44,height:44,borderRadius:7}}/>:
         <Ionicons name="document-text-outline" size={26} color={colors.muted}/>}
        <Pressable accessibilityLabel={'Remove receipt '+(index+1)} accessibilityRole="button" onPress={()=>setDraftReceipts(prev=>prev.filter((_,i)=>i!==index))}
         style={{position:'absolute',top:-4,right:-4,width:23,height:23,borderRadius:12,backgroundColor:colors.secondary,alignItems:'center',justifyContent:'center',borderWidth:1,borderColor:colors.border}}>
         <Ionicons name="close" color={colors.text} size={15}/>
        </Pressable>
       </View>)}
      </View>}
    </View>
   </View>
  </View>
  <View style={{height:4}}/>
  <Pressable accessibilityRole="button" disabled={submitting||!loaded} onPress={()=>{Keyboard.dismiss();void save()}}
   style={{backgroundColor:scope==='household'?colors.household:colors.personal,minHeight:50,borderRadius:10,alignItems:'center',justifyContent:'center',marginTop:8,opacity:submitting||!loaded?0.6:1}}>
   <Text style={{color:'#fff',fontFamily:fontFamilies.semibold,fontSize:fontSizes.input}}>{submitting?'Saving…':editing?'Save Changes':'Save Expense'}</Text>
  </Pressable>
  {editing?<Pressable accessibilityRole="button" accessibilityLabel="Delete expense" disabled={submitting||deleting} onPress={confirmDelete}
   style={{paddingVertical:11,alignItems:'center',opacity:submitting?0.5:1}}>
   <Text style={{color:'#C54B4B',fontFamily:fontFamilies.semibold,fontSize:fontSizes.body}}>{deleting?'Deleting…':'Delete Expense'}</Text>
  </Pressable>:null}
  <CalendarDatePicker visible={datePickerOpen} value={date} onChange={setDate} onClose={()=>setDatePickerOpen(false)}/>
 </ScrollView>
 {!noteFocused&&categoryOpen?<View style={{paddingHorizontal:12,paddingTop:6,paddingBottom:Math.max(insets.bottom,12),backgroundColor:colors.background,borderTopWidth:1,borderTopColor:colors.border}}>
  <BottomCategoryPicker options={options} selected={category} onSelect={name=>{setCategory(name);setCategoryOpen(false)}} onClose={()=>setCategoryOpen(false)} onEdit={()=>{setCategoryOpen(false);router.push('/categories')}}/>
 </View>:null}
 {!noteFocused&&calculatorOpen?<View style={{paddingHorizontal:12,paddingTop:6,paddingBottom:Math.max(insets.bottom,12),backgroundColor:colors.background,borderTopWidth:1,borderTopColor:colors.border}}>
  <AmountCalculator value={amount} onChange={setAmount} onDisplayChange={setCalculatorDisplay} onDone={()=>setCalculatorOpen(false)}/>
 </View>:null}
 </KeyboardAvoidingView></>
}
