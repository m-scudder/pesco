import React,{useState} from 'react';
import {Pressable,Text,View} from 'react-native';
import {useRouter} from 'expo-router';
import {Screen} from '@/components/Screen';
import {AddExpenseButton} from '@/components/AddExpenseButton';
import {Body,Card,Heading,ScopeSwitch} from '@/components/UI';
import {ExpenseRow} from '@/components/ExpenseRow';
import {MonthPicker} from '@/components/MonthPicker';
import {formatMoney,localDate,monthly,monthKey,total,useData} from '@/data';
import {useAppTheme} from '@/theme/ThemeContext';

export default function Home(){
 const {scope,colors}=useAppTheme();const {expenses,budgets,loaded}=useData();const router=useRouter();
 const [month,setMonth]=useState(monthKey(localDate()));
 const entries=monthly(expenses,scope,month).sort((a,b)=>b.date.localeCompare(a.date)||b.createdAt.localeCompare(a.createdAt));
 const spent=total(entries);const budget=budgets[scope];const accent=scope==='household'?colors.household:colors.personal;
 return <View style={{flex:1}}><Screen>
  <Heading>PESCO</Heading>
  <ScopeSwitch/>
  {scope==='household'?<Pressable onPress={()=>router.push('/household')} accessibilityRole="button" style={{paddingVertical:9,paddingHorizontal:12,borderRadius:9,backgroundColor:colors.secondary}}><Text style={{color:accent,fontWeight:'600',fontSize:13}}>Household  ›</Text></Pressable>:null}
  <MonthPicker month={month} onChange={setMonth}/>
  <Card>
   <Body muted>Spent this month</Body>
   <Text style={{color:colors.text,fontSize:30,fontWeight:'700'}}>{formatMoney(spent)}</Text>
   {budget!==null?<><Body muted>{formatMoney(Math.max(0,budget-spent))} left of {formatMoney(budget)}</Body><View style={{height:5,borderRadius:4,backgroundColor:colors.secondary,overflow:'hidden'}}><View style={{height:5,width:`${Math.min(100,spent/budget*100)}%` as const,backgroundColor:accent}}/></View></>:<Pressable onPress={()=>router.push('/budget')}><Text style={{fontSize:12,color:colors.muted}}>Set budget ›</Text></Pressable>}
  </Card>
  <View style={{flexDirection:'row',alignItems:'center',justifyContent:'space-between'}}>
   <Text style={{fontSize:17,fontWeight:'700',color:colors.text}}>Recent expenses</Text>
   <Pressable onPress={()=>router.navigate('/expenses')}><Text style={{color:accent,fontSize:13}}>See all ›</Text></Pressable>
  </View>
  {loaded&&entries.length>0?<Card>{entries.slice(0,5).map(e=><ExpenseRow key={e.id} expense={e}/>)}</Card>:<View style={{paddingVertical:18,alignItems:'center'}}><Body muted>{loaded?'No expenses yet':'Loading…'}</Body></View>}
 </Screen><AddExpenseButton/></View>
}
