import type {User} from '@supabase/supabase-js';
import {supabase} from './supabase';

export function googleDisplayName(user:User|null|undefined){
 if(!user)return 'PESCO member';
 const google=user.identities?.find(identity=>identity.provider==='google')?.identity_data;
 const candidates=[google?.full_name,google?.name,user.user_metadata?.full_name,user.user_metadata?.name,user.email?.split('@')[0]];
 return candidates.find(value=>typeof value==='string'&&value.trim())?.trim()??'PESCO member';
}

// Preserve an existing user-chosen display name; seed new profiles using Google.
export async function ensureGoogleProfile(user:User){
 if(!supabase)return;
 const {data,error}=await supabase.from('profiles').select('display_name').eq('id',user.id).maybeSingle();
 if(error)throw error;
 if(data?.display_name?.trim()&&data.display_name!=='Member')return;
 const {error:saveError}=await supabase.from('profiles').upsert({id:user.id,display_name:googleDisplayName(user)},{onConflict:'id'});
 if(saveError)throw saveError;
}
