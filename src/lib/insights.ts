import type {Expense} from '@/data';
import type {Scope} from '@/theme/palette';

export type CategorySpend={name:string;amount:number;count:number;percent:number};
export type MonthSpend={key:string;label:string;amount:number;selected:boolean};

export function shiftMonth(month:string,delta:number):string{
 const [year,index]=month.split('-').map(Number);
 const d=new Date(year,index-1+delta,1);
 return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0');
}
export function buildInsights(expenses:Expense[],scope:Scope,month:string,userId:string|null){
 const inScope=expenses.filter(e=>e.scope===scope);
 const selected=inScope.filter(e=>e.date.slice(0,7)===month);
 const previous=inScope.filter(e=>e.date.slice(0,7)===shiftMonth(month,-1));
 const spent=selected.reduce((sum,e)=>sum+e.amountPaise,0);
 const prior=previous.reduce((sum,e)=>sum+e.amountPaise,0);
 const difference=spent-prior;
 const percentChange=prior>0?Math.round(Math.abs(difference)/prior*100):null;
 const own=selected.filter(e=>e.ownerId===userId||e.ownerId==='local-user').reduce((s,e)=>s+e.amountPaise,0);
 const monthSeries:MonthSpend[]=Array.from({length:6},(_,i)=>{
  const key=shiftMonth(month,i-5);
  const date=new Date(Number(key.slice(0,4)),Number(key.slice(5,7))-1,1);
  return {
   key,label:date.toLocaleDateString('en-IN',{month:'short'}),
   amount:inScope.filter(e=>e.date.slice(0,7)===key).reduce((sum,e)=>sum+e.amountPaise,0),
   selected:key===month
  };
 });
 const byCategory=new Map<string,{amount:number;count:number}>();
 for(const e of selected){
  const current=byCategory.get(e.category)??{amount:0,count:0};
  current.amount+=e.amountPaise;current.count++;
  byCategory.set(e.category,current);
 }
 const categories:CategorySpend[]=Array.from(byCategory,([name,v])=>({
  name,amount:v.amount,count:v.count,percent:spent>0?Math.round(v.amount/spent*1000)/10:0
 })).sort((a,b)=>b.amount-a.amount||a.name.localeCompare(b.name));
 return {selected,spent,prior,difference,percentChange,own,partner:spent-own,monthSeries,categories};
}

export type CategoryChange={name:string;current:number;previous:number;difference:number};
export function monthlyCategoryChanges(expenses:Expense[],scope:Scope,month:string):CategoryChange[]{
 const previousMonth=shiftMonth(month,-1);
 const totals=new Map<string,{current:number;previous:number}>();
 for(const expense of expenses){
  if(expense.scope!==scope)continue;
  const dateMonth=expense.date.slice(0,7);
  if(dateMonth!==month&&dateMonth!==previousMonth)continue;
  const row=totals.get(expense.category)??{current:0,previous:0};
  if(dateMonth===month)row.current+=expense.amountPaise;
  else row.previous+=expense.amountPaise;
  totals.set(expense.category,row);
 }
 return Array.from(totals,([name,row])=>({...row,name,difference:row.current-row.previous}))
  .sort((a,b)=>Math.abs(b.difference)-Math.abs(a.difference)||a.name.localeCompare(b.name));
}
