import React,{useMemo,useState} from 'react';
import {Pressable,Text,View} from 'react-native';
import {useFocusEffect,useRouter} from 'expo-router';
import {Screen} from '@/components/Screen';
import {Body,Card} from '@/components/UI';
import {MonthPicker} from '@/components/MonthPicker';
import {formatMoney,localDate,monthKey,useData} from '@/data';
import {buildInsights} from '@/lib/insights';
import {useAppTheme} from '@/theme/ThemeContext';

export default function House(){
 const router=useRouter();
 const {colors}=useAppTheme();
 const {expenses,budgets,refresh,syncError}=useData();
 const [month,setMonth]=useState(monthKey(localDate()));
 useFocusEffect(React.useCallback(()=>{void refresh()},[refresh]));
 const {spent,prior,difference,percentChange,selected,monthSeries,categories}=useMemo(
  ()=>buildInsights(expenses,'household',month,null),[expenses,month]);
 const budget=budgets.household;
 const accent=colors.household;
 const maxMonth=Math.max(1,...monthSeries.map(m=>m.amount));
 return <Screen style={{gap:12}}>
  <MonthPicker month={month} onChange={setMonth}/>
  {syncError?<Pressable onPress={()=>{void refresh()}}>
   <Text style={{fontSize:12,color:'#C94F4F'}}>Unable to refresh shared expenses · Retry</Text>
  </Pressable>:null}
  <Card>
   <Body muted>Household spending</Body>
   <Text style={{color:colors.text,fontSize:26,fontFamily:'PlusJakartaSans_700Bold'}}>{formatMoney(spent)}</Text>
   <View style={{flexDirection:'row',justifyContent:'space-between',gap:8,flexWrap:'wrap'}}>
    <Text style={{fontSize:12,color:colors.muted}}>{selected.length} {selected.length===1?'expense':'expenses'}</Text>
    <Text style={{fontSize:12,color:colors.muted}}>
     {prior>0&&percentChange!==null?`${difference>0?'↑':difference<0?'↓':'—'} ${percentChange}% vs last month`: 'No spending last month'}
    </Text>
   </View>
   {budget!==null&&budget>0?<>
    <View style={{height:6,backgroundColor:colors.secondary,borderRadius:6,overflow:'hidden'}}>
     <View style={{height:6,width:`${Math.min(100,Math.round(spent/budget*100))}%` as const,backgroundColor:accent}}/>
    </View>
    <View style={{flexDirection:'row',justifyContent:'space-between',gap:8}}>
     <Text style={{fontSize:12,color:colors.muted}}>Budget · {formatMoney(budget)}</Text>
     <Text style={{fontSize:12,color:spent>budget?'#C94F4F':colors.muted}}>
      {spent>budget?formatMoney(spent-budget)+' over':formatMoney(budget-spent)+' left'}
     </Text>
    </View>
   </>:<Pressable onPress={()=>router.push('/budget')}>
    <Text style={{fontSize:12,color:accent}}>Set household budget ›</Text>
   </Pressable>}
  </Card>
  <Text style={{color:colors.text,fontSize:14,fontFamily:'Inter_600SemiBold'}}>Spending by category</Text>
  <Card>
   {categories.length===0?<Text style={{color:colors.muted,fontSize:12}}>No household spending this month</Text>:categories.slice(0,6).map(item=><View key={item.name} style={{gap:6,marginVertical:3}}>
    <View style={{flexDirection:'row',justifyContent:'space-between',alignItems:'center',gap:10}}>
     <Text numberOfLines={1} style={{color:colors.text,fontSize:13,fontFamily:'Inter_500Medium',flex:1}}>{item.name}</Text>
     <Text style={{color:colors.text,fontSize:13,fontFamily:'Inter_500Medium'}}>{formatMoney(item.amount)}</Text>
    </View>
    <View style={{height:5,borderRadius:4,backgroundColor:colors.secondary,overflow:'hidden'}}>
     <View style={{height:'100%',width:`${item.percent}%` as const,backgroundColor:accent,borderRadius:4}}/>
    </View>
   </View>)}
   {categories.length>6?<Text style={{fontSize:11,color:colors.muted}}>Plus {categories.length-6} more categories</Text>:null}
  </Card>
  <Text style={{color:colors.text,fontSize:14,fontFamily:'Inter_600SemiBold'}}>Monthly trend</Text>
  <Card>
   <View style={{height:125,flexDirection:'row',alignItems:'flex-end',gap:8}}>
    {monthSeries.map(item=><View key={item.key} style={{flex:1,height:'100%',justifyContent:'flex-end',alignItems:'center',gap:5}}>
     <Text numberOfLines={1} style={{fontSize:10,color:colors.muted}}>
      {item.amount===maxMonth&&item.amount>0?formatMoney(item.amount).replace(/\.00$/,''):''}
     </Text>
     <View style={{width:'72%',height:item.amount?Math.max(4,Math.round(item.amount/maxMonth*78)):3,
      borderRadius:4,backgroundColor:item.amount?(item.selected?accent:colors.muted):colors.secondary,opacity:item.selected?1:0.65}}/>
     <Text style={{fontSize:11,color:item.selected?colors.text:colors.muted,fontWeight:item.selected?'700':'400'}}>{item.label}</Text>
    </View>)}
   </View>
  </Card>
 </Screen>;
}
