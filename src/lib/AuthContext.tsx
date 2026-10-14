import React,{createContext,useContext,useEffect,useMemo,useState} from 'react';
import type {Session,User} from '@supabase/supabase-js';
import {isSupabaseConfigured,supabase} from './supabase';

type AuthState={ready:boolean;configured:boolean;session:Session|null;user:User|null;signOut:()=>Promise<void>};
const AuthContext=createContext<AuthState|null>(null);

export function AuthProvider({children}:{children:React.ReactNode}){
 const [ready,setReady]=useState(!isSupabaseConfigured);
 const [session,setSession]=useState<Session|null>(null);
 useEffect(()=>{
  if(!supabase)return;
  let active=true;
  supabase.auth.getSession().then(({data,error})=>{
   if(error)console.warn('Supabase session restore failed',error);
   if(active){setSession(data.session);setReady(true)}
  }).catch(error=>{console.warn('Supabase session restore failed',error);if(active)setReady(true)});
  const {data:{subscription}}=supabase.auth.onAuthStateChange((_event,next)=>{if(active){setSession(next);setReady(true)}});
  return()=>{active=false;subscription.unsubscribe()};
 },[]);
 const value=useMemo<AuthState>(()=>({ready,configured:isSupabaseConfigured,session,user:session?.user??null,
  signOut:async()=>{if(!supabase)return;const {error}=await supabase.auth.signOut();if(error)throw error}
 }),[ready,session]);
 return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
export function useAuth(){const state=useContext(AuthContext);if(!state)throw new Error('AuthProvider missing');return state}
