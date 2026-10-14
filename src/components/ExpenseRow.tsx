import React from 'react';
import {Pressable,Text,View} from 'react-native';
import {useRouter} from 'expo-router';
import {Expense,formatMoney,useData} from '@/data';
import {useAppTheme} from '@/theme/ThemeContext';
export function ExpenseRow({expense}:{expense:Expense}){
 const {colors}=useAppTheme();const router=useRouter();const {currentUserId}=useData();
 return <Pressable onPress={()=>router.push({pathname:'/expense/[id]',params:{id:expense.id}})} accessibilityRole="button" accessibilityLabel={expense.category+', '+formatMoney(expense.amountPaise)} style={{flexDirection:'row',paddingVertical:14,borderBottomWidth:1,borderColor:colors.border,alignItems:'center',gap:12}}>
 <View style={{flex:1,gap:4}}><Text style={{color:colors.text,fontSize:15,fontWeight:'600'}}>{expense.category}</Text><Text numberOfLines={1} style={{color:colors.muted,fontSize:12}}>{expense.note||'Expense'}{expense.scope==='household'?(expense.ownerId==='local-user'||expense.ownerId===currentUserId?' · You':' · Partner'):''}</Text></View><Text style={{color:colors.text,fontSize:15,fontWeight:'600'}}>{formatMoney(expense.amountPaise)}</Text></Pressable>;
}