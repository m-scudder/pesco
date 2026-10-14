import React,{createContext,useCallback,useContext,useEffect,useMemo,useRef,useState} from 'react';
import {AppState} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type {Scope} from './theme/palette';
import {useAuth} from './lib/AuthContext';
import {getMyHousehold,type Household} from './lib/households';
import {addCloudExpense,deleteCloudExpense,editCloudExpense,fetchAllHouseholdExpenses} from './lib/cloudExpenses';
import {supabase} from './lib/supabase';
import {makeDemoExpenses} from './lib/demoExpenses';
import {generateHouseholdRecurring} from './lib/householdRecurring';
import {queueHouseholdExpense,flushPending,loadPending,cancelPending,editPending,type PendingExpense} from './lib/pendingExpenses';
import {loadMutations,flushMutations,queueMutation,discardMutation,type PendingMutation} from './lib/pendingMutations';

export const CATEGORIES=['Groceries','Food & Drinks','Shopping','Utilities','Rent','Transport','Health','Entertainment','Education','Travel','Other'] as const;
export type Expense={id:string;scope:Scope;amountPaise:number;category:string;note:string;date:string;createdAt:string;updatedAt:string;ownerId:string};
export type ExpenseDraft=Pick<Expense,'scope'|'amountPaise'|'category'|'note'|'date'>;
export type RecurringRule={id:string;amountPaise:number;category:string;note:string;day:number;startsOn:string;active:boolean};
type Budgets={household:number|null;personal:number|null};
function recurringDates(rule:RecurringRule,today:string):string[]{
 const output:string[]=[];
 const [year,month]=rule.startsOn.slice(0,7).split('-').map(Number);
 const [lastYear,lastMonth]=today.slice(0,7).split('-').map(Number);
 const end=lastYear*12+lastMonth;
 for(let cursor=year*12+month;cursor<=end&&output.length<120;cursor++){
  const y=Math.floor((cursor-1)/12),m=(cursor-1)%12+1;
  const lastDay=new Date(y,m,0).getDate();
  const date=String(y).padStart(4,'0')+'-'+String(m).padStart(2,'0')+'-'+String(Math.min(rule.day,lastDay)).padStart(2,'0');
  if(date>=rule.startsOn&&date<=today)output.push(date);
 }
 return output;
}
type Store={
 loaded:boolean;demoEnabled:boolean;setDemoEnabled:(enabled:boolean)=>void;pendingCount:number;pendingEditCount:number;pendingMutations:PendingMutation[];discardPendingMutation:(id:string)=>Promise<void>;pendingIds:string[];pendingEntries:PendingExpense[];expenses:Expense[];recurringRules:RecurringRule[];addRecurring:(draft:Omit<RecurringRule,'id'|'active'>)=>void;setRecurringActive:(id:string,active:boolean)=>void;updateRecurring:(id:string,draft:Omit<RecurringRule,'id'|'active'>)=>void;deleteRecurring:(id:string)=>void;budgets:Budgets;household:Household|null;syncing:boolean;syncError:string|null;
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
 const [demoEnabled,setDemoEnabled]=useState(__DEV__);
 useEffect(()=>{if(!__DEV__)return;AsyncStorage.getItem('pesco:debug-demo-enabled').then(v=>{if(v!==null)setDemoEnabled(v==='true')}).catch(()=>{})},[]);
 const changeDemoEnabled=useCallback((value:boolean)=>{if(!__DEV__)return;setDemoEnabled(value);void AsyncStorage.setItem('pesco:debug-demo-enabled',String(value))},[]);
 const [localExpenses,setLocalExpenses]=useState<Expense[]>([]);
 const [budgets,setBudgets]=useState<Budgets>(defaultBudgets);
 const [recurringRules,setRecurringRules]=useState<RecurringRule[]>([]);
 const [generated,setGenerated]=useState<string[]>([]);
 const [household,setHousehold]=useState<Household|null>(null);
 const [cloudExpenses,setCloudExpenses]=useState<Expense[]>([]);
 const [syncError,setSyncError]=useState<string|null>(null);
 const [syncing,setSyncing]=useState(false);
 const [cloudReady,setCloudReady]=useState(false);
 const requested=useRef(0);
 const importing=useRef(false);
 const pendingBusy=useRef(false);
 const verifiedUser=useRef<string|null>(null);
 const recurringGeneratedOn=useRef<string|null>(null);
 const [pending,setPending]=useState<PendingExpense[]>([]);
 const [mutations,setMutations]=useState<PendingMutation[]>([]);
 const mutationEpoch=useRef(0);
 const [queueError,setQueueError]=useState<string|null>(null);
 useEffect(()=>{
  let active=true;
  if(!user){setHousehold(null);setCloudExpenses([]);return}
  AsyncStorage.getItem('pesco:household-cache:'+user.id).then(raw=>{
   if(!raw||!active||verifiedUser.current===user.id)return;
   const saved=JSON.parse(raw) as {household:Household|null;expenses:Expense[]};
   if(saved.household&&Array.isArray(saved.expenses)){
    setHousehold(old=>old??saved.household);
    setCloudExpenses(old=>old.length?old:saved.expenses);
   }
  }).catch(e=>console.warn('Could not load household cache',e));
  return()=>{active=false};
 },[user?.id]);
 useEffect(()=>{
  let live=true;
  if(!user){setPending([]);setMutations([]);return}
  loadMutations(user.id).then(items=>{if(live)setMutations(items)}).catch(e=>{if(live)setQueueError(String(e))});
  loadPending(user.id).then(items=>{if(live)setPending(items)}).catch(e=>{if(live)setQueueError(String(e))});
  return()=>{live=false};
 },[user?.id]);

 useEffect(()=>{
  let active=true;
  (async()=>{
   try{
    const raw=await AsyncStorage.getItem(STORAGE_KEY);
    if(!active||!raw)return;
    const data=JSON.parse(raw);
    if(Array.isArray(data.expenses))setLocalExpenses(data.expenses);
    if(data.budgets)setBudgets({...defaultBudgets,...data.budgets});
    if(Array.isArray(data.recurringRules))setRecurringRules(data.recurringRules);
    if(Array.isArray(data.generated))setGenerated(data.generated);
   }catch(e){console.warn('Could not restore local expenses',e)}
   finally{if(active)setLocalLoaded(true)}
  })();
  return()=>{active=false};
 },[]);
 useEffect(()=>{
  if(!localLoaded)return;
  AsyncStorage.setItem(STORAGE_KEY,JSON.stringify({expenses:localExpenses,budgets,recurringRules,generated}))
   .catch(e=>console.warn('Could not save local expenses',e));
 },[localExpenses,budgets,recurringRules,generated,localLoaded]);
 const generateDue=useCallback(()=>{
  if(!localLoaded)return;
  const today=localDate();
  const known=new Set([...generated,...localExpenses.map(x=>x.id)]);
  const additions:Expense[]=[];
  for(const rule of recurringRules.filter(x=>x.active)){
   for(const date of recurringDates(rule,today)){
    const month=date.slice(0,7);
    const occurrencePrefix='recurring:'+rule.id+':'+month;
    // Earlier versions stored full dates; recognize both formats.
    if(Array.from(known).some(existing=>existing.startsWith(occurrencePrefix)))continue;
    const id=occurrencePrefix;
    known.add(id);
    const now=new Date().toISOString();
    additions.push({id,scope:'personal',amountPaise:rule.amountPaise,category:rule.category,note:rule.note,date,ownerId:'local-user',createdAt:now,updatedAt:now});
   }
  }
  if(!additions.length)return;
  setGenerated(previous=>Array.from(new Set([...previous,...additions.map(x=>x.id)])));
  setLocalExpenses(previous=>[...additions.filter(x=>!previous.some(existing=>existing.id===x.id)),...previous]);
 },[localLoaded,recurringRules,generated,localExpenses]);
 useEffect(()=>{generateDue()},[generateDue]);
 useEffect(()=>{
  const sub=AppState.addEventListener('change',state=>{if(state==='active')generateDue()});
  return()=>sub.remove();
 },[generateDue]);
 const addRecurring=useCallback((draft:Omit<RecurringRule,'id'|'active'>)=>{
  setRecurringRules(prev=>[...prev,{...draft,id:Date.now()+'-'+Math.random().toString(36).slice(2),active:true}]);
 },[]);
 const setRecurringActive=useCallback((id:string,active:boolean)=>{
  const rule=recurringRules.find(x=>x.id===id);
  if(rule&&!rule.active&&active){
   // A pause skips due dates until the rule is resumed, never backfills them.
   const skipped=recurringDates(rule,localDate()).map(date=>'recurring:'+id+':'+date.slice(0,7));
   setGenerated(prev=>Array.from(new Set([...prev,...skipped])));
  }
  setRecurringRules(prev=>prev.map(x=>x.id===id?{...x,active}:x));
 },[recurringRules]);
 const updateRecurring=useCallback((id:string,draft:Omit<RecurringRule,'id'|'active'>)=>{
  setRecurringRules(previous=>previous.map(rule=>rule.id===id?{...rule,...draft}:rule));
 },[]);
 const deleteRecurring=useCallback((id:string)=>{
  setRecurringRules(prev=>prev.filter(x=>x.id!==id));
 },[]);

 const refresh=useCallback(async()=>{
  if(!user||!configured)return;
  const request=++requested.current;
  setSyncing(true);
  try{
   const membership=await getMyHousehold();
   if(membership&&!pendingBusy.current){
    pendingBusy.current=true;
    try{
     const result=await flushPending(user.id,membership.id);
     setQueueError(result.errorMessage);
     setPending(await loadPending(user.id));
    }finally{pendingBusy.current=false}
   }
   if(membership){
    const epoch=mutationEpoch.current;
    const result=await flushMutations(user.id,membership.id);
    if(epoch===mutationEpoch.current)setMutations(result.items);
    if(result.error)setQueueError(result.error);
    const checkKey=membership.id+':'+localDate();
    if(recurringGeneratedOn.current!==checkKey){
     try{await generateHouseholdRecurring(membership.id);recurringGeneratedOn.current=checkKey}
     catch(e){console.warn('Recurring generation postponed',e)}
    }
   }
   const rows=membership?await fetchAllHouseholdExpenses(membership.id):[];
   try{await AsyncStorage.setItem('pesco:household-cache:'+user.id,JSON.stringify({household:membership,expenses:rows}))}
   catch(e){console.warn('Could not update offline household cache',e)}
   if(request===requested.current){
    verifiedUser.current=user.id;
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
  verifiedUser.current=null;
  recurringGeneratedOn.current=null;
  setHousehold(null);setCloudExpenses([]);setCloudReady(false);setSyncError(null);
  if(!user)return;
  void refresh();
  const interval=setInterval(()=>{void refresh()},15000);
  const app=AppState.addEventListener('change',s=>{if(s==='active')void refresh()});
  return()=>{
   clearInterval(interval);app.remove();
   requested.current++;
  };
 },[user?.id,refresh]);

 // Subscribe after membership is known. Re-subscribe if the household changes.
 // Realtime events invalidate the household feed, which is fetched under RLS.
 useEffect(()=>{
  const client=supabase;
  if(!client||!user||!household?.id)return;
  const channel=client.channel('household-expenses-'+household.id)
   .on('postgres_changes',{
    event:'*',schema:'public',table:'expenses',
    filter:'household_id=eq.'+household.id
   },()=>{void refresh()})
   .subscribe(status=>{
    if(status==='CHANNEL_ERROR'||status==='TIMED_OUT'){
     console.warn('Household Realtime disconnected:',status);
    }
   });
  return()=>{void client.removeChannel(channel)};
 },[user?.id,household?.id,refresh]);

 const realExpenses=useMemo(()=>[
  ...localExpenses.filter(e=>e.scope==='personal'||(!household&&e.scope==='household')),
  ...(household?cloudExpenses.filter(e=>!mutations.some(op=>op.id===e.id&&op.kind==='delete')).map(e=>{
   const op=mutations.find(item=>item.id===e.id&&item.kind==='update');
   return op?.draft?{...e,amountPaise:op.draft.amountPaise,category:op.draft.category,note:op.draft.note,date:op.draft.date}:e;
  }):[]),
  ...pending.filter(p=>household&&p.draft.householdId===household.id&&!cloudExpenses.some(e=>e.id===p.id)).map(p=>({
   id:p.id,scope:'household' as Scope,amountPaise:p.draft.amountPaise,category:p.draft.category,note:p.draft.note,date:p.draft.date,
   ownerId:p.userId,createdAt:p.queuedAt,updatedAt:p.queuedAt
  }))
 ],[localExpenses,cloudExpenses,household,pending,mutations]);
 const demoExpenses=useMemo(()=>__DEV__?makeDemoExpenses():[],[]);
 const expenses=useMemo(()=>demoEnabled&&__DEV__?[...realExpenses,...demoExpenses]:realExpenses,[demoEnabled,realExpenses,demoExpenses]);

 const add=useCallback(async(draft:ExpenseDraft)=>{
  if(draft.scope==='household'){
   if(!household)throw new Error('Create or join a household first');
   if(!user)throw new Error('Sign in required');
   const entry=await queueHouseholdExpense(user.id,{...draft,householdId:household.id});
   setPending(previous=>[...previous,entry]);
   void refresh();
   return;
  }
  const now=new Date().toISOString();
  setLocalExpenses(prev=>[{...draft,id:now+'-'+Math.random().toString(36).slice(2),ownerId:'local-user',createdAt:now,updatedAt:now},...prev]);
 },[household,refresh,user?.id]);

 const update=useCallback(async(id:string,draft:ExpenseDraft)=>{
  if(id.startsWith('demo:'))throw new Error('Demo records are read-only. Turn off sample data in Settings to view actual records.');
  const queued=pending.find(entry=>entry.id===id);
  if(queued){
   if(!user||!household)throw new Error('Household unavailable');
   if(draft.scope!=='household')throw new Error('Changing the expense scope is unavailable');
   setPending(await editPending(user.id,id,{...draft,householdId:household.id}));
   return;
  }
  const cloud=cloudExpenses.find(e=>e.id===id);
  if(cloud){
   if(!household)throw new Error('Household no longer available');
   if(cloud.ownerId!==user?.id)throw new Error('Only the creator can edit this expense');
   if(draft.scope!==cloud.scope)throw new Error('Changing the expense scope is unavailable');
   const latest=await queueMutation(user!.id,household.id,id,'update',{...draft,householdId:household.id},cloud.updatedAt);
   mutationEpoch.current++;
   setMutations(latest);
   void refresh();
   return;
  }
  setLocalExpenses(prev=>prev.map(e=>e.id===id?{...e,...draft,updatedAt:new Date().toISOString()}:e));
 },[cloudExpenses,household,user?.id,refresh,pending]);

 const remove=useCallback(async(id:string)=>{
  if(id.startsWith('demo:'))throw new Error('Demo records cannot be deleted. Turn off sample data in Settings.');
  if(pending.some(entry=>entry.id===id)){
   if(!user)throw new Error('Sign in required');
   setPending(await cancelPending(user.id,id));
   return;
  }
  const cloud=cloudExpenses.find(e=>e.id===id);
  if(cloud){
   if(cloud.ownerId!==user?.id)throw new Error('Only the creator can delete this expense');
   if(!household||!user)throw new Error('Household unavailable');
   const latest=await queueMutation(user.id,household.id,id,'delete',undefined,cloud.updatedAt);
   mutationEpoch.current++;
   setMutations(latest);
   void refresh();
  }else setLocalExpenses(prev=>prev.filter(e=>e.id!==id));
 },[cloudExpenses,user?.id,household,refresh,pending]);

 const importLocalHousehold=useCallback(async()=>{
  if(!household)throw new Error('Join a household first');
  if(importing.current)throw new Error('Import already in progress');
  importing.current=true;
  let imported=0;
  try{
   const pending=localExpenses.filter(e=>e.scope==='household');
   for(const entry of pending){
    await addCloudExpense({scope:'household',householdId:household.id,amountPaise:entry.amountPaise,category:entry.category,note:entry.note,date:entry.date});
    // Remove each expense locally only after the server acknowledged it.
    setLocalExpenses(prev=>prev.filter(e=>e.id!==entry.id));
    imported++;
   }
   await refresh();
   return imported;
  }finally{
   importing.current=false;
  }
 },[household,localExpenses,refresh]);

 const discardPendingMutation=useCallback(async(id:string)=>{
  if(!user)throw new Error('Sign in required');
  const latest=await discardMutation(user.id,id);
  mutationEpoch.current++;
  setMutations(latest);
  void refresh();
 },[user?.id,refresh]);

 const setBudget=useCallback((scope:Scope,value:number|null)=>setBudgets(prev=>({...prev,[scope]:value})),[]);
 const clearAll=useCallback(()=>{setLocalExpenses([]);setBudgets(defaultBudgets);setRecurringRules([]);setGenerated([])},[]);
 const value=useMemo<Store>(()=>({
  loaded:localLoaded&&(!user||cloudReady),demoEnabled:__DEV__&&demoEnabled,setDemoEnabled:changeDemoEnabled,pendingEditCount:mutations.filter(item=>item.householdId===household?.id).length,pendingMutations:mutations,discardPendingMutation,pendingCount:pending.filter(x=>x.draft.householdId===household?.id).length,pendingIds:pending.filter(x=>x.draft.householdId===household?.id).map(x=>x.id),pendingEntries:pending,expenses,recurringRules,addRecurring,setRecurringActive,updateRecurring,deleteRecurring,budgets,household,syncing,syncError:syncError??queueError,
  currentUserId:user?.id??null,localHouseholdCount:household?localExpenses.filter(e=>e.scope==='household').length:0,
  refresh,add,update,remove,importLocalHousehold,setBudget,clearAll
 }),[localLoaded,user?.id,cloudReady,demoEnabled,changeDemoEnabled,expenses,pending,mutations,discardPendingMutation,queueError,recurringRules,addRecurring,setRecurringActive,updateRecurring,deleteRecurring,budgets,household,syncing,syncError,localExpenses,refresh,add,update,remove,importLocalHousehold,setBudget,clearAll]);
 return <Context.Provider value={value}>{children}</Context.Provider>;
}
export function useData(){const store=useContext(Context);if(!store)throw new Error('Missing DataProvider');return store}
export function formatMoney(paise:number){return new Intl.NumberFormat('en-IN',{style:'currency',currency:'INR',minimumFractionDigits:2,maximumFractionDigits:2}).format(paise/100)}
export function parseMoney(input:string){if(!/^\d+(\.\d{1,2})?$/.test(input.trim()))return null;const [whole,decimal='']=input.trim().split('.');const value=Number(whole)*100+Number(decimal.padEnd(2,'0'));return Number.isSafeInteger(value)&&value>0?value:null}
export function localDate(){const d=new Date();return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0')}
export function monthKey(date:string){return date.slice(0,7)}
export function monthly(expenses:Expense[],scope:Scope,month:string){return expenses.filter(e=>e.scope===scope&&monthKey(e.date)===month)}
export function total(expenses:Expense[]){return expenses.reduce((sum,e)=>sum+e.amountPaise,0)}
