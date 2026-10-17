import React,{useState} from 'react';
import {Pressable,ScrollView,Text,View} from 'react-native';
import {Ionicons} from '@expo/vector-icons';
import {useRouter} from 'expo-router';
import {useAppTheme} from '@/theme/ThemeContext';
import {fontSizes,fontFamilies} from '@/theme/typography';

// UI-only preview until store subscriptions and server-verified entitlements are wired.
const features=[
 {icon:'people-outline' as const,title:'More people at home',detail:'Expand your household from 2 to 6 members'},
 {icon:'receipt-outline' as const,title:'Receipts on expenses',detail:'Add photos or files to keep proof of purchases'},
 {icon:'options-outline' as const,title:'More category budgets',detail:'Set spending limits for every category'},
 {icon:'stats-chart-outline' as const,title:'Deeper insights',detail:'Compare spending across months and members'},
];
export default function Plus(){
 const {colors}=useAppTheme();
 const router=useRouter();
 const [annual,setAnnual]=useState(true);
 return <ScrollView style={{flex:1,backgroundColor:colors.background}} contentContainerStyle={{padding:20,paddingBottom:48,gap:20}}>
  <View style={{alignItems:'center',gap:9,paddingTop:20}}>
   <Ionicons name="diamond-outline" size={32} color={colors.household}/>
   <Text style={{fontFamily:fontFamilies.displayBold,fontSize:fontSizes.summary,color:colors.text}}>More for your household</Text>
   <Text style={{fontSize:fontSizes.body,color:colors.muted,textAlign:'center'}}>One plan. Everyone included.</Text>
  </View>
  <View style={{backgroundColor:colors.surface,borderRadius:14,borderColor:colors.border,borderWidth:1,paddingHorizontal:16}}>
   {features.map((item,index)=><View key={item.title} style={{flexDirection:'row',alignItems:'center',gap:13,paddingVertical:15,borderBottomWidth:index===features.length-1?0:1,borderColor:colors.border}}>
    <Ionicons name={item.icon} size={20} color={colors.household}/>
    <View style={{flex:1,gap:3}}>
     <Text style={{fontFamily:fontFamilies.semibold,fontSize:fontSizes.body,color:colors.text}}>{item.title}</Text>
     <Text style={{fontFamily:fontFamilies.regular,fontSize:fontSizes.caption,color:colors.muted}}>{item.detail}</Text>
    </View>
   </View>)}
  </View>
  <View style={{gap:9}}>
   <Text style={{fontFamily:fontFamilies.semibold,fontSize:fontSizes.body,color:colors.text}}>Choose your plan</Text>
   {([{value:true,label:'Annual',price:'₹799 / year'},{value:false,label:'Monthly',price:'₹99 / month'}] as const).map(plan=>
    <Pressable key={plan.label} accessibilityRole="radio" accessibilityState={{selected:annual===plan.value}} onPress={()=>setAnnual(plan.value)}
     style={{flexDirection:'row',alignItems:'center',padding:14,borderRadius:12,borderWidth:1,borderColor:annual===plan.value?colors.household:colors.border,backgroundColor:colors.surface,gap:10}}>
     <Ionicons name={annual===plan.value?'radio-button-on':'radio-button-off'} size={20} color={annual===plan.value?colors.household:colors.muted}/>
     <Text style={{fontSize:fontSizes.body,color:colors.text,fontFamily:fontFamilies.medium,flex:1}}>{plan.label}</Text>
     <Text style={{fontSize:fontSizes.body,color:colors.text,fontFamily:fontFamilies.semibold}}>{plan.price}</Text>
    </Pressable>)}
  </View>
  <Pressable accessibilityRole="button" onPress={()=>router.back()} style={{minHeight:48,backgroundColor:colors.household,borderRadius:10,alignItems:'center',justifyContent:'center'}}>
   <Text style={{fontFamily:fontFamilies.semibold,fontSize:fontSizes.body,color:'#FFFFFF'}}>Coming Soon</Text>
  </Pressable>
  <Text style={{color:colors.muted,fontSize:fontSizes.caption,textAlign:'center'}}>Preview pricing only. Subscriptions are not available yet.</Text>
 </ScrollView>;
}
