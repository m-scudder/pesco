import React,{useEffect,useState} from 'react';
import {Alert,Keyboard,Platform,Pressable,Text,TextInput,View} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import {Stack,useLocalSearchParams,useRouter} from 'expo-router';
import {Screen} from '@/components/Screen';
import {Body,Card,ScopeSwitch} from '@/components/UI';
import {AmountCalculator} from '@/components/AmountCalculator';
import {localDate,parseMoney,useData} from '@/data';
import {useCategories} from '@/lib/CategoryContext';
import {useAppTheme} from '@/theme/ThemeContext';
export default function ExpenseEditor(){
 const {id}=useLocalSearchParams<{id?:string}>();const router=useRouter();const {expenses,add,update,loaded,household,currentUserId}=useData();const {colors,scope,setScope}=useAppTheme();const editing=id?expenses.find(e=>e.id===id):undefined;
 const {names:categoryNames}=useCategories();
 const availableCategories=categoryNames(scope);
 const options=editing&&!availableCategories.includes(editing.category)?[editing.category,...availableCategories]:availableCategories;
 const [datePickerOpen,setDatePickerOpen]=useState(false);
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
 const line=()=> <View style={{height:1,backgroundColor:colors.border}}/>;
 return <><Stack.Screen options={{title:editing?'Edit expense':'Add expense'}}/><Screen modal><ScopeSwitch/><Card><View style={{flexDirection:'row',alignItems:'center',minHeight:44}}><View style={{width:84}}><Body>Date</Body></View><Pressable accessibilityRole="button" accessibilityLabel="Choose expense date" onPress={()=>{Keyboard.dismiss();setCalculatorOpen(false);setCategoryOpen(false);setDatePickerOpen(open=>!open)}} style={{flex:1,minHeight:44,justifyContent:'center'}}>
 <Text style={{color:colors.text,fontSize:15}}>{new Date(date+'T12:00:00').toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'})}  ▾</Text>
 </Pressable></View>{line()}<View style={{flexDirection:'row',alignItems:'center',minHeight:44}}><View style={{width:84}}><Body>Amount</Body></View><Pressable accessibilityRole="button" accessibilityLabel="Amount, open calculator" onPress={()=>{Keyboard.dismiss();setDatePickerOpen(false);setCategoryOpen(false);setCalculatorOpen(open=>!open)}} style={{flex:1,minHeight:44,justifyContent:'center'}}><Text style={{color:amount?colors.text:colors.muted,fontSize:20}}>{amount?'₹'+amount:'₹0.00'}</Text></Pressable></View>{line()}<Pressable onPress={()=>setCategoryOpen(v=>!v)} style={{flexDirection:'row',alignItems:'center',minHeight:44}}><View style={{width:84}}><Body>Category</Body></View><Text style={{flex:1,color:colors.text}}>{category} ⌄</Text></Pressable>{categoryOpen?<View style={{flexDirection:'row',flexWrap:'wrap',gap:8}}>{options.map(c=><Pressable key={c} onPress={()=>{setCategory(c);setCategoryOpen(false)}} style={{padding:9,borderRadius:8,backgroundColor:colors.secondary}}><Text style={{color:colors.text}}>{c}</Text></Pressable> )}<Pressable onPress={()=>{setCategoryOpen(false);router.push('/categories')}} style={{padding:9}}><Text style={{color:colors.household,fontSize:13,fontWeight:'600'}}>Manage categories ›</Text></Pressable></View>:null}{line()}<View style={{flexDirection:'row',alignItems:'center',minHeight:44}}><View style={{width:84}}><Body>Note</Body></View><TextInput accessibilityLabel="Optional note" value={note} onChangeText={setNote} maxLength={500} placeholder="Optional" placeholderTextColor={colors.muted} style={{flex:1,color:colors.text}}/></View></Card>{datePickerOpen?<View style={{backgroundColor:colors.surface,borderRadius:12,padding:12,borderWidth:1,borderColor:colors.border}}>
 <DateTimePicker value={new Date(date+'T12:00:00')} mode="date" display={Platform.OS==='ios'?'spinner':'default'} onChange={(event,picked)=>{
  if(Platform.OS!=='ios')setDatePickerOpen(false);
  if(event.type==='dismissed'||!picked)return;
  const year=picked.getFullYear();const month=String(picked.getMonth()+1).padStart(2,'0');const day=String(picked.getDate()).padStart(2,'0');
  setDate(year+'-'+month+'-'+day);
 }}/>
 {Platform.OS==='ios'?<Pressable accessibilityRole="button" onPress={()=>setDatePickerOpen(false)} style={{alignSelf:'flex-end',paddingVertical:9,paddingHorizontal:12}}><Text style={{color:colors.household,fontWeight:'600'}}>Done</Text></Pressable>:null}
 </View>:null}{calculatorOpen?<AmountCalculator value={amount} onChange={setAmount} onDone={()=>setCalculatorOpen(false)}/>:null}<Pressable disabled={submitting||!loaded||calculatorOpen} onPress={()=>{void save()}} style={{backgroundColor:scope==='household'?colors.household:colors.personal,padding:13,borderRadius:10,alignItems:'center'}}><Text style={{color:'#fff',fontWeight:'700'}}>{editing?'Save changes':'Save expense'}</Text></Pressable></Screen></>
}