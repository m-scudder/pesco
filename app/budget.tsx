import React,{useEffect,useState} from 'react';
import {Alert,Pressable,Text,TextInput,View} from 'react-native';
import {Screen} from '@/components/Screen';
import {useData,parseMoney,formatMoney,monthKey,localDate} from '@/data';
import {useCategories} from '@/lib/CategoryContext';
import {useCategoryBudgets} from '@/lib/useCategoryBudgets';
import {useAppTheme} from '@/theme/ThemeContext';
import type {Scope} from '@/theme/palette';

export default function Budget(){
 const {budgets,setBudget}=useData();
 return <Screen modal style={{gap:12}}>
  {(['household','personal'] as Scope[]).map(scope=>
   <BudgetForm key={scope} scope={scope} value={budgets[scope]} onSave={amount=>setBudget(scope,amount)}/>
  )}
  <CategoryBudgetSection scope="household"/>
  <CategoryBudgetSection scope="personal"/>
 </Screen>;
}

function BudgetForm({scope,value,onSave}:{scope:Scope;value:number|null;onSave:(amount:number|null)=>void}){
 const {colors}=useAppTheme();
 const [amount,setAmount]=useState(value===null?'':(value/100).toFixed(2));
 useEffect(()=>{setAmount(value===null?'':(value/100).toFixed(2))},[value]);
 const accent=scope==='household'?colors.household:colors.personal;
 const save=()=>{
  const parsed=parseMoney(amount.replace(/,/g,''));
  if(parsed===null){Alert.alert('Invalid amount','Enter a positive monthly budget.');return}
  onSave(parsed);
 };
 return <View style={{backgroundColor:colors.surface,borderColor:colors.border,borderWidth:1,borderRadius:12,padding:14,gap:12}}>
  <View style={{flexDirection:'row',alignItems:'center',justifyContent:'space-between'}}>
   <Text style={{fontSize:16,fontWeight:'600',color:colors.text}}>{scope==='household'?'Household':'Personal'}</Text>
   {value!==null?<Pressable accessibilityRole="button" accessibilityLabel={'Remove '+scope+' budget'} onPress={()=>{onSave(null);setAmount('')}}><Text style={{fontSize:12,color:colors.muted}}>Remove</Text></Pressable>:null}
  </View>
  <View style={{flexDirection:'row',gap:10,alignItems:'center'}}>
   <View style={{flex:1,flexDirection:'row',alignItems:'center',borderColor:colors.border,borderWidth:1,borderRadius:10,minHeight:44,paddingHorizontal:12}}>
    <Text style={{color:colors.muted,fontSize:16,marginRight:7}}>₹</Text>
    <TextInput
     accessibilityLabel={scope==='household'?'Household monthly budget':'Personal monthly budget'}
     keyboardType="decimal-pad" value={amount} onChangeText={setAmount}
     placeholder="0.00" placeholderTextColor={colors.muted}
     selectTextOnFocus style={{flex:1,color:colors.text,fontSize:16,paddingVertical:8}}
    />
   </View>
   <Pressable accessibilityRole="button" onPress={save} style={{backgroundColor:accent,borderRadius:10,minHeight:44,minWidth:76,alignItems:'center',justifyContent:'center',paddingHorizontal:12}}>
    <Text style={{color:'#FFFFFF',fontWeight:'600',fontSize:14}}>Save</Text>
   </Pressable>
  </View>
 </View>;
}

