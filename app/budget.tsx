import {fontSizes,fontFamilies,fontWeights} from '@/theme/typography';
import React,{useEffect,useState} from 'react';
import {Alert,Pressable,Text,TextInput,View} from 'react-native';
import {Ionicons} from '@expo/vector-icons';
import {AppState} from 'react-native';
import {supabase} from '@/lib/supabase';
import {Screen} from '@/components/Screen';
import {useData,parseMoney,formatMoney,monthKey,localDate} from '@/data';
import {useCategories} from '@/lib/CategoryContext';
import {useCategoryBudgets} from '@/lib/useCategoryBudgets';
import {useAppTheme} from '@/theme/ThemeContext';
import type {Scope} from '@/theme/palette';

export default function Budget(){
 const {budgets,setBudget,household,expenses}=useData();
 const {colors}=useAppTheme();
 const current=monthKey(localDate());
 const [scope,setScope]=useState<Scope>(household?'household':'personal');
 const [sharedBudget,setSharedBudget]=useState<number|null>(null);
 const [sharedError,setSharedError]=useState<string|null>(null);
 const householdId=household?.id;
 useEffect(()=>{
  if(!householdId||!supabase){setSharedBudget(null);return}
  const db=supabase;
  let active=true;
  const load=async()=>{
   const {data,error}=await db.from('household_budgets').select('amount_paise').eq('household_id',householdId).maybeSingle();
   if(!active)return;
   if(error){setSharedError(error.message);return}
   setSharedBudget(data?Number(data.amount_paise):null);setSharedError(null);
  };
  void load();
  const app=AppState.addEventListener('change',state=>{if(state==='active')void load()});
  const channel=db.channel('household-budget-'+householdId).on('postgres_changes',{event:'*',schema:'public',table:'household_budgets',filter:'household_id=eq.'+householdId},()=>{void load()}).subscribe();
  return()=>{active=false;app.remove();void db.removeChannel(channel)};
 },[householdId]);
 const saveBudget=async(amount:number|null)=>{
  if(activeScope==='personal'){setBudget('personal',amount);return}
  if(!householdId||!supabase){Alert.alert('Household Required');return}
  const operation=amount===null?supabase.from('household_budgets').delete().eq('household_id',householdId):supabase.from('household_budgets').upsert({household_id:householdId,amount_paise:amount,updated_at:new Date().toISOString()},{onConflict:'household_id'});
  const {error}=await operation;
  if(error){Alert.alert('Could Not Save Budget',error.message);return}
  setSharedBudget(amount);
 };
 useEffect(()=>{if(!household)setScope('personal')},[household]);
 const activeScope=household?scope:'personal';
 const spent=expenses.filter(e=>e.scope===activeScope&&monthKey(e.date)===current).reduce((sum,e)=>sum+e.amountPaise,0);
 return <Screen modal style={{gap:12,paddingBottom:40}}>
  {household?<View style={{flexDirection:'row',padding:3,borderRadius:11,backgroundColor:colors.secondary}}>
   {(['household','personal'] as const).map(item=><Pressable key={item} accessibilityRole="button" accessibilityState={{selected:activeScope===item}} onPress={()=>setScope(item)}
    style={{flex:1,minHeight:36,alignItems:'center',justifyContent:'center',borderRadius:8,backgroundColor:activeScope===item?colors.surface:undefined,borderBottomWidth:activeScope===item?2:0,borderBottomColor:colors.household}}>
    <Text style={{fontFamily:activeScope===item?fontFamilies.bold:fontFamilies.medium,fontSize:fontSizes.label,color:activeScope===item?colors.household:colors.muted}}>{item==='household'?'Household':'Personal'}</Text>
   </Pressable>)}
  </View>:null}
  <BudgetForm key={'budget-'+activeScope} scope={activeScope} value={activeScope==='household'?sharedBudget:budgets.personal} spent={spent} onSave={amount=>{void saveBudget(amount)}}/>
  {activeScope==='household'&&sharedError?<Text style={{color:'#C94F4F',fontSize:fontSizes.caption}}>{sharedError}</Text>:null}
  <CategoryBudgetSection key={'category-'+activeScope} scope={activeScope} current={current}/>
 </Screen>;
}

