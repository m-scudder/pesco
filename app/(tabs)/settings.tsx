import React from 'react';
import {Alert,Pressable,Text,View} from 'react-native';
import {useRouter} from 'expo-router';
import {Screen} from '@/components/Screen';
import {Body,Card,Heading} from '@/components/UI';
import {useAppTheme} from '@/theme/ThemeContext';
import {useData} from '@/data';
import type {Appearance} from '@/theme/palette';

export default function Settings(){
 const {appearance,setAppearance,colors}=useAppTheme();
 const {expenses,clearAll}=useData();const router=useRouter();
 const link=(label:string,onPress:()=>void)=><Pressable accessibilityRole="button" onPress={onPress} style={{minHeight:42,justifyContent:'center'}}><Text style={{color:colors.text,fontSize:15}}>{label}  ›</Text></Pressable>;
 return <Screen>
  <Heading>Settings</Heading>
  <Card>{link('Household & invite code',()=>router.push('/household'))}{link('Monthly budgets',()=>router.push('/budget'))}</Card>
  <Card>
   <Body>Appearance</Body>
   <View style={{flexDirection:'row',gap:6}}>{(['system','light','dark'] as Appearance[]).map(value=><Pressable key={value} onPress={()=>setAppearance(value)} style={{flex:1,alignItems:'center',paddingVertical:9,borderRadius:8,backgroundColor:appearance===value?colors.secondary:colors.background}}><Text style={{color:colors.text,textTransform:'capitalize',fontSize:13,fontWeight:appearance===value?'700':'400'}}>{value}</Text></Pressable>)}</View>
  </Card>
  <Card>
   <Body muted>{expenses.length} saved locally</Body>
   <Pressable onPress={()=>Alert.alert('Delete local expenses?','This cannot be undone.',[{text:'Cancel',style:'cancel'},{text:'Delete',style:'destructive',onPress:clearAll}])}><Text style={{color:'#C94F4F',fontSize:13}}>Clear local data</Text></Pressable>
  </Card>
 </Screen>
}
