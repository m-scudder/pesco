import {fontSizes,fontFamilies,fontWeights} from '@/theme/typography';
import React,{useEffect} from 'react';
import {Pressable,StyleSheet,Text,View} from 'react-native';
import {useAppTheme} from '@/theme/ThemeContext';
import {useData} from '@/data';
export function Heading({children,subtitle}:{children:React.ReactNode;subtitle?:string}){
 const {colors}=useAppTheme();return <View style={{gap:3}}><Text style={[styles.title,{color:colors.text,fontFamily:fontFamilies.displayBold}]}>{children}</Text>{subtitle?<Text style={{color:colors.muted,fontSize:fontSizes.caption,fontFamily:fontFamilies.regular}}>{subtitle}</Text>:null}</View>
}
export function Card({children}:{children:React.ReactNode}){
 const {colors}=useAppTheme();return <View style={[styles.card,{backgroundColor:colors.surface,borderColor:colors.border}]}>{children}</View>
}
export function Body({children,muted=false}:{children:React.ReactNode;muted?:boolean}){
 const {colors}=useAppTheme();return <Text style={{color:muted?colors.muted:colors.text,fontSize:fontSizes.body,fontFamily:fontFamilies.regular}}>{children}</Text>
}
export function ScopeSwitch(){
 const {colors,scope,setScope}=useAppTheme();
 const {household}=useData();
 useEffect(()=>{if(!household&&scope!=='personal')setScope('personal')},[household,scope,setScope]);
 if(!household)return null;
 return <View style={[styles.switch,{backgroundColor:colors.secondary}]}>{(['household','personal'] as const).map(item=>{
 const selected=scope===item;return <Pressable accessibilityRole="button" accessibilityState={{selected}} key={item} onPress={()=>setScope(item)} style={[styles.segment,selected&&{backgroundColor:colors.surface,borderBottomWidth:2,borderBottomColor:colors.household}]}><Text style={{fontSize:fontSizes.label,color:selected?(item==='household'?colors.household:colors.personal):colors.muted,fontWeight:selected?'700':'500',fontFamily:selected?'Inter_700Bold':'Inter_500Medium'}}>{item==='household'?'Household':'Personal'}</Text></Pressable>
 })}</View>
}
const styles=StyleSheet.create({title:{fontSize:fontSizes.summary,fontWeight:fontWeights.bold},card:{borderWidth:1,borderRadius:12,padding:14,gap:10},switch:{flexDirection:'row',padding:3,borderRadius:11},segment:{flex:1,paddingVertical:9,borderRadius:8,alignItems:'center'}});
