import React,{useEffect,useRef} from 'react';
import {Animated,Easing,Text,View} from 'react-native';
import {Ionicons} from '@expo/vector-icons';
import {useAppTheme} from '@/theme/ThemeContext';

/** Lightweight branded loading view; starts immediately and stops on unmount. */
export function PescoLoader({message='Getting things ready…'}:{message?:string}){
 const {colors}=useAppTheme();
 const bg=colors.background;
 const text=colors.text;
 const muted=colors.muted;
 const bounce=useRef(new Animated.Value(0)).current;
 const fade=useRef(new Animated.Value(0.35)).current;
 useEffect(()=>{
  const animation=Animated.parallel([
   Animated.loop(Animated.sequence([
    Animated.timing(bounce,{toValue:-9,duration:620,easing:Easing.inOut(Easing.sin),useNativeDriver:true}),
    Animated.timing(bounce,{toValue:0,duration:620,easing:Easing.inOut(Easing.sin),useNativeDriver:true})
   ])),
   Animated.loop(Animated.sequence([
    Animated.timing(fade,{toValue:1,duration:620,useNativeDriver:true}),
    Animated.timing(fade,{toValue:0.35,duration:620,useNativeDriver:true})
   ]))
  ]);
  animation.start();
  return()=>animation.stop();
 },[bounce,fade]);
 return <View accessibilityRole="progressbar" accessibilityLabel={message}
  style={{flex:1,backgroundColor:bg,alignItems:'center',justifyContent:'center',gap:18,padding:24}}>
  <Animated.View style={{transform:[{translateY:bounce}],height:90,width:90,borderRadius:25,backgroundColor:'#078B72',alignItems:'center',justifyContent:'center'}}>
   <Ionicons name="home" size={48} color="#FFF9E8"/>
   <View style={{position:'absolute',bottom:13,right:13,backgroundColor:'#FFC940',width:34,height:25,borderRadius:7,borderWidth:2,borderColor:'#078B72'}}/>
  </Animated.View>
  <View style={{alignItems:'center',gap:6}}>
   <Text style={{fontSize:23,fontWeight:'800',color:text,letterSpacing:1}}>PESCO</Text>
   <Text style={{color:muted,fontSize:13}}>{message}</Text>
  </View>
  <View style={{flexDirection:'row',gap:8}}>
   {[0,1,2].map(i=><Animated.View key={i} style={{width:7,height:7,borderRadius:4,backgroundColor:'#19AF91',opacity:fade,transform:[{scale:i===1?1.25:1}]}}/>)}
  </View>
 </View>;
}
