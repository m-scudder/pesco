import 'react-native-url-polyfill/auto';
import {AppState} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {createClient, type SupabaseClient} from '@supabase/supabase-js';

const url=process.env.EXPO_PUBLIC_SUPABASE_URL?.trim();
const key=process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY?.trim();

export const isSupabaseConfigured=Boolean(url&&key);
export const supabase:SupabaseClient|null=isSupabaseConfigured
 ? createClient(url!,key!,{
     auth:{
       storage:AsyncStorage,
       autoRefreshToken:true,
       persistSession:true,
       detectSessionInUrl:false
     }
   })
 : null;

// Register the single client lifecycle listener only when cloud mode is enabled.
if(supabase){
 AppState.addEventListener('change',state=>{
   if(state==='active') supabase?.auth.startAutoRefresh();
   else supabase?.auth.stopAutoRefresh();
 });
}
