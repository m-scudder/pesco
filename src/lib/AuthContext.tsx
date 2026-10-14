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
   if(data.session){setSession(data.session);return}
   const result=await supabase.auth.signInAnonymously();
   if(result.error)throw result.error;
   setSession(result.data.session);
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
