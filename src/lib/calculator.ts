// A small calculator for INR amounts. Values are kept in paise to prevent
// floating-point drift for addition and subtraction.
export type Operator='+'|'-'|'×'|'÷';
export type CalculatorState={
 display:string;
 accumulator:number|null;
 operator:Operator|null;
 startNew:boolean;
 error:string|null;
};
export const initialCalculator=(amount=''):CalculatorState=>({
 display:amount&&/^\d+(\.\d{0,2})?$/.test(amount)?amount:'0',
 accumulator:null,operator:null,startNew:true,error:null
});
const toPaise=(text:string)=>Math.round(Number(text)*100);
const output=(paise:number)=>Number((paise/100).toFixed(2)).toString();
const valid=(paise:number)=>Number.isSafeInteger(paise)&&paise>=0&&paise<=999999999999;
export function calculate(a:number,b:number,op:Operator):number|null{
 let result:number;
 switch(op){
  case '+': result=a+b;break;
  case '-': result=a-b;break;
  case '×': result=Math.round(a*b/100);break;
  case '÷': if(b===0)return null;result=Math.round(a*100/b);break;
 }
 return valid(result)?result:null;
}
export function pressCalculator(s:CalculatorState,key:string):CalculatorState{
 if(key==='C')return initialCalculator();
 if(key==='%'){
  if(s.error||s.startNew)return s;
  // For addition/subtraction, percentage is relative to the left operand.
  // For multiplication/division or a standalone amount, it is value / 100.
  const amount=toPaise(s.display);
  const percent=(s.operator==='+'||s.operator==='-')&&s.accumulator!==null
   ?Math.round(s.accumulator*amount/10000)
   :Math.round(amount/100);
  if(!valid(percent))return {...s,error:'Invalid percentage'};
  return {...s,display:output(percent),startNew:false,error:null};
 }
 if(key==='⌫'){
  if(s.error)return initialCalculator();
  if(s.startNew)return {...s,display:'0'};
  return {...s,display:s.display.length<=1?'0':s.display.slice(0,-1)};
 }
 if(/^[0-9]$/.test(key)||key==='.'){
  const fresh=s.startNew||Boolean(s.error);
  const base=fresh?'0':s.display;
  if(key==='.'&&base.includes('.'))return s;
  if(key==='.')return {...s,display:base+'.',startNew:false,error:null};
  const decimal=base.split('.')[1];
  if(decimal!==undefined&&decimal.length>=2)return s;
  const next=base==='0'?key:base+key;
  if(toPaise(next)>999999999999)return s;
  return {...s,display:next,startNew:false,error:null};
 }
 if(key==='+'||key==='-'||key==='×'||key==='÷'){
  if(s.error)return s;
  const operand=toPaise(s.display);
  if(s.operator&&s.accumulator!==null&&!s.startNew){
   const result=calculate(s.accumulator,operand,s.operator);
   if(result===null)return {...s,error:'Invalid calculation'};
   return {display:output(result),accumulator:result,operator:key,startNew:true,error:null};
  }
  return {...s,accumulator:s.accumulator!==null&&s.startNew?s.accumulator:operand,operator:key,startNew:true,error:null};
 }
 if(key==='='){
  if(s.error||s.operator===null||s.accumulator===null)return s;
  const result=calculate(s.accumulator,toPaise(s.display),s.operator);
  if(result===null)return {...s,error:'Invalid calculation'};
  return {display:output(result),accumulator:null,operator:null,startNew:true,error:null};
 }
 return s;
}
