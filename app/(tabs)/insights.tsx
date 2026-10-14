import React,{useMemo,useState} from 'react';
import {useFocusEffect,useRouter} from 'expo-router';
import {Pressable,Text,View} from 'react-native';
import {Screen} from '@/components/Screen';
import {Body,Card,Heading,ScopeSwitch} from '@/components/UI';
import {MonthPicker} from '@/components/MonthPicker';
import {formatMoney,localDate,monthKey,useData} from '@/data';
import {buildInsights} from '@/lib/insights';
import {useAppTheme} from '@/theme/ThemeContext';

export default function Insights(){
 const router=useRouter();
 const {colors,scope}=useAppTheme();
 const {expenses,budgets,currentUserId,household,refresh,syncError,loaded}=useData();
 const [month,setMonth]=useState(monthKey(localDate()));
 useFocusEffect(React.useCallback(()=>{void refresh()},[refresh]));
 const model=useMemo(()=>buildInsights(expenses,scope,month,currentUserId),[expenses,scope,month,currentUserId]);
 const {spent,prior,difference,percentChange,selected,own,partner,categories,monthSeries}=model;
 const budget=budgets[scope];
 const accent=scope==='household'?colors.household:colors.personal;
 const hasTrend=monthSeries.some(m=>m.amount>0);
 const maxMonth=Math.max(1,...monthSeries.map(m=>m.amount));
 const dataMayBeIncomplete=scope==='household'&&expenses.filter(e=>e.scope==='household').length>=100;
 const summaryLabel=scope==='household'?'Household spending':'Personal spending';
 const abbreviated=(paise:number)=>{const rupees=paise/100;return rupees>=100000?'₹'+(rupees/100000).toFixed(1)+'L':rupees>=1000?'₹'+(rupees/1000).toFixed(1)+'k':'₹'+Math.round(rupees)};
 const section=(label:string)=><Text style={{fontSize:16,fontWeight:'700',color:colors.text}}>{label}</Text>;
 return <Screen>
  <Heading>Insights</Heading>
  <ScopeSwitch/>
  <MonthPicker month={month} onChange={setMonth}/>
  {scope==='household'&&syncError?
   <Pressable accessibilityRole="button" onPress={()=>{void refresh()}} style={{paddingVertical:7}}>
    <Text style={{color:'#C94F4F',fontSize:12}}>Unable to refresh · Retry</Text>
   </Pressable>:null}
  <Card>
   <Body muted>{summaryLabel}</Body>
   <Text accessibilityLabel={'Total '+formatMoney(spent)} style={{color:colors.text,fontSize:30,fontWeight:'700'}}>{formatMoney(spent)}</Text>
   <View style={{flexDirection:'row',justifyContent:'space-between',alignItems:'center',gap:8,flexWrap:'wrap'}}>
    <Text style={{color:colors.muted,fontSize:12}}>{selected.length} {selected.length===1?'expense':'expenses'}</Text>
    {prior>0&&percentChange!==null?
     <Text style={{fontSize:12,color:colors.muted}}>
      {difference>0?'↑':difference<0?'↓':'—'} {percentChange}% vs last month
     </Text>:
     <Text style={{fontSize:12,color:colors.muted}}>{prior===0?'No spending last month':'Same as last month'}</Text>}
   </View>
   {budget!==null&&budget>0?<>
    <View style={{height:6,backgroundColor:colors.secondary,borderRadius:6,overflow:'hidden'}}>
     <View style={{height:6,width:`${Math.min(100,Math.round(spent/budget*100))}%` as const,backgroundColor:accent}}/>
    </View>
    <View style={{flexDirection:'row',justifyContent:'space-between',gap:8}}>
     <Text style={{fontSize:12,color:colors.muted}}>Budget · {formatMoney(budget)}</Text>
     <Text style={{fontSize:12,color:spent>budget?'#C94F4F':colors.muted}}>{spent>budget?formatMoney(spent-budget)+' over':formatMoney(budget-spent)+' left'}</Text>
    </View>
   </>:<Pressable onPress={()=>router.push('/budget')} accessibilityRole="button"><Text style={{fontSize:12,color:accent}}>Set budget ›</Text></Pressable>}
  </Card>
  {scope==='household'&&household&&spent>0?<>
   {section('Contributions')}
   <Card>
    <View style={{flexDirection:'row',height:7,backgroundColor:colors.secondary,borderRadius:7,overflow:'hidden'}}>
     <View style={{width:`${Math.max(0,Math.min(100,own/spent*100))}%` as const,backgroundColor:accent}}/>
    </View>
    <View style={{flexDirection:'row',justifyContent:'space-between',gap:8}}>
     <View style={{gap:3}}><Body muted>You</Body><Text style={{color:colors.text,fontSize:15,fontWeight:'600'}}>{formatMoney(own)}</Text></View>
     <View style={{gap:3,alignItems:'flex-end'}}><Body muted>Partner</Body><Text style={{color:colors.text,fontSize:15,fontWeight:'600'}}>{formatMoney(partner)}</Text></View>
    </View>
   </Card>
  </>:null}
  {hasTrend?<>
   {section('Monthly trend')}
   <Card>
    <View style={{height:116,flexDirection:'row',alignItems:'flex-end',gap:9}}>
     {monthSeries.map(item=><View key={item.key} style={{flex:1,alignItems:'center',justifyContent:'flex-end',height:'100%',gap:5}}>
      <Text numberOfLines={1} style={{color:item.selected?colors.text:colors.muted,fontSize:10}}>
       {item.amount===maxMonth?formatMoney(item.amount).replace(/\.00$/,''):''}
      </Text>
      <View style={{width:'72%',height:item.amount?Math.max(4,Math.round(item.amount/maxMonth*76)):3,backgroundColor:item.amount?(item.selected?accent:colors.muted):colors.secondary,borderRadius:4,opacity:item.selected?1:0.6}}/>
      <Text style={{color:item.selected?colors.text:colors.muted,fontWeight:item.selected?'700':'400',fontSize:11}}>{item.label}</Text>
     </View>)}
    </View>
   </Card>
  </>:null}
  {categories.length>0?<>
   {section('Categories')}
   <Card>
    {categories.map((item,index)=><View key={item.name} style={{gap:6,paddingVertical:7,borderBottomWidth:index===categories.length-1?0:1,borderBottomColor:colors.border}}>
     <View style={{flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:8}}>
      <Text numberOfLines={1} style={{color:colors.text,fontSize:14,fontWeight:'600',flex:1}}>{item.name}</Text>
      <Text style={{color:colors.text,fontSize:13,fontWeight:'600'}}>{formatMoney(item.amount)}</Text>
     </View>
     <View style={{flexDirection:'row',alignItems:'center',gap:10}}>
      <View style={{flex:1,height:5,borderRadius:5,backgroundColor:colors.secondary,overflow:'hidden'}}>
       <View style={{width:`${Math.max(0,Math.min(100,item.amount/spent*100))}%` as const,height:5,backgroundColor:accent}}/>
      </View>
      <Text style={{color:colors.muted,fontSize:11,width:34,textAlign:'right'}}>{item.percent}%</Text>
     </View>
    </View>)}
   </Card>
  </>:null}
  {!hasTrend&&selected.length===0&&loaded?
   <View style={{alignItems:'center',paddingVertical:22,gap:4}}>
    <Text style={{color:colors.muted,fontSize:14}}>No expenses yet</Text>
    <Text style={{color:colors.muted,fontSize:12}}>Your spending insights will appear here.</Text>
   </View>:null}
  {dataMayBeIncomplete?<Text style={{color:colors.muted,fontSize:11}}>Showing the latest 100 shared transactions. Older spending may be missing.</Text>:null}
 </Screen>;
}
