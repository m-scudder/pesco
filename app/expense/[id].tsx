import {fontSizes,fontFamilies} from '@/theme/typography';
import React from 'react';
import {Alert,Pressable,Text,View} from 'react-native';
import {Ionicons} from '@expo/vector-icons';
import {useLocalSearchParams,useRouter} from 'expo-router';
import {Screen} from '@/components/Screen';
import {formatMoney,useData} from '@/data';
import {useAppTheme} from '@/theme/ThemeContext';

export default function Detail(){
 const {id}=useLocalSearchParams<{id:string}>();
 const {expenses,remove,currentUserId}=useData();
 const {colors}=useAppTheme();
 const router=useRouter();
 const expense=expenses.find(item=>item.id===id);
 if(!expense)return <Screen modal><Text style={{color:colors.muted,fontSize:fontSizes.body}}>Expense not found.</Text></Screen>;
 const editable=expense.ownerId==='local-user'||expense.ownerId===currentUserId;
 const date=new Date(expense.date+'T12:00:00').toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'});
 const displayAmount=formatMoney(expense.amountPaise).replace(/\\.00$/,'');
 const type=expense.scope==='household'?'Household':'Personal';
 const rows=[
  {label:'Category',value:expense.category,icon:'pricetag-outline' as const},
  {label:'Date',value:date,icon:'calendar-outline' as const},
  {label:'Note',value:expense.note.trim()||'No note added',icon:'document-text-outline' as const},
 ];
 const doDelete=async()=>{
  try{await remove(expense.id);router.back()}
  catch(error){Alert.alert('Could not delete',error instanceof Error?error.message:'Try again')}
 };
 return <Screen modal style={{gap:18}}>
  <View style={{alignItems:'center',paddingVertical:22,gap:10}}>
   <Text style={{color:colors.muted,fontFamily:fontFamilies.medium,fontSize:fontSizes.caption,letterSpacing:1}}>EXPENSE AMOUNT</Text>
   <Text adjustsFontSizeToFit numberOfLines={1} style={{color:colors.text,fontFamily:fontFamilies.displayBold,fontSize:fontSizes.display+6,fontVariant:['tabular-nums']}}>{displayAmount}</Text>
   <View style={{flexDirection:'row',alignItems:'center',gap:7,paddingHorizontal:12,paddingVertical:7,borderRadius:20,backgroundColor:colors.secondary}}>
    <Ionicons name={expense.scope==='household'?'people-outline':'person-outline'} size={15} color={colors.household}/>
    <Text style={{fontFamily:fontFamilies.medium,fontSize:fontSizes.label,color:colors.text}}>{type} expense</Text>
    <View style={{width:3,height:3,borderRadius:2,backgroundColor:colors.muted}}/>
    <Text style={{fontFamily:fontFamilies.medium,fontSize:fontSizes.label,color:colors.muted}}>{editable?'Added by you':'Added by partner'}</Text>
   </View>
  </View>
  <View style={{backgroundColor:colors.surface,borderRadius:14,borderWidth:1,borderColor:colors.border,paddingHorizontal:16}}>
   {rows.map((row,index)=><View key={row.label} style={{flexDirection:'row',alignItems:'center',gap:14,minHeight:74,paddingVertical:14,borderBottomWidth:index===rows.length-1?0:1,borderColor:colors.border}}>
    <Ionicons name={row.icon} size={19} color={colors.muted}/>
    <View style={{flex:1,gap:5}}>
     <Text style={{fontFamily:fontFamilies.medium,fontSize:fontSizes.caption,color:colors.muted,letterSpacing:0.5}}>{row.label.toUpperCase()}</Text>
     <Text style={{fontFamily:fontFamilies.medium,fontSize:fontSizes.input,color:row.label==='Note'&&!expense.note.trim()?colors.muted:colors.text}}>{row.value}</Text>
    </View>
   </View>)}
  </View>
  {editable?<View style={{gap:10}}>
   <Pressable accessibilityRole="button" onPress={()=>router.push({pathname:'/expense/new',params:{id:expense.id}})}
    style={{minHeight:48,borderRadius:10,alignItems:'center',justifyContent:'center',backgroundColor:colors.household}}>
    <Text style={{color:'#FFFFFF',fontFamily:fontFamilies.semibold,fontSize:fontSizes.body}}>Edit expense</Text>
   </Pressable>
   <Pressable accessibilityRole="button" onPress={()=>Alert.alert('Delete expense?','This cannot be undone.',[
    {text:'Cancel',style:'cancel'},{text:'Delete',style:'destructive',onPress:()=>{void doDelete()}}
   ])} style={{minHeight:42,alignItems:'center',justifyContent:'center'}}>
    <Text style={{color:'#C54B4B',fontFamily:fontFamilies.medium,fontSize:fontSizes.body}}>Delete expense</Text>
   </Pressable>
  </View>:null}
 </Screen>;
}
