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
  .eq('scope',scope).order('spent_on',{ascending:false}).order('created_at',{ascending:false}).order('id',{ascending:false}).limit(Math.min(Math.max(limit,1),100));
 if(scope==='personal')query=query.eq('owner_id',session.data.user.id);
 else query=query.eq('household_id',householdId!);
 // Cursor pagination will be enabled with deterministic composite ordering in a later milestone.
 if(before)throw new Error('Cursor paging not implemented yet');
 const {data,error}=await query;
 if(error)throw error;
 return (data as ExpenseRow[]).map(toExpense);
}
/** Read complete household history in deterministic pages, rather than silently truncating after 100 records. */
export async function fetchAllHouseholdExpenses(householdId:string){
 const db=client();
 const user=await db.auth.getUser();
 if(user.error||!user.data.user)throw new Error('Sign in required');
 const all:Expense[]=[];
 const size=200;
 for(let offset=0;;offset+=size){
  const {data,error}=await db.from('expenses')
   .select('id,owner_id,household_id,scope,amount_paise,category,note,spent_on,created_at,updated_at')
   .eq('scope','household').eq('household_id',householdId)
   .order('spent_on',{ascending:false}).order('created_at',{ascending:false}).order('id',{ascending:false})
   .range(offset,offset+size-1);
  if(error)throw error;
  const rows=(data??[]) as ExpenseRow[];
  all.push(...rows.map(toExpense));
  if(rows.length<size)break;
 }
 return all;
}

export async function addCloudExpense(input:CloudExpenseInput,requestId?:string){
 assertInput(input);
 const db=client();const {data:{user},error:authError}=await db.auth.getUser();
 if(authError||!user)throw new Error('Sign in required');
 const {data,error}=await db.from('expenses').insert({
  ...(requestId?{id:requestId}:{}),owner_id:user.id,household_id:input.householdId,scope:input.scope,
  amount_paise:input.amountPaise,category:input.category,note:input.note,spent_on:input.date
 }).select('id,owner_id,household_id,scope,amount_paise,category,note,spent_on,created_at,updated_at').single();
 if(error&&requestId&&error.code==='23505'){
  const existing=await db.from('expenses').select('id,owner_id,household_id,scope,amount_paise,category,note,spent_on,created_at,updated_at').eq('id',requestId).eq('owner_id',user.id).maybeSingle();
  if(existing.error)throw existing.error;
  if(existing.data&&existing.data.household_id===input.householdId)return toExpense(existing.data as ExpenseRow);
 }
 if(error)throw error;
 return toExpense(data as ExpenseRow);
}
export async function editCloudExpense(id:string,input:CloudExpenseInput,expectedUpdatedAt?:string){
 assertInput(input);
 const db=client();const {data:{user},error:authError}=await db.auth.getUser();
 if(authError||!user)throw new Error('Sign in required');
 let query=db.from('expenses')
  .update({amount_paise:input.amountPaise,category:input.category,note:input.note,spent_on:input.date,updated_at:new Date().toISOString()})
  .eq('id',id).eq('scope',input.scope).eq('owner_id',user.id);
 if(expectedUpdatedAt)query=query.eq('updated_at',expectedUpdatedAt);
 const {data,error}=await query.select('id,owner_id,household_id,scope,amount_paise,category,note,spent_on,created_at,updated_at').maybeSingle();
 if(error)throw error;
 if(!data)throw new Error('Conflict: this expense has changed or been removed on another device. Review and discard the pending change before trying again.');
 return toExpense(data as ExpenseRow);
}
export async function deleteCloudExpense(id:string,expectedUpdatedAt?:string){
 const db=client();const {data:{user},error:authError}=await db.auth.getUser();
 if(authError||!user)throw new Error('Sign in required');
 let query=db.from('expenses').delete().eq('id',id).eq('owner_id',user.id);
 if(expectedUpdatedAt)query=query.eq('updated_at',expectedUpdatedAt);
 const {data,error}=await query.select('id').maybeSingle();
 if(error)throw error;
 if(!data){
  const existing=await db.from('expenses').select('id').eq('id',id).maybeSingle();
  if(existing.error)throw existing.error;
  if(existing.data)throw new Error('Conflict: this expense changed on another device. Review and discard the pending deletion before trying again.');
 }
}
