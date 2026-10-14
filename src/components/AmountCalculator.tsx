import React,{useState} from 'react';
import {Pressable,Text,View} from 'react-native';
import {useAppTheme} from '@/theme/ThemeContext';
import {initialCalculator,pressCalculator,type CalculatorState} from '@/lib/calculator';

const keys=['C','⌫','÷','×','7','8','9','−','4','5','6','+','1','2','3','=','0','.','Done'];
export function AmountCalculator({value,onChange,onDone}:{value:string;onChange:(text:string)=>void;onDone:()=>void}){
 const {colors,scope}=useAppTheme();
 const [state,setState]=useState<CalculatorState>(()=>initialCalculator(value));
 // The calculator is mounted only while open, so reopening starts with
 // the most recently accepted amount. No effect loop is necessary.
 const accent=scope==='household'?colors.household:colors.personal;
 function tap(label:string){
  if(label==='Done'){
   if(state.error)return;
   // Resolve pending arithmetic on Done as well as '='.
   const completed=state.operator&&state.startNew?{...state,accumulator:null,operator:null}:pressCalculator(state,'=');
   if(completed.error){setState(completed);return}
   onChange(String(Number(completed.display)));
   onDone();return;
  }
  const next=pressCalculator(state,label==='−'?'-':label);
  setState(next);
 }
 return <View style={{backgroundColor:colors.surface,borderRadius:12,padding:10,borderWidth:1,borderColor:colors.border,gap:8}}>
  <View style={{paddingHorizontal:6,paddingVertical:6,alignItems:'flex-end',minHeight:54}}>
   <Text accessibilityLabel="Calculator amount" numberOfLines={1} style={{color:colors.text,fontSize:28,fontWeight:'700'}}>₹{state.display}</Text>
   {state.error?<Text style={{color:'#C94F4F',fontSize:12}}>{state.error}</Text>:
    state.operator?<Text style={{fontSize:12,color:colors.muted}}>{(state.accumulator??0)/100} {state.operator}</Text>:null}
  </View>
  <View style={{flexDirection:'row',flexWrap:'wrap',gap:7}}>
   {keys.map(label=>{
    const isDone=label==='Done';const isOperation=['+','−','×','÷','='].includes(label);
    return <Pressable key={label} accessibilityRole="button" accessibilityLabel={isDone?'Use amount':label==='⌫'?'Backspace':label==='C'?'Clear calculator':label}
     onPress={()=>tap(label)} style={{
      width:isDone?'48%':'23%',flexGrow:isDone?1:0,
      minHeight:46,borderRadius:9,justifyContent:'center',alignItems:'center',
      backgroundColor:isDone?accent:isOperation?colors.secondary:colors.background
     }}>
     <Text style={{fontSize:isDone?15:20,fontWeight:isDone?'700':'500',color:isDone?'#fff':colors.text}}>{label}</Text>
    </Pressable>
   })}
  </View>
 </View>;
}
