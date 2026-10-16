import {fontSizes,fontFamilies,fontWeights} from '@/theme/typography';
import React from 'react';
import {Pressable,Text,View} from 'react-native';
import {useAppTheme} from '@/theme/ThemeContext';
export function MonthPicker({month,onChange}:{month:string;onChange:(v:string)=>void}){
 const {colors}=useAppTheme();const [year,index]=month.split('-').map(Number);
 const shift=(delta:number)=>{const d=new Date(year,index-1+delta,1);onChange(d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0'))};
 return <View style={{flexDirection:'row',alignItems:'center',justifyContent:'space-between'}}><Pressable accessibilityLabel="Previous month" onPress={()=>shift(-1)} style={{padding:8}}><Text style={{color:colors.text,fontSize:fontSizes.summary}}>‹</Text></Pressable><Text style={{color:colors.text,fontWeight:fontWeights.semibold,fontSize:fontSizes.section}}>{new Date(year,index-1,1).toLocaleDateString('en-IN',{month:'long',year:'numeric'})}</Text><Pressable accessibilityLabel="Next month" onPress={()=>shift(1)} style={{padding:8}}><Text style={{color:colors.text,fontSize:fontSizes.summary}}>›</Text></Pressable></View>;
}