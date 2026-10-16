import {fontSizes,fontFamilies,fontWeights} from '@/theme/typography';
import React,{useState} from 'react';
import {Pressable,Text,View} from 'react-native';
import {Ionicons} from '@expo/vector-icons';
import {useAppTheme} from '@/theme/ThemeContext';
import {initialCalculator,pressCalculator,type CalculatorState} from '@/lib/calculator';

const keys=['+','−','×','÷','7','8','9','=','4','5','6','.','1','2','3','Back','','0','','OK'];
type Props={value:string;onChange:(amount:string)=>void;onDisplayChange?:(expression:string)=>void;onDone:()=>void};
export function AmountCalculator({value,onChange,onDisplayChange,onDone}:Props){
 const {colors}=useAppTheme();
 const [state,setState]=useState<CalculatorState>(()=>initialCalculator(value||'0'));
 const [expression,setExpression]=useState(value||'0');
 const accent=colors.household;
 function publish(display:string){setExpression(display);onDisplayChange?.(display)}
 function tap(label:string){
  if(label==='OK'||label==='='){
   const next=state.operator&&state.startNew?{...state,operator:null,accumulator:null}:pressCalculator(state,'=');
   setState(next);
   if(next.error)return;
   const result=String(Number(next.display));
   publish(result);onChange(result);
   if(label==='OK')onDone();
   return;
  }
  const key=label==='−'?'-':label==='Back'?'⌫':label;
  const next=pressCalculator(state,key);
  setState(next);
  if(next.error)return;
  if(key==='C'){publish('0');return}
  if(key==='%'){
   if(next===state)return;
   publish(expression.trimEnd()+'%');
   return;
  }
  if(key==='⌫'){
   if(state.startNew&&state.operator){
    const previous=expression.replace(/\s[+−×÷]\s*$/,'');
    publish(previous||'0');
   }else publish(expression.slice(0,-1)||'0');
   return;
  }
  if(['+','-','×','÷'].includes(key)){
   const symbol=key==='-'?'−':key;
   if(state.startNew&&state.operator){
    publish(expression.replace(/[+−×÷]\s*$/,symbol+' '));
   }else{
    // The display contains the whole expression until '=' is pressed.
    const prefix=expression.trim();
    publish(prefix+' '+symbol+' ');
   }
   return;
  }
  if(key==='.'&&state.startNew){publish(expression+'0.');return}
  if(state.startNew&&state.operator){publish(expression+key);return}
  if(expression.endsWith('%')){
   publish(next.display);
   return;
  }
  if(state.startNew){publish(key==='.'?'0.':key);return}
  if(expression==='0'&&key!=='.'){publish(key);return}
  publish(expression+key);
 }
 return <View style={{paddingVertical:4}}>
  {state.error?<Text accessibilityRole="alert" style={{color:'#C94F4F',fontSize:fontSizes.caption,padding:6}}>{state.error}</Text>:null}
  <View style={{flexDirection:'row',flexWrap:'wrap',gap:6}}>
   {keys.map((label,index)=>{
    if(!label)return <View key={'blank-'+index} style={{width:'23%',flexGrow:1,minHeight:43}}/>;
    const isDone=label==='OK',isOperation=['+','−','×','÷','='].includes(label);
    return <Pressable key={label} accessibilityRole="button" accessibilityLabel={isDone?'Use amount':label==='Back'?'Backspace':label==='C'?'Clear calculator':label}
     onPress={()=>tap(label)} style={{width:'23%',flexGrow:1,minHeight:43,borderRadius:7,alignItems:'center',justifyContent:'center',
      backgroundColor:isDone?accent:isOperation?colors.secondary:colors.background,borderWidth:1,borderColor:colors.border}}>
     {label==='Back'?<Ionicons name="backspace-outline" size={23} color={colors.text}/>:isDone?<Ionicons name="return-down-back" size={24} color="#fff"/>:<Text style={{fontSize:fontSizes.title,fontWeight:fontWeights.medium,color:colors.text}}>{label}</Text>}
    </Pressable>;
   })}
  </View>
 </View>;
}
