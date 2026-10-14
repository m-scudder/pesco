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
 const {scope,colors}=useAppTheme();const {expenses,budgets,loaded}=useData();const router=useRouter();const [month,setMonth]=useState(monthKey(localDate()));
 const entries=monthly(expenses,scope,month).sort((a,b)=>b.date.localeCompare(a.date)||b.createdAt.localeCompare(a.createdAt));const spent=total(entries);const budget=budgets[scope];
 return <View style={{flex:1}}><Screen><Heading subtitle="Your money, clearly organized">PESCO</Heading><ScopeSwitch/><MonthPicker month={month} onChange={setMonth}/><Card><Body muted>{scope==='household'?'Household spending':'Personal spending · Only you'}</Body><Heading>{formatMoney(spent)}</Heading>{budget!==null?<><Body muted>{formatMoney(Math.max(0,budget-spent))} remaining of {formatMoney(budget)}</Body><View style={{height:7,borderRadius:7,backgroundColor:colors.secondary,overflow:'hidden'}}><View style={{height:7,width:(Math.min(100,spent/budget*100))+'%',backgroundColor:scope==='household'?colors.household:colors.personal}}/></View></>:<Pressable onPress={()=>router.push('/budget')}><Text style={{color:colors.muted}}>No budget set · Add optional budget ›</Text></Pressable>}</Card>{scope==='household'?<Card><Body>Household contributions</Body><Body muted>You: {formatMoney(spent)}</Body><Body muted>Partner: available after Supabase setup</Body></Card>:null}<View style={{flexDirection:'row',justifyContent:'space-between',alignItems:'center'}}><Heading>Recent expenses</Heading><Pressable onPress={()=>router.navigate('/expenses')}><Text style={{color:colors.household}}>View all</Text></Pressable></View><Card>{!loaded?<Body muted>Loading expenses…</Body>:entries.length===0?<Body muted>No expenses this month. Tap + to add one.</Body>:entries.slice(0,5).map(e=><ExpenseRow key={e.id} expense={e}/>)}</Card><Body muted>Local-only mode · Shared data will be enabled after Supabase setup.</Body></Screen><AddExpenseButton/></View>
}