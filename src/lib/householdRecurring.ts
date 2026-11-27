import {supabase} from './supabase';
export type HouseholdRecurringRule={id:string;household_id:string;created_by:string;amount_paise:number;category:string;note:string;day_of_month:number;starts_on:string;active:boolean};
export type HouseholdRecurringDraft=Pick<HouseholdRecurringRule,'amount_paise'|'category'|'note'|'day_of_month'|'starts_on'>;
function db(){if(!supabase)throw new Error('Supabase is not configured');return supabase}
// Row-level security silently ignores changes to another member's rule, so an
// empty result means nothing was saved and must be reported, not treated as success.
const NOT_YOURS='Only the person who added this recurring bill can change it.';
function requireChanged(rows:unknown[]|null){if(!rows||rows.length===0)throw new Error(NOT_YOURS)}
function today(){const d=new Date();return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0')}
export async function listHouseholdRecurring(householdId:string):Promise<HouseholdRecurringRule[]>{
 const {data,error}=await db().from('household_recurring_rules').select('*').eq('household_id',householdId).order('created_at');
 if(error)throw error;return (data??[]) as HouseholdRecurringRule[];
}
export async function saveHouseholdRecurring(householdId:string,draft:HouseholdRecurringDraft,id?:string){
 if(!Number.isSafeInteger(draft.amount_paise)||draft.amount_paise<=0||!Number.isInteger(draft.day_of_month)||draft.day_of_month<1||draft.day_of_month>31)throw new Error('Invalid recurring bill');
 const {data:{user},error:authError}=await db().auth.getUser();
 if(authError||!user)throw new Error('Sign in required');
 const payload={amount_paise:draft.amount_paise,category:draft.category,note:draft.note,day_of_month:draft.day_of_month,starts_on:draft.starts_on};
 if(id){
  const {data,error}=await db().from('household_recurring_rules').update(payload).eq('id',id).eq('household_id',householdId).select('id');
  if(error)throw error;
  requireChanged(data);
  return;
 }
 const {error}=await db().from('household_recurring_rules').insert({...payload,household_id:householdId,created_by:user.id});
 if(error)throw error;
}
export async function toggleHouseholdRecurring(householdId:string,id:string,active:boolean){
 const {data,error}=await db().from('household_recurring_rules').update({active}).eq('household_id',householdId).eq('id',id).select('id');
 if(error)throw error;
 requireChanged(data);
}
export async function deleteHouseholdRecurring(householdId:string,id:string){
 const {data,error}=await db().from('household_recurring_rules').delete().eq('household_id',householdId).eq('id',id).select('id');
 if(error)throw error;
 requireChanged(data);
}
export async function generateHouseholdRecurring(householdId:string){
 const {error}=await db().rpc('generate_household_recurring',{target_household:householdId,client_today:today()});
 if(error)throw error;
}
