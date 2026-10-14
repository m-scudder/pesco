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
