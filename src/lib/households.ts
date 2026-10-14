import {supabase} from './supabase';

function db(){if(!supabase)throw new Error('Supabase is not configured');return supabase}
async function requireUser(){
 const {data,error}=await db().auth.getUser();
 if(error||!data.user)throw new Error('Could not establish your anonymous account');
 return data.user.id;
}
export type Household={id:string;name:string;created_by:string};
export async function getMyHousehold():Promise<Household|null>{
 const userId=await requireUser();
 const {data:member,error}=await db().from('household_members').select('household_id').eq('user_id',userId).maybeSingle();
 if(error)throw error;
 if(!member)return null;
 const {data,error:householdError}=await db().from('households').select('id,name,created_by').eq('id',member.household_id).single();
 if(householdError)throw householdError;
 return data as Household;
}
export async function createHousehold(name:string):Promise<string>{
 await requireUser();
 const {data,error}=await db().rpc('create_household',{household_name:name.trim()});
 if(error)throw error;
 return data as string;
}
export async function createJoiningKey(householdId:string):Promise<string>{
 await requireUser();
 const {data,error}=await db().rpc('issue_household_invite',{target_household:householdId});
 if(error)throw error;
 return data as string;
}
export async function joinWithKey(key:string):Promise<string>{
 await requireUser();
 const {data,error}=await db().rpc('join_household_with_key',{joining_key:key.trim()});
 if(error)throw error;
 return data as string;
}
