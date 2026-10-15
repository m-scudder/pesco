import React from 'react';
import {Pressable,Text,View} from 'react-native';
import Svg,{Path} from 'react-native-svg';
import {useAppTheme} from '@/theme/ThemeContext';

// Google's multicolor G (not the single-color icon-font approximation).
function GoogleMark(){
 return <Svg width={20} height={20} viewBox="0 0 24 24" accessibilityElementsHidden>
  <Path fill="#4285F4" d="M21.35 11.1H12v3.8h5.35c-.23 1.24-.94 2.29-2 3v2.5h3.22c1.88-1.73 2.96-4.28 2.96-7.3 0-.67-.06-1.32-.18-1.95z"/>
  <Path fill="#34A853" d="M12 22c2.7 0 4.96-.9 6.61-2.45l-3.22-2.5c-.9.6-2.05.95-3.39.95-2.61 0-4.82-1.76-5.61-4.13H3.08v2.59A10 10 0 0 0 12 22z"/>
  <Path fill="#FBBC05" d="M6.39 13.87A5.99 5.99 0 0 1 6.08 12c0-.65.11-1.28.31-1.87V7.54H3.08A10 10 0 0 0 2 12c0 1.61.39 3.13 1.08 4.46l3.31-2.59z"/>
  <Path fill="#EA4335" d="M12 6c1.43 0 2.71.49 3.72 1.47l2.79-2.79A9.96 9.96 0 0 0 12 2a10 10 0 0 0-8.92 5.54l3.31 2.59C7.18 7.76 9.39 6 12 6z"/>
 </Svg>;
}
export function GoogleSignInButton({onPress,disabled=false,loading=false}:{onPress:()=>void;disabled?:boolean;loading?:boolean}){
 const {resolved,colors}=useAppTheme();
 const dark=resolved==='dark';
 return <Pressable accessibilityRole="button" accessibilityLabel="Continue with Google" disabled={disabled||loading} onPress={onPress}
  style={{height:48,width:'100%',maxWidth:300,alignSelf:'center',backgroundColor:dark?colors.background:'#FFFFFF',borderWidth:1,borderColor:dark?'#8E918F':'#747775',borderRadius:10,flexDirection:'row',alignItems:'center',justifyContent:'center',opacity:disabled||loading?0.55:1}}>
  <View style={{position:'absolute',left:18,justifyContent:'center'}}><GoogleMark/></View>
  <Text style={{color:dark?'#E3E3E3':'#1F1F1F',fontSize:14,fontFamily:'Inter_500Medium'}}>{loading?'Connecting…':'Continue with Google'}</Text>
 </Pressable>;
}
