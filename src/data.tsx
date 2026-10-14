import React,{createContext,useCallback,useContext,useEffect,useMemo,useRef,useState} from 'react';
import {AppState} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type {Scope} from './theme/palette';
import {useAuth} from './lib/AuthContext';
import {getMyHousehold,type Household} from './lib/households';
import {addCloudExpense,deleteCloudExpense,editCloudExpense,fetchCloudExpenses} from './lib/cloudExpenses';
import {supabase} from './lib/supabase';

export const CATEGORIES=['Groceries','Food & Drinks','Shopping','Utilities','Rent','Transport','Health','Entertainment','Education','Travel','Other'] as const;
export type Expense={id:string;scope:Scope;amountPaise:number;category:string;note:string;date:string;createdAt:string;updatedAt:string;ownerId:string};
export type ExpenseDraft=Pick<Expense,'scope'|'amountPaise'|'category'|'note'|'date'>;
type Budgets={household:number|null;personal:number|null};
type Store={
 loaded:boolean;expenses:Expense[];budgets:Budgets;household:Household|null;syncing:boolean;syncError:string|null;
 localHouseholdCount:number;currentUserId:string|null;
 refresh:()=>Promise<void>;add:(draft:ExpenseDraft)=>Promise<void>;update:(id:string,draft:ExpenseDraft)=>Promise<void>;
 remove:(id:string)=>Promise<void>;importLocalHousehold:()=>Promise<number>;
 setBudget:(scope:Scope,value:number|null)=>void;clearAll:()=>void;
};
const Context=createContext<Store|null>(null);
const STORAGE_KEY='pesco-local-v1';
const defaultBudgets:Budgets={household:null,personal:null};