function CategoryBudgetSection({scope}:{scope:Scope}){
 const {colors}=useAppTheme();
 const {household,expenses}=useData();
 const {names}=useCategories();
 const {items,save,error,refresh}=useCategoryBudgets(scope);
 const [category,setCategory]=useState('Groceries');
 const [amount,setAmount]=useState('');
 const [open,setOpen]=useState(false);
 const [busy,setBusy]=useState(false);
 const accent=scope==='household'?colors.household:colors.personal;
 const current=monthKey(localDate());
 const submit=async()=>{
  const value=parseMoney(amount.replace(/,/g,''));
  if(value===null){Alert.alert('Invalid limit','Enter a positive monthly amount');return}
  setBusy(true);
  try{await save(category,value);setAmount('');setOpen(false)}
  catch(e){Alert.alert('Could not save',String(e))}
  finally{setBusy(false)}
 };
 return <View style={{gap:9}}>
  <View style={{flexDirection:'row',justifyContent:'space-between',alignItems:'center'}}>
   <Text style={{fontFamily:'Inter_600SemiBold',fontSize:14,color:colors.text}}>{scope==='household'?'Household category limits':'Personal category limits'}</Text>
   <Pressable disabled={scope==='household'&&!household} onPress={()=>setOpen(v=>!v)}>
    <Text style={{color:accent,fontSize:12}}>{open?'Cancel':'+ Add limit'}</Text>
   </Pressable>
  </View>
  {open?<View style={{backgroundColor:colors.surface,borderRadius:10,padding:12,gap:10}}>
   <View style={{flexDirection:'row',flexWrap:'wrap',gap:6}}>
    {names(scope).map(name=><Pressable key={name} onPress={()=>setCategory(name)} style={{padding:8,borderRadius:8,backgroundColor:category===name?accent:colors.secondary}}>
     <Text style={{fontSize:12,color:category===name?'#fff':colors.text}}>{name}</Text>
    </Pressable>)}
   </View>
   <View style={{flexDirection:'row',gap:8}}>
    <TextInput accessibilityLabel="Category budget amount" value={amount} onChangeText={setAmount} keyboardType="decimal-pad" placeholder="Monthly limit ₹" placeholderTextColor={colors.muted}
     style={{flex:1,height:42,borderWidth:1,borderColor:colors.border,borderRadius:8,paddingHorizontal:10,color:colors.text}}/>
    <Pressable disabled={busy} onPress={()=>{void submit()}} style={{backgroundColor:accent,paddingHorizontal:15,justifyContent:'center',borderRadius:8}}>
     <Text style={{color:'#fff'}}>Save</Text>
    </Pressable>
   </View>
  </View>:null}
  <View style={{backgroundColor:colors.surface,borderRadius:10,borderColor:colors.border,borderWidth:1,paddingHorizontal:12}}>
   {items.length===0?<Text style={{color:colors.muted,fontSize:12,paddingVertical:14}}>No limits set</Text>:items.map(item=>{
    const spent=expenses.filter(e=>e.scope===scope&&e.category===item.category&&monthKey(e.date)===current).reduce((sum,e)=>sum+e.amountPaise,0);
    return <View key={item.category} style={{paddingVertical:10,gap:6}}>
     <View style={{flexDirection:'row',alignItems:'center',gap:8}}>
      <Text style={{flex:1,color:colors.text,fontSize:13}}>{item.category}</Text>
      <Text style={{fontSize:11,color:colors.muted}}>{formatMoney(spent)} / {formatMoney(item.amountPaise)}</Text>
      <Pressable accessibilityLabel={'Remove '+item.category+' budget'} onPress={()=>{void save(item.category,null).catch(e=>Alert.alert('Error',String(e)))}}>
       <Text style={{color:colors.muted,fontSize:17}}>×</Text>
      </Pressable>
     </View>
     <View style={{height:5,backgroundColor:colors.secondary,borderRadius:3,overflow:'hidden'}}>
      <View style={{width:(Math.min(100,Math.round(spent/item.amountPaise*100))+'%') as `${number}%`,height:5,backgroundColor:spent>item.amountPaise?'#C94F4F':accent}}/>
     </View>
    </View>;
   })}
  </View>
  {error?<Pressable onPress={()=>{void refresh()}}><Text style={{color:'#C94F4F',fontSize:12}}>Budget sync failed · Retry</Text></Pressable>:null}
 </View>;
}
