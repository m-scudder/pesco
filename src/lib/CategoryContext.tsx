import React,{createContext,useCallback,useContext,useEffect,useMemo,useState} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {AppState} from 'react-native';
import {useData} from '@/data';
import {useAuth} from './AuthContext';
import {supabase} from './supabase';
import type {Scope} from '@/theme/palette';

export const PRESET_CATEGORIES=['Groceries','Food & Drinks','Transport','Bills','Shopping','Health','Entertainment','Other'] as const;
export type Category={id:string;name:string;createdBy?:string|null;createdAt?:string|null};
type CategoryStore={
 household:Category[];personal:Category[];loading:boolean;error:string|null;
 names:(scope:Scope)=>string[];refresh:()=>Promise<void>;
 create:(scope:Scope,name:string)=>Promise<void>;
 rename:(scope:Scope,id:string,name:string)=>Promise<void>;
 remove:(scope:Scope,id:string)=>Promise<void>;
};
const Context=createContext<CategoryStore|null>(null);
const KEY='pesco:personal-categories:v1';
const defaults:Category[]=PRESET_CATEGORIES.map((name,i)=>({id:'preset-'+i,name}));
const normalized=(name:string)=>name.trim().replace(/\s+/g,' ');
const validate=(name:string,items:Category[],except?:string)=>{
 const clean=normalized(name);
 if(!clean||clean.length>40)throw new Error('Enter a name up to 40 characters');
 if(items.some(c=>c.id!==except&&c.name.toLocaleLowerCase()===clean.toLocaleLowerCase()))throw new Error('Category already exists');
 return clean;
};
export function CategoryProvider({children}:{children:React.ReactNode}){
 const {household:activeHousehold}=useData();
 const {user}=useAuth();
 const householdId=activeHousehold?.id;
 const [personal,setPersonal]=useState<Category[]>(defaults);
 const [household,setHousehold]=useState<Category[]>([]);
 const [ready,setReady]=useState(false);
 const [loading,setLoading]=useState(false);
 const [error,setError]=useState<string|null>(null);

 useEffect(()=>{
  let active=true;
  AsyncStorage.getItem(KEY).then(raw=>{
   if(!active||!raw)return;
   const parsed:unknown=JSON.parse(raw);
   if(Array.isArray(parsed))setPersonal(parsed.filter((v):v is Category=>typeof v?.id==='string'&&typeof v?.name==='string'));
  }).catch(e=>console.warn('Could not load categories',e)).finally(()=>{if(active)setReady(true)});
  return()=>{active=false};
 },[]);
 useEffect(()=>{
  if(!ready)return;
  AsyncStorage.setItem(KEY,JSON.stringify(personal)).catch(e=>console.warn('Could not save categories',e));
 },[personal,ready]);

 const refresh=useCallback(async()=>{
  if(!householdId||!supabase||!user){setHousehold([]);setError(null);return}
  setLoading(true);
  try{
   const {data,error:readError}=await supabase.from('categories').select('id,name,created_by,created_at')
    .eq('household_id',householdId).order('name',{ascending:true});
   if(readError)throw readError;
   setHousehold((data??[]).map(item=>({id:item.id,name:item.name,createdBy:item.created_by,createdAt:item.created_at})));setError(null);
  }catch(e){setError(e instanceof Error?e.message:'Unable to load categories')}
  finally{setLoading(false)}
 },[householdId,user?.id]);

 useEffect(()=>{
  setHousehold([]);
  void refresh();
  if(!householdId||!supabase)return;
  const client=supabase;
  const channel=client.channel('pesco-categories-'+householdId)
   .on('postgres_changes',{event:'*',schema:'public',table:'categories',filter:'household_id=eq.'+householdId},()=>{void refresh()})
   .subscribe();
  const app=AppState.addEventListener('change',status=>{if(status==='active')void refresh()});
  return()=>{app.remove();void client.removeChannel(channel)};
 },[householdId,refresh]);

 const names=useCallback((scope:Scope)=>{
  const visible=scope==='household'?[...defaults,...household]:personal;
  return Array.from(new Map(visible.map(item=>[item.name.toLocaleLowerCase(),item.name])).values());
 },[household,personal]);
 const create=useCallback(async(scope:Scope,name:string)=>{
  const items=scope==='household'?household:personal;
  const clean=validate(name,items);
  if(scope==='personal'){
   setPersonal(previous=>[...previous,{id:'local-'+Date.now()+'-'+Math.random().toString(36).slice(2),name:clean,createdBy:'You',createdAt:new Date().toISOString()}]);
   return;
  }
  if(!supabase||!householdId||!user)throw new Error('Join a household first');
  const {error:writeError}=await supabase.from('categories').insert({household_id:householdId,name:clean,created_by:user.id});
  if(writeError)throw writeError;
  await refresh();
 },[personal,household,householdId,user?.id,refresh]);

 const rename=useCallback(async(scope:Scope,id:string,name:string)=>{
  const items=scope==='household'?household:personal;
  const clean=validate(name,items,id);
  if(!items.some(c=>c.id===id))throw new Error('Category not found');
  if(scope==='personal'){setPersonal(previous=>previous.map(c=>c.id===id?{...c,name:clean}:c));return}
  if(!supabase||!householdId)throw new Error('Join a household first');
  const {error:writeError}=await supabase.from('categories').update({name:clean}).eq('id',id).eq('household_id',householdId);
  if(writeError)throw writeError;
  await refresh();
 },[household,personal,householdId,refresh]);

 const remove=useCallback(async(scope:Scope,id:string)=>{
  if(scope==='personal'){setPersonal(previous=>previous.filter(c=>c.id!==id));return}
  if(!supabase||!householdId)throw new Error('Join a household first');
  const {error:writeError}=await supabase.from('categories').delete().eq('id',id).eq('household_id',householdId);
  if(writeError)throw writeError;
  await refresh();
 },[householdId,refresh]);

 const value=useMemo<CategoryStore>(()=>({personal,household,loading,error,names,refresh,create,rename,remove}),[personal,household,loading,error,names,refresh,create,rename,remove]);
 return <Context.Provider value={value}>{children}</Context.Provider>;
}
export function useCategories(){const c=useContext(Context);if(!c)throw new Error('CategoryProvider missing');return c}