function BudgetForm({scope,value,spent,onSave}:{scope:Scope;value:number|null;spent:number;onSave:(amount:number|null)=>void}){
 const {colors}=useAppTheme();
 const [amount,setAmount]=useState(value===null?'':String(value/100));
 useEffect(()=>{setAmount(value===null?'':String(value/100))},[value]);
 const save=()=>{
  const parsed=parseMoney(amount);
  if(parsed===null){Alert.alert('Invalid Amount','Enter a positive monthly budget.');return}
  onSave(parsed);
 };
 const ratio=value&&value>0?Math.min(100,Math.round(spent/value*100)):0;
 const remaining=value===null?null:value-spent;
 return <View style={{backgroundColor:colors.surface,borderColor:colors.border,borderWidth:1,borderRadius:12,padding:15,gap:12}}>
  <View style={{flexDirection:'row',alignItems:'center',justifyContent:'space-between'}}>
   <Text style={{fontFamily:fontFamilies.semibold,fontSize:fontSizes.section,color:colors.text}}>Monthly Budget</Text>
   {value!==null?<Pressable accessibilityRole="button" accessibilityLabel={'Remove '+scope+' budget'} onPress={()=>{onSave(null);setAmount('')}} style={{padding:5}}>
    <Text style={{fontFamily:fontFamilies.medium,fontSize:fontSizes.caption,color:colors.muted}}>Remove</Text>
   </Pressable>:null}
  </View>
  {value!==null?<View style={{gap:9}}>
   <View style={{flexDirection:'row',justifyContent:'space-between',alignItems:'baseline',gap:8}}>
    <View style={{flex:1,gap:3}}>
     <Text style={{fontSize:fontSizes.caption,color:colors.muted}}>Spent</Text>
     <Text style={{fontFamily:fontFamilies.displayBold,fontSize:fontSizes.summary,color:colors.text}}>{formatMoney(spent)}</Text>
    </View>
    <View style={{alignItems:'flex-end',gap:3}}>
     <Text style={{fontSize:fontSizes.caption,color:colors.muted}}>{remaining!==null&&remaining<0?'Over budget':'Remaining'}</Text>
     <Text style={{fontFamily:fontFamilies.semibold,fontSize:fontSizes.input,color:remaining!==null&&remaining<0?'#C94F4F':colors.text}}>{formatMoney(Math.abs(remaining??0))}</Text>
    </View>
   </View>
   <View style={{height:7,borderRadius:5,overflow:'hidden',backgroundColor:colors.secondary}}>
    <View style={{height:7,width:(ratio+'%') as `${number}%`,backgroundColor:spent>value?'#C94F4F':colors.household}}/>
   </View>
   <Text style={{fontSize:fontSizes.caption,color:colors.muted}}>{Math.round(spent/value*100)}% of {formatMoney(value)} used</Text>
  </View>:<Text style={{color:colors.muted,fontSize:fontSizes.caption}}>No budget set</Text>}
  <View style={{flexDirection:'row',gap:9,alignItems:'center'}}>
   <View style={{flex:1,flexDirection:'row',alignItems:'center',borderColor:colors.border,borderWidth:1,borderRadius:9,minHeight:46,paddingHorizontal:12}}>
    <Text style={{color:colors.muted,fontSize:fontSizes.section,marginRight:7}}>₹</Text>
    <TextInput accessibilityLabel={scope==='household'?'Household monthly budget':'Personal monthly budget'}
     keyboardType="number-pad" value={amount} onChangeText={text=>setAmount(text.replace(/[^0-9]/g,''))}
     placeholder="Monthly amount" placeholderTextColor={colors.muted}
     selectTextOnFocus style={{flex:1,color:colors.text,fontFamily:fontFamilies.medium,fontSize:fontSizes.input,paddingVertical:8}}/>
   </View>
   <Pressable accessibilityRole="button" accessibilityLabel={value===null?'Set Budget':'Update Budget'} onPress={save}
    style={{backgroundColor:colors.household,borderRadius:9,minHeight:46,minWidth:86,alignItems:'center',justifyContent:'center',paddingHorizontal:12}}>
    <Text style={{color:'#fff',fontFamily:fontFamilies.semibold,fontSize:fontSizes.body}}>{value===null?'Set Budget':'Update'}</Text>
   </Pressable>
  </View>
 </View>;
}

