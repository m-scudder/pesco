import React from 'react';
import {Alert,Pressable,Switch,Text,View} from 'react-native';
import {useRouter} from 'expo-router';
import {Screen} from '@/components/Screen';
import {Body,Card,Heading} from '@/components/UI';
import {useAppTheme} from '@/theme/ThemeContext';
import {useData} from '@/data';

export default function Settings(){
 const {resolved,setAppearance,colors}=useAppTheme();
 const {expenses,clearAll}=useData();const router=useRouter();
 const link=(label:string,onPress:()=>void)=><Pressable accessibilityRole="button" onPress={onPress} style={{minHeight:42,justifyContent:'center'}}><Text style={{color:colors.text,fontSize:15}}>{label}  ›</Text></Pressable>;
 return <Screen>
  <Heading>Settings</Heading>
  <Card>{link('Household & invite code',()=>router.push('/household'))}{link('Monthly budgets',()=>router.push('/budget'))}</Card>
  <Card>
   <View style={{flexDirection:'row',alignItems:'center',justifyContent:'space-between',minHeight:42}}>
    <Body>Dark mode</Body>
    <Switch accessibilityLabel="Dark mode" accessibilityRole="switch" value={resolved==='dark'} onValueChange={enabled=>setAppearance(enabled?'dark':'light')} trackColor={{false:colors.secondary,true:colors.household}} thumbColor="#FFFFFF"/>
   </View>
  </Card>
  <Card>
   <Body muted>{expenses.length} saved locally</Body>
   <Pressable onPress={()=>Alert.alert('Delete local expenses?','This cannot be undone.',[{text:'Cancel',style:'cancel'},{text:'Delete',style:'destructive',onPress:clearAll}])}><Text style={{color:'#C94F4F',fontSize:13}}>Clear local data</Text></Pressable>
  </Card>
 </Screen>
}
