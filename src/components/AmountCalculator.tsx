import React,{useState} from 'react';
import {Pressable,Text,View} from 'react-native';
import {useAppTheme} from '@/theme/ThemeContext';
import {initialCalculator,pressCalculator,type CalculatorState} from '@/lib/calculator';

const keys=['C','⌫','÷','×','7','8','9','−','4','5','6','+','1','2','3','=','0','.','Done'];
type Props={value:string;onChange:(amount:string)=>void;onDisplayChange?:(expression:string)=>void;onDone:()=>void};
export function AmountCalculator({value,onChange,onDisplayChange,onDone}:Props){
 const {colors}=useAppTheme();
 const [state,setState]=useState<CalculatorState>(()=>initialCalculator(value||'0'));
 const [expression,setExpression]=useState(value||'0');
 const accent=colors.household;
 function publish(display:string){setExpression(display);onDisplayChange?.(display)}
 function tap(label:string){
  if(label==='Done'||label==='='){
   const next=state.operator&&state.startNew?{...state,operator:null,accumulator:null}:pressCalculator(state,'=');
   setState(next);
   if(next.error)return;
   const result=String(Number(next.display));
   publish(result);onChange(result);
   if(label==='Done')onDone();
   return;
  }
  const key=label==='−'?'-':label;
  const next=pressCalculator(state,key);
  setState(next);
  if(next.error)return;
  if(key==='C'){publish('0');return}
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
  if(state.startNew){publish(key==='.'?'0.':key);return}
  if(expression==='0'&&key!=='.'){publish(key);return}
  publish(expression+key);
 }
 return <View style={{backgroundColor:colors.surface,borderRadius:10,padding:7,borderWidth:1,borderColor:colors.border}}>
  {state.error?<Text accessibilityRole="alert" style={{color:'#C94F4F',fontSize:12,padding:6}}>{state.error}</Text>:null}
  <View style={{flexDirection:'row',flexWrap:'wrap',gap:6}}>
   {keys.map(label=>{
    const isDone=label==='Done',isOperation=['+','−','×','÷','='].includes(label);
    return <Pressable key={label} accessibilityRole="button" accessibilityLabel={isDone?'Use amount':label==='⌫'?'Backspace':label==='C'?'Clear calculator':label}
     onPress={()=>tap(label)} style={{width:'23%',flexGrow:1,minHeight:43,borderRadius:7,alignItems:'center',justifyContent:'center',
      backgroundColor:isDone?accent:isOperation?colors.secondary:colors.background}}>
     <Text style={{fontSize:isDone?14:19,fontWeight:isDone?'700':'500',color:isDone?'#fff':colors.text}}>{label}</Text>
    </Pressable>;
   })}
  </View>
 </View>;
}