export function DataProvider({children}:{children:React.ReactNode}){
 const {user,configured}=useAuth();
 const [localLoaded,setLocalLoaded]=useState(false);
 const [localExpenses,setLocalExpenses]=useState<Expense[]>([]);
 const [budgets,setBudgets]=useState<Budgets>(defaultBudgets);
 const [household,setHousehold]=useState<Household|null>(null);
 const [cloudExpenses,setCloudExpenses]=useState<Expense[]>([]);
 const [syncError,setSyncError]=useState<string|null>(null);
 const [syncing,setSyncing]=useState(false);
 const [cloudReady,setCloudReady]=useState(false);
 const requested=useRef(0);

 useEffect(()=>{
  let active=true;
  (async()=>{
   try{
    const raw=await AsyncStorage.getItem(STORAGE_KEY);
    if(!active||!raw)return;
    const data=JSON.parse(raw);
    if(Array.isArray(data.expenses))setLocalExpenses(data.expenses);
    if(data.budgets)setBudgets({...defaultBudgets,...data.budgets});
   }catch(e){console.warn('Could not restore local expenses',e)}
   finally{if(active)setLocalLoaded(true)}
  })();
  return()=>{active=false};
 },[]);
 useEffect(()=>{
  if(!localLoaded)return;
  AsyncStorage.setItem(STORAGE_KEY,JSON.stringify({expenses:localExpenses,budgets}))
   .catch(e=>console.warn('Could not save local expenses',e));
 },[localExpenses,budgets,localLoaded]);

 const refresh=useCallback(async()=>{
  if(!user||!configured)return;
  const request=++requested.current;
  setSyncing(true);
  try{
   const membership=await getMyHousehold();
   const rows=membership?await fetchCloudExpenses('household',membership.id,100):[];
   if(request===requested.current){
    setHousehold(membership);setCloudExpenses(rows);setSyncError(null);setCloudReady(true);
   }
  }catch(e){
   if(request===requested.current){
    setSyncError(e instanceof Error?e.message:'Could not sync expenses');setCloudReady(true);
   }
  }finally{if(request===requested.current)setSyncing(false)}
 },[user?.id,configured]);

 useEffect(()=>{
  requested.current++;
  setHousehold(null);setCloudExpenses([]);setCloudReady(false);setSyncError(null);
  if(!user)return;
  void refresh();
  const interval=setInterval(()=>{void refresh()},15000);
  const app=AppState.addEventListener('change',s=>{if(s==='active')void refresh()});
  const channel=supabase?.channel('pesco-expense-refresh-'+user.id)
   .on('postgres_changes',{event:'*',schema:'public',table:'expenses'},()=>{void refresh()})
   .subscribe();
  return()=>{
   clearInterval(interval);app.remove();
   if(channel&&supabase)void supabase.removeChannel(channel);
   requested.current++;
  };
 },[user?.id,refresh]);

 const expenses=useMemo(()=>[
  ...localExpenses.filter(e=>e.scope==='personal'||(!household&&e.scope==='household')),
  ...(household?cloudExpenses:[])
 ],[localExpenses,cloudExpenses,household]);

 const add=useCallback(async(draft:ExpenseDraft)=>{
  if(draft.scope==='household'){
   if(!household)throw new Error('Create or join a household first');
   await addCloudExpense({...draft,householdId:household.id});
   await refresh();
   return;
  }
  const now=new Date().toISOString();
  setLocalExpenses(prev=>[{...draft,id:now+'-'+Math.random().toString(36).slice(2),ownerId:'local-user',createdAt:now,updatedAt:now},...prev]);
 },[household,refresh,user?.id]);

 const update=useCallback(async(id:string,draft:ExpenseDraft)=>{
  const cloud=cloudExpenses.find(e=>e.id===id);
  if(cloud){
   if(!household)throw new Error('Household no longer available');
   if(cloud.ownerId!==user?.id)throw new Error('Only the creator can edit this expense');
   if(draft.scope!==cloud.scope)throw new Error('Changing the expense scope is unavailable');
   await editCloudExpense(id,{...draft,householdId:household.id});
   await refresh();
   return;
  }
  setLocalExpenses(prev=>prev.map(e=>e.id===id?{...e,...draft,updatedAt:new Date().toISOString()}:e));
 },[cloudExpenses,household,user?.id,refresh]);

 const remove=useCallback(async(id:string)=>{
  const cloud=cloudExpenses.find(e=>e.id===id);
  if(cloud){
   if(cloud.ownerId!==user?.id)throw new Error('Only the creator can delete this expense');
   await deleteCloudExpense(id);await refresh();
  }else setLocalExpenses(prev=>prev.filter(e=>e.id!==id));
 },[cloudExpenses,user?.id,refresh]);

 const importLocalHousehold=useCallback(async()=>{
  if(!household)throw new Error('Join a household first');
  const pending=localExpenses.filter(e=>e.scope==='household');
  let imported=0;
  for(const entry of pending){
   await addCloudExpense({scope:'household',householdId:household.id,amountPaise:entry.amountPaise,category:entry.category,note:entry.note,date:entry.date});
   // Only remove a local record after its upload was acknowledged.
   setLocalExpenses(prev=>prev.filter(e=>e.id!==entry.id));
   imported++;
  }
  await refresh();
  return imported;
 },[household,localExpenses,refresh]);

 const setBudget=useCallback((scope:Scope,value:number|null)=>setBudgets(prev=>({...prev,[scope]:value})),[]);
 const clearAll=useCallback(()=>{setLocalExpenses([]);setBudgets(defaultBudgets)},[]);
 const value=useMemo<Store>(()=>({
  loaded:localLoaded&&(!user||cloudReady),expenses,budgets,household,syncing,syncError,
  currentUserId:user?.id??null,localHouseholdCount:household?localExpenses.filter(e=>e.scope==='household').length:0,
  refresh,add,update,remove,importLocalHousehold,setBudget,clearAll
 }),[localLoaded,user?.id,cloudReady,expenses,budgets,household,syncing,syncError,localExpenses,refresh,add,update,remove,importLocalHousehold,setBudget,clearAll]);
 return <Context.Provider value={value}>{children}</Context.Provider>;
}
export function useData(){const store=useContext(Context);if(!store)throw new Error('Missing DataProvider');return store}
export function formatMoney(paise:number){return new Intl.NumberFormat('en-IN',{style:'currency',currency:'INR',minimumFractionDigits:2,maximumFractionDigits:2}).format(paise/100)}
export function parseMoney(input:string){if(!/^\d+(\.\d{1,2})?$/.test(input.trim()))return null;const [whole,decimal='']=input.trim().split('.');const value=Number(whole)*100+Number(decimal.padEnd(2,'0'));return Number.isSafeInteger(value)&&value>0?value:null}
export function localDate(){const d=new Date();return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0')}
export function monthKey(date:string){return date.slice(0,7)}
export function monthly(expenses:Expense[],scope:Scope,month:string){return expenses.filter(e=>e.scope===scope&&monthKey(e.date)===month)}
export function total(expenses:Expense[]){return expenses.reduce((sum,e)=>sum+e.amountPaise,0)}
