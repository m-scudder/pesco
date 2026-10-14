import React,{useMemo,useState} from 'react';
import {useFocusEffect} from 'expo-router';
import {Text,TextInput,View,ScrollView,Pressable} from 'react-native';
import {Screen} from '@/components/Screen';
import {AddExpenseButton} from '@/components/AddExpenseButton';
import {Body,Card,Heading,ScopeSwitch} from '@/components/UI';
import {ExpenseRow} from '@/components/ExpenseRow';
import {MonthPicker} from '@/components/MonthPicker';
import {localDate,monthKey,useData} from '@/data';
import {useCategories} from '@/lib/CategoryContext';
import {useAppTheme} from '@/theme/ThemeContext';

export default function Expenses(){
 const {colors,scope}=useAppTheme();const {expenses,refresh,syncError}=useData();const {names:categoryNames}=useCategories();
 const [search,setSearch]=useState('');const [category,setCategory]=useState('All');
 const [month,setMonth]=useState(monthKey(localDate()));const [allMonths,setAllMonths]=useState(false);
 useFocusEffect(React.useCallback(()=>{void refresh()},[refresh]));
 const filterCategories=Array.from(new Set([...categoryNames(scope),...expenses.filter(e=>e.scope===scope).map(e=>e.category)]));
 const filtered=useMemo(()=>expenses.filter(e=>e.scope===scope&&(allMonths||monthKey(e.date)===month)&&(category==='All'||e.category===category)&&(e.category+' '+e.note).toLowerCase().includes(search.trim().toLowerCase())).sort((a,b)=>b.date.localeCompare(a.date)||b.createdAt.localeCompare(a.createdAt)),[expenses,scope,allMonths,month,category,search]);
 let lastDate='';
 return <View style={{flex:1}}><Screen>
  <Heading>Expenses</Heading>
  <ScopeSwitch/>
  <TextInput accessibilityLabel="Search expenses" value={search} onChangeText={setSearch} placeholder="Search" placeholderTextColor={colors.muted} style={{height:42,backgroundColor:colors.surface,color:colors.text,borderWidth:1,borderColor:colors.border,borderRadius:10,paddingHorizontal:12}}/>
  <View style={{flexDirection:'row',alignItems:'center',gap:8}}>
   <View style={{flex:1}}><MonthPicker month={month} onChange={setMonth}/></View>
   <Pressable onPress={()=>setAllMonths(v=>!v)} style={{backgroundColor:allMonths?colors.text:colors.secondary,paddingHorizontal:10,paddingVertical:8,borderRadius:9}}><Text style={{color:allMonths?colors.background:colors.text,fontSize:12}}>All dates</Text></Pressable>
  </View>
  <ScrollView style={{flexGrow:0,maxHeight:38}} horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{alignItems:'center',gap:6,paddingRight:16}}>
   {['All',...filterCategories].map(cat=><Pressable key={cat} onPress={()=>setCategory(cat)} style={{alignSelf:'center',paddingHorizontal:12,height:32,justifyContent:'center',borderRadius:16,backgroundColor:category===cat?colors.text:colors.secondary}}>
    <Text style={{color:category===cat?colors.background:colors.text,fontSize:12}}>{cat}</Text>
   </Pressable>)}
  </ScrollView>
  {scope==='household'&&syncError?<Pressable onPress={()=>{void refresh()}}><Text style={{color:'#C94F4F',fontSize:12}}>Sync failed · Retry</Text></Pressable>:null}
  {filtered.length===0?<View style={{paddingVertical:18,alignItems:'center'}}><Body muted>No expenses found</Body></View>:<Card>{filtered.map(e=>{const newDay=lastDate!==e.date;lastDate=e.date;return <View key={e.id}>{newDay?<Text style={{color:colors.muted,fontSize:12,fontWeight:'600',paddingTop:8}}>{new Date(e.date+'T12:00:00').toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric'})}</Text>:null}<ExpenseRow expense={e}/></View>})}</Card>}
 </Screen><AddExpenseButton/></View>
}
