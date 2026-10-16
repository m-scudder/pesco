import {fontSizes,fontFamilies,fontWeights} from '@/theme/typography';
import React from 'react';
import {Pressable,ScrollView,Text,View} from 'react-native';
import {Ionicons} from '@expo/vector-icons';
import {useAppTheme} from '@/theme/ThemeContext';

type Props={options:string[];selected:string;onSelect:(value:string)=>void;onClose:()=>void;onEdit:()=>void};
export function BottomCategoryPicker({options,selected,onSelect,onClose,onEdit}:Props){
 const {colors}=useAppTheme();
 // Match the five-row calculator: 5 × 43px keys + 4 × 6px gaps + 8px vertical padding.
 return <View style={{height:247,backgroundColor:colors.background,paddingTop:8,paddingBottom:8}}>
  <View style={{flexDirection:'row',alignItems:'center',paddingHorizontal:8,paddingBottom:9,borderBottomWidth:1,borderBottomColor:colors.border}}>
   <Text style={{flex:1,color:colors.text,fontSize:fontSizes.section,fontFamily:fontFamilies.semibold}}>Category</Text>
   <Pressable accessibilityRole="button" accessibilityLabel="Edit categories" onPress={onEdit} style={{width:42,height:38,alignItems:'center',justifyContent:'center'}}>
    <Ionicons name="pencil-outline" size={21} color={colors.text}/>
   </Pressable>
   <Pressable accessibilityRole="button" accessibilityLabel="Close categories" onPress={onClose} style={{width:42,height:38,alignItems:'center',justifyContent:'center'}}>
    <Ionicons name="close" size={24} color={colors.text}/>
   </Pressable>
  </View>
  <ScrollView style={{flex:1}} keyboardShouldPersistTaps="always">
   <View style={{flexDirection:'row',flexWrap:'wrap'}}>
    {options.map(name=><Pressable key={name} accessibilityRole="button" accessibilityState={{selected:name===selected}} onPress={()=>onSelect(name)}
     style={{width:'33.333%',minHeight:54,borderBottomWidth:1,borderRightWidth:1,borderColor:colors.border,justifyContent:'center',alignItems:'center',padding:5,backgroundColor:name===selected?colors.secondary:colors.background}}>
     <Text numberOfLines={3} style={{color:name===selected?colors.household:colors.text,fontSize:fontSizes.label,textAlign:'center',fontFamily:name===selected?fontFamilies.semibold:fontFamilies.regular}}>{name}</Text>
    </Pressable>)}
   </View>
  </ScrollView>
 </View>;
}