function CategoryBudgetSection({scope,current}:{scope:Scope;current:string}){
 const {colors}=useAppTheme();
 const {expenses}=useData();
 const {names}=useCategories();
 const {items,save,error,refresh}=useCategoryBudgets(scope);
 const categories=names(scope);
 const [category,setCategory]=useState('Groceries');
 const [amount,setAmount]=useState('');
 const [open,setOpen]=useState(false);
 const [busy,setBusy]=useState(false);
 const submit=async()=>{
  const value=parseMoney(amount);
  if(value===null){Alert.alert('Invalid Limit','Enter a positive monthly amount.');return}
  if(!categories.includes(category)){Alert.alert('Choose Category','Select a category first.');return}
  setBusy(true);
  try{await save(category,value);setAmount('');setOpen(false)}
  catch(e){Alert.alert('Could Not Save',String(e))}
  finally{setBusy(false)}
 };
 return <View style={{gap:9}}>
  <View style={{flexDirection:'row',justifyContent:'space-between',alignItems:'center',gap:10}}>
   <View style={{flex:1,gap:3}}>
    <Text style={{fontFamily:fontFamilies.semibold,fontSize:fontSizes.body,color:colors.text}}>Category Limits</Text>
   </View>
   <Pressable accessibilityRole="button" accessibilityLabel={open?'Cancel Adding Limit':'Add Category Limit'} onPress={()=>setOpen(v=>!v)} style={{padding:8,flexDirection:'row',alignItems:'center',gap:4}}>
    {!open?<Ionicons name="add" size={16} color={colors.household}/>:null}
    <Text style={{fontFamily:fontFamilies.semibold,fontSize:fontSizes.label,color:colors.household}}>{open?'Cancel':'Add Limit'}</Text>
   </Pressable>
  </View>
  {open?<View style={{backgroundColor:colors.surface,borderRadius:12,borderWidth:1,borderColor:colors.border,padding:12,gap:12}}>
   <View style={{flexDirection:'row',flexWrap:'wrap',gap:6}}>
    {categories.map(name=><Pressable key={name} accessibilityRole="button" accessibilityState={{selected:category===name}} onPress={()=>setCategory(name)}
     style={{paddingHorizontal:10,paddingVertical:9,borderRadius:8,backgroundColor:category===name?colors.secondary:colors.surface,borderWidth:1,borderColor:category===name?colors.household:colors.border}}>
     <Text style={{fontSize:fontSizes.label,color:category===name?colors.household:colors.text,fontFamily:category===name?fontFamilies.semibold:fontFamilies.regular}}>{name}</Text>
    </Pressable>)}
   </View>
   <View style={{flexDirection:'row',gap:8}}>
    <TextInput accessibilityLabel="Category budget amount" value={amount} onChangeText={text=>setAmount(text.replace(/[^0-9]/g,''))} keyboardType="number-pad" placeholder="Monthly Limit ₹" placeholderTextColor={colors.muted}
     style={{flex:1,height:44,borderWidth:1,borderColor:colors.border,borderRadius:9,paddingHorizontal:12,color:colors.text,fontFamily:fontFamilies.medium,fontSize:fontSizes.input}}/>
    <Pressable accessibilityRole="button" disabled={busy} onPress={()=>{void submit()}} style={{backgroundColor:colors.household,paddingHorizontal:16,justifyContent:'center',borderRadius:9,opacity:busy?0.6:1}}>
     <Text style={{color:'#fff',fontFamily:fontFamilies.semibold,fontSize:fontSizes.body}}>{busy?'Saving…':'Save Limit'}</Text>
    </Pressable>
   </View>
  </View>:null}
  <View style={{backgroundColor:colors.surface,borderRadius:12,borderColor:colors.border,borderWidth:1,paddingHorizontal:14}}>
   {items.length===0?<Text style={{color:colors.muted,fontSize:fontSizes.caption,paddingVertical:17}}>No Category Limits</Text>:items.map((item,index)=>{
    const spent=expenses.filter(e=>e.scope===scope&&e.category===item.category&&monthKey(e.date)===current).reduce((sum,e)=>sum+e.amountPaise,0);
    const pct=Math.round(spent/Math.max(item.amountPaise,1)*100);
    return <View key={item.category} style={{paddingVertical:14,gap:8,borderBottomWidth:index===items.length-1?0:1,borderBottomColor:colors.border}}>
     <View style={{flexDirection:'row',alignItems:'center',gap:8}}>
      <Text numberOfLines={1} style={{flex:1,fontFamily:fontFamilies.medium,color:colors.text,fontSize:fontSizes.body}}>{item.category}</Text>
      <Text style={{fontSize:fontSizes.caption,color:spent>item.amountPaise?'#C94F4F':colors.muted}}>{pct}%</Text>
      <Pressable accessibilityRole="button" accessibilityLabel={'Remove '+item.category+' limit'} onPress={()=>{void save(item.category,null).catch(e=>Alert.alert('Error',String(e)))}} style={{padding:5}}>
       <Ionicons name="close" size={17} color={colors.muted}/>
      </Pressable>
     </View>
     <View style={{height:6,backgroundColor:colors.secondary,borderRadius:5,overflow:'hidden'}}>
      <View style={{width:(Math.min(100,pct)+'%') as `${number}%`,height:6,backgroundColor:spent>item.amountPaise?'#C94F4F':colors.household}}/>
     </View>
     <Text style={{fontSize:fontSizes.caption,color:colors.muted}}>{formatMoney(spent)} spent of {formatMoney(item.amountPaise)}</Text>
    </View>;
   })}
  </View>
  {error?<Pressable accessibilityRole="button" onPress={()=>{void refresh()}}><Text style={{color:'#C94F4F',fontSize:fontSizes.caption}}>Budget sync failed · Retry</Text></Pressable>:null}
 </View>;
}
