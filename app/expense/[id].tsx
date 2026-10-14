import React from 'react';
import {Alert,Pressable,Text,View} from 'react-native';
import {useLocalSearchParams,useRouter} from 'expo-router';
import {Screen} from '@/components/Screen';
import {Body,Card,Heading} from '@/components/UI';
import {formatMoney,useData} from '@/data';
import {useAppTheme} from '@/theme/ThemeContext';

export default function Detail(){
 const {id}=useLocalSearchParams<{id:string}>();
 const {expenses,remove,currentUserId}=useData();
 const {colors}=useAppTheme();const router=useRouter();
 const e=expenses.find(x=>x.id===id);
 if(!e)return <Screen modal><Body muted>Expense not found.</Body></Screen>;
 const editable=e.ownerId==='local-user'||e.ownerId===currentUserId;
 const doDelete=async()=>{
  try{await remove(e.id);router.back()}
  catch(error){Alert.alert('Could not delete',error instanceof Error?error.message:'Try again')}
 };
 return <Screen modal>
  <Heading>{formatMoney(e.amountPaise)}</Heading>
  <Card>{[['Category',e.category],['Date',e.date],['Type',e.scope],['Note',e.note||'—'],['Added by',editable?'You':'Partner']].map(([label,value])=>
   <View key={label} style={{flexDirection:'row',justifyContent:'space-between',gap:12,paddingVertical:8,borderBottomWidth:1,borderColor:colors.border}}>
    <Body muted>{label}</Body><Text style={{color:colors.text,flexShrink:1}}>{value}</Text>
   </View>)}</Card>
  {editable?<><Pressable onPress={()=>router.push({pathname:'/expense/new',params:{id:e.id}})} style={{backgroundColor:colors.household,padding:13,borderRadius:10,alignItems:'center'}}>
   <Text style={{color:'#fff',fontWeight:'700'}}>Edit</Text></Pressable>
   <Pressable onPress={()=>Alert.alert('Delete expense?','This cannot be undone.',[
    {text:'Cancel',style:'cancel'},{text:'Delete',style:'destructive',onPress:()=>{void doDelete()}}
   ])} style={{padding:12,alignItems:'center'}}><Text style={{color:'#C54B4B'}}>Delete</Text></Pressable></>:null}
 </Screen>;
}
