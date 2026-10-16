import React from 'react';
import {Pressable,ScrollView,Text,View} from 'react-native';
import {Ionicons} from '@expo/vector-icons';
import {useAppTheme} from '@/theme/ThemeContext';

type Props={options:string[];selected:string;onSelect:(value:string)=>void;onClose:()=>void;onEdit:()=>void};
export function BottomCategoryPicker({options,selected,onSelect,onClose,onEdit}:Props){
 const {colors}=useAppTheme();
 return <View style={{backgroundColor:colors.background,paddingTop:8,paddingBottom:8}}>
  <View style={{flexDirection:'row',alignItems:'center',paddingHorizontal:8,paddingBottom:9,borderBottomWidth:1,borderBottomColor:colors.border}}>
   <Text style={{flex:1,color:colors.text,fontSize:16,fontFamily:'Inter_600SemiBold'}}>Category</Text>
   <Pressable accessibilityRole="button" accessibilityLabel="Edit categories" onPress={onEdit} style={{width:42,height:38,alignItems:'center',justifyContent:'center'}}>
    <Ionicons name="pencil-outline" size={21} color={colors.text}/>
   </Pressable>
   <Pressable accessibilityRole="button" accessibilityLabel="Close categories" onPress={onClose} style={{width:42,height:38,alignItems:'center',justifyContent:'center'}}>
    <Ionicons name="close" size={24} color={colors.text}/>
   </Pressable>
  </View>
  <ScrollView style={{maxHeight:285}} keyboardShouldPersistTaps="always">
   <View style={{flexDirection:'row',flexWrap:'wrap'}}>
    {options.map(name=><Pressable key={name} accessibilityRole="button" accessibilityState={{selected:name===selected}} onPress={()=>onSelect(name)}
     style={{width:'33.333%',minHeight:74,borderBottomWidth:1,borderRightWidth:1,borderColor:colors.border,justifyContent:'center',alignItems:'center',padding:8,backgroundColor:name===selected?colors.secondary:colors.background}}>
     <Text numberOfLines={3} style={{color:name===selected?colors.household:colors.text,fontSize:13,textAlign:'center',fontFamily:name===selected?'Inter_600SemiBold':'Inter_400Regular'}}>{name}</Text>
    </Pressable>)}
   </View>
  </ScrollView>
 </View>;
}
