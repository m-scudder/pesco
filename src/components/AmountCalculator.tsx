import {fontSizes,fontWeights} from '@/theme/typography';
import React,{useState} from 'react';
import {Pressable,Text,View} from 'react-native';
import {Ionicons} from '@expo/vector-icons';
import {useAppTheme} from '@/theme/ThemeContext';
import {calculate,calculatorExpression,initialCalculator,pressCalculator,type CalculatorState} from '@/lib/calculator';

const keys=['+','−','×','÷','7','8','9','=','4','5','6','%','1','2','3','.','C','0','Back','OK'];
type Props={value:string;onChange:(amount:string)=>void;onDisplayChange?:(expression:string)=>void;onDone:()=>void};
export function AmountCalculator({value,onChange,onDisplayChange,onDone}:Props){
 const {colors}=useAppTheme();
 const [state,setState]=useState<CalculatorState>(()=>initialCalculator(value));
 const accent=colors.household;
 function tap(label:string){
  const key=label==='−'?'-':label==='Back'?'⌫':label;
  const next=pressCalculator(state,key==='OK'?'=':key);
  if(next===state)return;
  setState(next);
  if(next.error)return;
  onDisplayChange?.(calculatorExpression(next));
  if(key==='C'){
   onChange('');
   return;
  }
  // Operators only change the expression. A pending operand must never replace
  // the displayed result (0.78 × 10 means 7.8, not 10).
  if(key==='='||key==='OK'){
   onChange(String(Number(next.display)));
  }else if(!['+','-','×','÷'].includes(key)&&!next.startNew){
   const amount=next.operator&&next.accumulator!==null
    ?calculate(next.accumulator,Math.round(Number(next.display)*100),next.operator)
    :Math.round(Number(next.display)*100);
   if(amount!==null&&Number.isSafeInteger(amount)&&amount>=0)
    onChange(String(amount/100));
  }
  if(key==='OK')onDone();
 }
 return <View style={{paddingVertical:4}}>
  {state.error?<Text accessibilityRole="alert" style={{color:'#C94F4F',fontSize:fontSizes.caption,padding:6}}>{state.error}</Text>:null}
  <View style={{flexDirection:'row',flexWrap:'wrap',gap:6}}>
   {keys.map(label=>{
    const isDone=label==='OK',isOperation=['+','−','×','÷','='].includes(label);
    return <Pressable key={label} accessibilityRole="button" accessibilityLabel={isDone?'Close calculator':label==='Back'?'Backspace':label==='C'?'Clear calculator':label}
     onPress={()=>tap(label)} style={{width:'23%',flexGrow:1,minHeight:43,borderRadius:7,alignItems:'center',justifyContent:'center',
      backgroundColor:isDone?accent:isOperation?colors.secondary:colors.background,borderWidth:1,borderColor:colors.border}}>
     {label==='Back'?<Ionicons name="backspace-outline" size={23} color={colors.text}/>:isDone?<Ionicons name="checkmark" size={24} color="#fff"/>:<Text style={{fontSize:fontSizes.title,fontWeight:fontWeights.medium,color:colors.text}}>{label}</Text>}
    </Pressable>;
   })}
  </View>
 </View>;
}
