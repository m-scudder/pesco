import {fontSizes,fontFamilies,fontWeights,textStyles} from '@/theme/typography';
import React,{useEffect} from 'react';
import {Pressable,StyleSheet,Text,View} from 'react-native';
import {useAppTheme} from '@/theme/ThemeContext';
import {useData} from '@/data';
export function Heading({children,subtitle}:{children:React.ReactNode;subtitle?:string}){
 const {colors}=useAppTheme();return <View style={{gap:3}}><Text style={[styles.title,textStyles.title,{color:colors.text}]}>{children}</Text>{subtitle?<Text style={{color:colors.muted,fontSize:fontSizes.caption,fontFamily:fontFamilies.regular}}>{subtitle}</Text>:null}</View>
}
export function Card({children}:{children:React.ReactNode}){
 const {colors}=useAppTheme();return <View style={[styles.card,{backgroundColor:colors.surface,borderColor:colors.border}]}>{children}</View>
}
export function Body({children,muted=false}:{children:React.ReactNode;muted?:boolean}){
 const {colors}=useAppTheme();return <Text style={[textStyles.body,{color:muted?colors.muted:colors.text}]}>{children}</Text>
}
export function ScopeSwitch(){
 const {colors,scope,setScope}=useAppTheme();
 const {household}=useData();
 useEffect(()=>{if(!household&&scope!=='personal')setScope('personal')},[household,scope,setScope]);
 if(!household)return null;
 return <View style={[styles.switch,{backgroundColor:colors.secondary}]}>{(['household','personal'] as const).map(item=>{
 const selected=scope===item;return <Pressable accessibilityRole="button" accessibilityState={{selected}} key={item} onPress={()=>setScope(item)} style={[styles.segment,selected&&{backgroundColor:colors.surface,borderBottomWidth:2,borderBottomColor:colors.household}]}><Text style={{fontSize:fontSizes.label,color:selected?(item==='household'?colors.household:colors.personal):colors.muted,fontWeight:selected?fontWeights.bold:fontWeights.medium,fontFamily:selected?fontFamilies.bold:fontFamilies.medium}}>{item==='household'?'Household':'Personal'}</Text></Pressable>
 })}</View>
}
const styles=StyleSheet.create({title:{fontSize:fontSizes.summary,fontWeight:fontWeights.bold},card:{borderWidth:1,borderRadius:0,padding:14,gap:10},switch:{flexDirection:'row',padding:3,borderRadius:0},segment:{flex:1,paddingVertical:9,borderRadius:0,alignItems:'center'}});
