import React,{useState} from 'react';
import {Text,View} from 'react-native';
import {Screen} from '@/components/Screen';
import {Body,Card,Heading,ScopeSwitch} from '@/components/UI';
import {MonthPicker} from '@/components/MonthPicker';
import {formatMoney,localDate,monthKey,monthly,total,useData} from '@/data';
import {useAppTheme} from '@/theme/ThemeContext';

export default function Insights(){
 const {colors,scope}=useAppTheme();const {expenses}=useData();const [month,setMonth]=useState(monthKey(localDate()));
 const selected=monthly(expenses,scope,month);const sum=total(selected);
 const [year,monthIndex]=month.split('-').map(Number);
 const prevDate=new Date(year,monthIndex-2,1);
 const prevKey=prevDate.getFullYear()+'-'+String(prevDate.getMonth()+1).padStart(2,'0');
 const previous=total(monthly(expenses,scope,prevKey));
 const categories=Object.entries(selected.reduce<Record<string,number>>((a,e)=>{a[e.category]=(a[e.category]||0)+e.amountPaise;return a},{})).sort((a,b)=>b[1]-a[1]);
 const months=Array.from({length:6},(_,i)=>{const d=new Date(year,monthIndex-1-(5-i),1);const key=d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0');return {label:d.toLocaleDateString('en-IN',{month:'short'}),amount:total(monthly(expenses,scope,key))}});
 const maximum=Math.max(1,...months.map(x=>x.amount));const accent=scope==='household'?colors.household:colors.personal;
 return <Screen>
  <Heading>Insights</Heading><ScopeSwitch/><MonthPicker month={month} onChange={setMonth}/>
  <Card><Body muted>Total spent</Body><Text style={{color:colors.text,fontSize:30,fontWeight:'700'}}>{formatMoney(sum)}</Text>{previous>0?<Body muted>{sum>=previous?'+':'−'}{Math.abs(Math.round((sum-previous)/previous*100))}% vs last month</Body>:null}</Card>
  {sum>0?<><Text style={{fontSize:17,fontWeight:'700',color:colors.text}}>Last 6 months</Text>
  <Card><View style={{flexDirection:'row',height:100,alignItems:'flex-end',gap:8}}>{months.map((x,i)=><View key={i} style={{flex:1,alignItems:'center',justifyContent:'flex-end',height:'100%',gap:5}}><View style={{width:'65%',height:x.amount/maximum*76,backgroundColor:accent,borderRadius:3}}/><Text style={{color:colors.muted,fontSize:11}}>{x.label}</Text></View>)}</View></Card>
  <Text style={{fontSize:17,fontWeight:'700',color:colors.text}}>Categories</Text>
  <Card>{categories.map(([name,amount])=><View key={name} style={{gap:6,paddingVertical:5}}><View style={{flexDirection:'row',justifyContent:'space-between'}}><Body>{name}</Body><Body>{formatMoney(amount)}</Body></View><View style={{height:5,backgroundColor:colors.secondary,borderRadius:4,overflow:'hidden'}}><View style={{height:5,width:`${amount/sum*100}%` as const,backgroundColor:accent}}/></View></View>)}</Card></>:<View style={{alignItems:'center',paddingVertical:18}}><Body muted>No expenses this month</Body></View>}
 </Screen>
}
