import type {Expense} from '@/data';
import type {Scope} from '@/theme/palette';

/** Deterministic, read-only sample records. Never persisted or uploaded. */
export function makeDemoExpenses(today=new Date()):Expense[]{
 const samples=[
  ['household','Rent','Monthly rent',1850000,3],['household','Groceries','Weekly essentials',420000,5],
  ['household','Utilities','Electricity bill',225000,8],['household','Food & Drinks','Dinner at home',165000,11],
  ['household','Transport','Fuel and parking',198000,14],['household','Groceries','Fresh vegetables',118000,18],
  ['household','Shopping','Kitchen supplies',320000,21],['household','Entertainment','Movie night',85000,25],
  ['personal','Food & Drinks','Morning coffee',26000,6],['personal','Shopping','Books',99000,12],
  ['personal','Transport','Cab ride',43000,20],['personal','Health','Pharmacy',76000,26],
 ] as const;
 const result:Expense[]=[];
 const start=new Date(today.getFullYear(),today.getMonth(),1,12);
 for(let monthsAgo=0;monthsAgo<4;monthsAgo++){
  const month=new Date(start.getFullYear(),start.getMonth()-monthsAgo,1,12);
  const lastDay=new Date(month.getFullYear(),month.getMonth()+1,0).getDate();
  samples.forEach(([scope,category,note,amount,day],index)=>{
   if(monthsAgo===0&&day>today.getDate())return;
   const date=month.getFullYear()+'-'+String(month.getMonth()+1).padStart(2,'0')+'-'+String(Math.min(day,lastDay)).padStart(2,'0');
   const iso=date+'T12:00:00.000Z';
   result.push({id:'demo:'+monthsAgo+':'+index,scope:scope as Scope,category,note,amountPaise:Math.round(amount*(1+monthsAgo*0.04)),
    date,createdAt:iso,updatedAt:iso,ownerId:'demo'});
  });
 }
 return result;
}
