import React,{createContext,useContext,useEffect,useMemo,useState} from 'react';
import type {Session,User} from '@supabase/supabase-js';
import {isSupabaseConfigured,supabase} from './supabase';

type AuthState={ready:boolean;configured:boolean;session:Session|null;user:User|null;error:string|null;retry:()=>Promise<void>};
const AuthContext=createContext<AuthState|null>(null);

export function AuthProvider({children}:{children:React.ReactNode}){
 const [ready,setReady]=useState(!isSupabaseConfigured);
 const [session,setSession]=useState<Session|null>(null);
 const [error,setError]=useState<string|null>(null);
 async function ensureSession(){
  if(!supabase)return;
  setError(null);
  try{
   const {data,error:readError}=await supabase.auth.getSession();
   if(readError)throw readError;
   if(data.session){
    const {data:validated,error:validationError}=await supabase.auth.getUser();
    if(!validationError&&validated.user){setSession(data.session);return}
    // Allow previously stored sessions to open user-scoped cached data when the
    // validation endpoint is unreachable. Explicit auth rejections never fall back.
    const transient=!!validationError&&(
     validationError.status===0||
     /network|fetch|offline|connection|timeout/i.test(validationError.message)
    );
    if(transient){
     setSession(data.session);
     setError('Offline: household changes will sync when connected.');
     return;
    }
    // Do not silently erase a possibly recoverable local session.
    throw validationError??new Error('Unable to validate the saved session');
   }
   // Google sign-in is mandatory; never create a fresh anonymous identity here.
   setSession(null);
  }catch(err){setError(err instanceof Error?err.message:String(err))}
  finally{setReady(true)}
 }
 useEffect(()=>{
  if(!supabase)return;
  let active=true;
  const {data:{subscription}}=supabase.auth.onAuthStateChange((_event,next)=>{if(active)setSession(next)});
  ensureSession();
  return()=>{active=false;subscription.unsubscribe()};
 },[]);
 const value=useMemo<AuthState>(()=>({ready,configured:isSupabaseConfigured,session,user:session?.user??null,error,retry:ensureSession}),[ready,session,error]);
 return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
export function useAuth(){const state=useContext(AuthContext);if(!state)throw new Error('AuthProvider missing');return state}
