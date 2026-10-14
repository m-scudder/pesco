import React from 'react';
import {ScrollView,StyleSheet,ViewStyle} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {useAppTheme} from '@/theme/ThemeContext';
export function Screen({children,style}:{children:React.ReactNode;style?:ViewStyle}){
 const {colors}=useAppTheme();const insets=useSafeAreaInsets();
 return <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={[styles.content,{backgroundColor:colors.background,paddingTop:Math.max(insets.top,12)+4},style]}>{children}</ScrollView>
}
const styles=StyleSheet.create({content:{flexGrow:1,paddingHorizontal:16,paddingBottom:90,gap:12}});
