import {supabase} from './supabase';
import type {Expense} from '@/data';
import type {Scope} from '@/theme/palette';

export type CloudExpenseInput={
  amountPaise:number;category:string;note:string;date:string;scope:Scope;
  householdId:string|null;
};
type ExpenseRow={
  id:string;owner_id:string;household_id:string|null;scope:Scope;
  amount_paise:number;category:string;note:string;spent_on:string;
  created_at:string;updated_at:string;
};
function client(){
 if(!supabase)throw new Error('Supabase has not been configured');
 return supabase;
}
function toExpense(row:ExpenseRow):Expense{
 return {id:row.id,ownerId:row.owner_id,scope:row.scope,
  amountPaise:Number(row.amount_paise),category:row.category,note:row.note,date:row.spent_on,
  createdAt:row.created_at,updatedAt:row.updated_at};
}
function assertInput(data:CloudExpenseInput){
 if(!Number.isSafeInteger(data.amountPaise)||data.amountPaise<=0)throw new Error('Invalid amount');
 if(data.scope==='personal'&&data.householdId!==null)throw new Error('Personal expense must not have a household');
 if(data.scope==='household'&&!data.householdId)throw new Error('Household ID required');
 if(!/^\d{4}-\d{2}-\d{2}$/.test(data.date))throw new Error('Invalid expense date');
}
export async function fetchCloudExpenses(scope:Scope,householdId:string|null,limit=50,before?:{spentOn:string;createdAt:string}){
 const db=client();
 if(scope==='household'&&!householdId)throw new Error('Join or create a household first');
 const session=await db.auth.getUser();
 if(session.error||!session.data.user)throw new Error('Sign in required');
 let query=db.from('expenses').select('id,owner_id,household_id,scope,amount_paise,category,note,spent_on,created_at,updated_at')
  .eq('scope',scope).order('spent_on',{ascending:false}).order('created_at',{ascending:false}).limit(Math.min(Math.max(limit,1),100));
 if(scope==='personal')query=query.eq('owner_id',session.data.user.id);
 else query=query.eq('household_id',householdId!);
 // Cursor pagination will be enabled with deterministic composite ordering in a later milestone.
 if(before)throw new Error('Cursor paging not implemented yet');
 const {data,error}=await query;
 if(error)throw error;
 return (data as ExpenseRow[]).map(toExpense);
}
export async function addCloudExpense(input:CloudExpenseInput){
 assertInput(input);
 const db=client();const {data:{user},error:authError}=await db.auth.getUser();
 if(authError||!user)throw new Error('Sign in required');
 const {data,error}=await db.from('expenses').insert({
  owner_id:user.id,household_id:input.householdId,scope:input.scope,
  amount_paise:input.amountPaise,category:input.category,note:input.note,spent_on:input.date
 }).select('id,owner_id,household_id,scope,amount_paise,category,note,spent_on,created_at,updated_at').single();
 if(error)throw error;
 return toExpense(data as ExpenseRow);
}
export async function editCloudExpense(id:string,input:CloudExpenseInput){
 assertInput(input);
 const db=client();const {data,error}=await db.from('expenses')
  .update({amount_paise:input.amountPaise,category:input.category,note:input.note,spent_on:input.date})
  .eq('id',id).eq('scope',input.scope)
  .select('id,owner_id,household_id,scope,amount_paise,category,note,spent_on,created_at,updated_at').single();
 if(error)throw error;
 return toExpense(data as ExpenseRow);
}
export async function deleteCloudExpense(id:string){
 const db=client();const {data,error}=await db.from('expenses').delete().eq('id',id).select('id').single();
 if(error)throw error;
 if(!data)throw new Error('Expense not found');
}
