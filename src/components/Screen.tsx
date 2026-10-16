import React from 'react';
import {ScrollView,StyleSheet,ViewStyle} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {useAppTheme} from '@/theme/ThemeContext';

export function Screen({children,style,modal=false}:{children:React.ReactNode;style?:ViewStyle;modal?:boolean}){
 const {colors}=useAppTheme();const insets=useSafeAreaInsets();
 return <ScrollView style={{flex:1,backgroundColor:colors.background}} keyboardShouldPersistTaps="handled" contentContainerStyle={[styles.content,{paddingTop:modal?12:Math.max(insets.top,12)+4},style]}>{children}</ScrollView>
}
const styles=StyleSheet.create({content:{paddingHorizontal:0,paddingBottom:88,gap:12}});
