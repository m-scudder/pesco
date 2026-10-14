import React,{useEffect,useState} from 'react';
import {Alert,Pressable,Text,TextInput,View} from 'react-native';
import {useLocalSearchParams,useRouter} from 'expo-router';
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
 return <Screen><ScopeSwitch/><Card><View style={{flexDirection:'row',alignItems:'center',minHeight:44}}><View style={{width:84}}><Body>Date</Body></View><TextInput accessibilityLabel="Expense date" value={date} onChangeText={setDate} placeholder="YYYY-MM-DD" placeholderTextColor={colors.muted} style={{flex:1,color:colors.text,fontSize:15}}/></View>{line()}<View style={{flexDirection:'row',alignItems:'center',minHeight:44}}><View style={{width:84}}><Body>Amount</Body></View><Pressable accessibilityRole="button" accessibilityLabel="Amount, open calculator" onPress={()=>setCalculatorOpen(open=>!open)} style={{flex:1,minHeight:44,justifyContent:'center'}}><Text style={{color:amount?colors.text:colors.muted,fontSize:20}}>{amount?'₹'+amount:'₹0.00'}</Text></Pressable></View>{line()}<Pressable onPress={()=>setCategoryOpen(v=>!v)} style={{flexDirection:'row',alignItems:'center',minHeight:44}}><View style={{width:84}}><Body>Category</Body></View><Text style={{flex:1,color:colors.text}}>{category} ⌄</Text></Pressable>{categoryOpen?<View style={{flexDirection:'row',flexWrap:'wrap',gap:8}}>{options.map(c=><Pressable key={c} onPress={()=>{setCategory(c);setCategoryOpen(false)}} style={{padding:9,borderRadius:8,backgroundColor:colors.secondary}}><Text style={{color:colors.text}}>{c}</Text></Pressable> )}<Pressable onPress={()=>{setCategoryOpen(false);router.push('/categories')}} style={{padding:9}}><Text style={{color:colors.household,fontSize:13,fontWeight:'600'}}>Manage categories ›</Text></Pressable></View>:null}{line()}<View style={{flexDirection:'row',alignItems:'center',minHeight:44}}><View style={{width:84}}><Body>Note</Body></View><TextInput accessibilityLabel="Optional note" value={note} onChangeText={setNote} maxLength={500} placeholder="Optional" placeholderTextColor={colors.muted} style={{flex:1,color:colors.text}}/></View></Card>{calculatorOpen?<AmountCalculator key={String(calculatorOpen)} value={amount} onChange={setAmount} onDone={()=>setCalculatorOpen(false)}/>:null}<Pressable disabled={submitting||!loaded} onPress={()=>{void save()}} style={{backgroundColor:scope==='household'?colors.household:colors.personal,padding:13,borderRadius:10,alignItems:'center'}}><Text style={{color:'#fff',fontWeight:'700'}}>{editing?'Save changes':'Save expense'}</Text></Pressable></Screen>
}