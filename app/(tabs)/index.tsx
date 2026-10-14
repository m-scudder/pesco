import React,{useMemo,useState} from 'react';
import {useFocusEffect,useRouter} from 'expo-router';
import {Pressable,Text,View} from 'react-native';
import {Screen} from '@/components/Screen';
import {AddExpenseButton} from '@/components/AddExpenseButton';
import {Heading,ScopeSwitch} from '@/components/UI';
import {MonthPicker} from '@/components/MonthPicker';
import {formatMoney,localDate,monthKey,useData} from '@/data';
import {useAppTheme} from '@/theme/ThemeContext';

export default function Home(){
 const {colors,scope}=useAppTheme();
 const {expenses,refresh,syncError,currentUserId}=useData();
 const router=useRouter();
 const [month,setMonth]=useState(monthKey(localDate()));

 useFocusEffect(React.useCallback(()=>{void refresh()},[refresh]));
 const filtered=useMemo(()=>expenses
  .filter(e=>e.scope===scope&&monthKey(e.date)===month)
  .sort((a,b)=>b.date.localeCompare(a.date)||b.createdAt.localeCompare(a.createdAt)),
  [expenses,scope,month]);
 const groups=useMemo(()=>{
  const result:typeof filtered[]=[];
  filtered.forEach(e=>{
   const last=result[result.length-1];
   if(last&&last[0].date===e.date)last.push(e);
   else result.push([e]);
  });
  return result;
 },[filtered]);

 return <View style={{flex:1,backgroundColor:colors.background}}>
  <Screen style={{paddingHorizontal:0,gap:0}}>
   <View style={{paddingHorizontal:16,paddingBottom:8,gap:8}}>
    <Heading>Home</Heading>
    <ScopeSwitch/>
    <MonthPicker month={month} onChange={setMonth}/>
   </View>
   {scope==='household'&&syncError?
    <Pressable onPress={()=>{void refresh()}} style={{paddingHorizontal:16,paddingVertical:10}}>
     <Text style={{color:'#C94F4F',fontSize:13}}>Sync failed · Tap to retry</Text>
    </Pressable>:null}
   {groups.length===0?
    <View style={{paddingVertical:28,alignItems:'center'}}>
     <Text style={{color:colors.muted,fontSize:14}}>No expenses for this month</Text>
    </View>:
    groups.map(group=>{
     const date=group[0].date;
     const parsed=new Date(date+'T12:00:00');
     const weekday=parsed.toLocaleDateString('en-IN',{weekday:'short'});
     return <View key={date}>
      <View style={{flexDirection:'row',alignItems:'center',gap:7,paddingHorizontal:12,paddingVertical:7,backgroundColor:colors.secondary,borderTopWidth:1,borderBottomWidth:1,borderColor:colors.border}}>
       <Text style={{fontSize:20,fontWeight:'700',color:colors.text}}>{parsed.getDate()}</Text>
       <View style={{backgroundColor:colors.surface,borderRadius:5,paddingHorizontal:6,paddingVertical:2}}>
        <Text style={{fontSize:12,color:colors.muted,fontWeight:'600'}}>{weekday}</Text>
       </View>
      </View>
      {group.map(expense=><Pressable
       key={expense.id}
       accessibilityRole="button"
       accessibilityLabel={expense.category+', '+formatMoney(expense.amountPaise)}
       onPress={()=>router.push({pathname:'/expense/[id]',params:{id:expense.id}})}
       style={{flexDirection:'row',alignItems:'center',paddingHorizontal:12,paddingVertical:9,gap:9,borderBottomWidth:1,borderColor:colors.border,minHeight:56}}>
       <Text numberOfLines={2} style={{width:88,color:colors.muted,fontSize:11,lineHeight:17}}>{expense.category}</Text>
       <View style={{flex:1,gap:2}}>
        <Text numberOfLines={2} style={{color:colors.text,fontSize:15,fontWeight:'500'}}>{expense.note?.trim()||expense.category}</Text>
        {scope==='household'?
         <Text style={{color:colors.muted,fontSize:12}}>{expense.ownerId==='local-user'||expense.ownerId===currentUserId?'You':'Partner'}</Text>:null}
       </View>
       <Text style={{color:'#F25B59',fontSize:15,fontWeight:'500',textAlign:'right'}}>{formatMoney(expense.amountPaise)}</Text>
      </Pressable>)}
     </View>;
    })
   }
  </Screen>
  <AddExpenseButton/>
 </View>;
}
