import type {Expense} from '@/data';
import type {Scope} from '@/theme/palette';

export function filterHistory(expenses:Expense[],scope:Scope,from:string,to:string,search:string){
 const query=search.trim().toLocaleLowerCase();
 return expenses.filter(item=>item.scope===scope&&item.date>=from&&item.date<=to&&
  (!query||[item.category,item.note,String(item.amountPaise/100)].join(' ').toLocaleLowerCase().includes(query)))
  .sort((a,b)=>b.date.localeCompare(a.date)||b.createdAt.localeCompare(a.createdAt)||b.id.localeCompare(a.id));
}
function cell(value:string){
 return '"'+value.replace(/"/g,'""')+'"';
}
export function expensesCsv(expenses:Expense[]){
 const header=['Date','Category','Description','Amount (INR)','Type'];
 const rows=expenses.map(item=>[
  item.date,item.category,item.note,(item.amountPaise/100).toFixed(2),
  item.scope==='household'?'Household':'Personal'
 ]);
 // CRLF is widely understood by spreadsheet applications; quote every field.
 return '\uFEFF'+[header,...rows].map(row=>row.map(cell).join(',')).join('\r\n')+'\r\n';
}
