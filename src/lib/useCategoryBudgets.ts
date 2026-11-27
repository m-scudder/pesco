import {useCallback,useEffect,useState} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {AppState} from 'react-native';
import {useData} from '@/data';
import {supabase} from './supabase';
import type {Scope} from '@/theme/palette';

export type CategoryBudget={category:string;amountPaise:number};
// Earlier versions kept personal limits in one device-wide key that every
// account on the phone shared. Limits now live under the signed-in account.
const LEGACY_PERSONAL_KEY='pesco:personal-category-budgets:v1';
const personalKey=(userId:string)=>'pesco:personal-category-budgets:'+userId+':v2';
async function readPersonal(userId:string):Promise<CategoryBudget[]>{
 let raw=await AsyncStorage.getItem(personalKey(userId));
 if(raw===null){
  const legacy=await AsyncStorage.getItem(LEGACY_PERSONAL_KEY);
  if(legacy!==null){
   // Adopt the old device-wide limits once, for the first account that opens them.
   await AsyncStorage.setItem(personalKey(userId),legacy);
   await AsyncStorage.removeItem(LEGACY_PERSONAL_KEY);
   raw=legacy;
  }
 }
 const data=raw?JSON.parse(raw):[];
 return Array.isArray(data)?data:[];
}
let nextBudgetChannelId=0;

export function useCategoryBudgets(scope:Scope){
 const {household,currentUserId}=useData();
 const householdId=household?.id;
 const [items,setItems]=useState<CategoryBudget[]>([]);
 const [loading,setLoading]=useState(false);
 const [error,setError]=useState<string|null>(null);
 const refresh=useCallback(async()=>{
  setLoading(true);
  try{
   if(scope==='personal'){
    setItems(currentUserId?await readPersonal(currentUserId):[]);
   }else if(householdId&&supabase){
    const {data,error}=await supabase.from('category_budgets').select('category_name,amount_paise').eq('household_id',householdId);
    if(error)throw error;
    setItems((data??[]).map(row=>({category:row.category_name,amountPaise:Number(row.amount_paise)})));
   }else setItems([]);
   setError(null);
  }catch(e){setError(e instanceof Error?e.message:'Could not load budgets')}
  finally{setLoading(false)}
 },[scope,householdId,currentUserId]);
 useEffect(()=>{
  void refresh();
  const app=AppState.addEventListener('change',state=>{if(state==='active')void refresh()});
  if(scope!=='household'||!householdId||!supabase)return()=>app.remove();
  const db=supabase;
  const channel=db.channel('category-budgets-'+householdId+'-'+(++nextBudgetChannelId)).on('postgres_changes',
   {event:'*',schema:'public',table:'category_budgets',filter:'household_id=eq.'+householdId},
   ()=>{void refresh()}).subscribe();
  return()=>{app.remove();void db.removeChannel(channel)};
 },[refresh,scope,householdId]);
 const save=useCallback(async(category:string,amountPaise:number|null)=>{
  if(scope==='personal'){
   if(!currentUserId)throw new Error('Sign in required');
   const previous=await readPersonal(currentUserId);
   const next=previous.filter(x=>x.category!==category);
   if(amountPaise!==null)next.push({category,amountPaise});
   await AsyncStorage.setItem(personalKey(currentUserId),JSON.stringify(next));
  }else{
   if(!householdId||!supabase)throw new Error('A household is required');
   if(amountPaise===null){
    const {error}=await supabase.from('category_budgets').delete().eq('household_id',householdId).eq('category_name',category);
    if(error)throw error;
   }else{
    const {error}=await supabase.from('category_budgets').upsert(
     {household_id:householdId,category_name:category,amount_paise:amountPaise,updated_at:new Date().toISOString()},
     {onConflict:'household_id,category_name'});
    if(error)throw error;
   }
  }
  await refresh();
 },[scope,householdId,currentUserId,refresh]);
 return {items,loading,error,refresh,save};
}
