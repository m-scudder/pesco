import React,{createContext,useCallback,useContext,useEffect,useMemo,useRef,useState} from 'react';
import {AppState} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type {Scope} from './theme/palette';
import {useAuth} from './lib/AuthContext';
import {getMyHousehold,type Household} from './lib/households';
import {addCloudExpense,deleteCloudExpense,editCloudExpense,fetchAllHouseholdExpenses,fetchHouseholdExpenseById,fetchAllPersonalExpenses,importPersonalExpense} from './lib/cloudExpenses';
import {supabase} from './lib/supabase';
import {makeDemoExpenses} from './lib/demoExpenses';
import {generateHouseholdRecurring} from './lib/householdRecurring';
import {queueHouseholdExpense,flushPending,loadPending,cancelPending,editPending,type PendingExpense} from './lib/pendingExpenses';
import {loadMutations,flushMutations,queueMutation,discardMutation,type PendingMutation} from './lib/pendingMutations';
import {loadHouseholdLedger,seedHouseholdLedger,upsertLocalHouseholdExpense,removeHouseholdLedgerExpense,reconcileHouseholdLedger,upsertSyncedHouseholdExpense,removeSyncedHouseholdExpense} from './lib/localLedger';

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
const LEGACY_STORAGE_KEY='pesco-local-v1';
const userStorageKey=(id:string)=>'pesco:account-data:'+id+':v1';
const defaultBudgets:Budgets={household:null,personal:null};

export function DataProvider({children}:{children:React.ReactNode}){
 const {user,configured}=useAuth();
 const [localLoaded,setLocalLoaded]=useState(false);
 const [loadedOwner,setLoadedOwner]=useState<string|null>(null);
 const [demoEnabled,setDemoEnabled]=useState(__DEV__);
 useEffect(()=>{if(!__DEV__)return;AsyncStorage.getItem('pesco:debug-demo-enabled').then(v=>{if(v!==null)setDemoEnabled(v==='true')}).catch(()=>{})},[]);
 const changeDemoEnabled=useCallback((value:boolean)=>{if(!__DEV__)return;setDemoEnabled(value);void AsyncStorage.setItem('pesco:debug-demo-enabled',String(value))},[]);
 const [localExpenses,setLocalExpenses]=useState<Expense[]>([]);
 const personalSource=useRef(localExpenses);
 personalSource.current=localExpenses;
 const [budgets,setBudgets]=useState<Budgets>(defaultBudgets);
 const [recurringRules,setRecurringRules]=useState<RecurringRule[]>([]);
 const [generated,setGenerated]=useState<string[]>([]);
 const [household,setHousehold]=useState<Household|null>(null);
 const [cloudExpenses,setCloudExpenses]=useState<Expense[]>([]);
 const [ledgerExpenses,setLedgerExpenses]=useState<Expense[]>([]);
 const [cloudPersonal,setCloudPersonal]=useState<Expense[]>([]);
 const personalImportBusy=useRef(false);
 const [syncError,setSyncError]=useState<string|null>(null);
 const [hiddenDeleted,setHiddenDeleted]=useState<string[]>([]);
 const [syncing,setSyncing]=useState(false);
 const [cloudReady,setCloudReady]=useState(false);
 const requested=useRef(0);
 const importing=useRef(false);
 const refreshRef=useRef<()=>Promise<void>>(async()=>{});
 const verifiedUser=useRef<string|null>(null);
 const recurringGeneratedOn=useRef<string|null>(null);
 const [pending,setPending]=useState<PendingExpense[]>([]);
 const [mutations,setMutations]=useState<PendingMutation[]>([]);
 const mutationEpoch=useRef(0);
 const [queueError,setQueueError]=useState<string|null>(null);
 useEffect(()=>{
  let active=true;
  if(!user){setHousehold(null);setCloudExpenses([]);setLedgerExpenses([]);return}
  const userId=user.id;
  void (async()=>{
   try{
    const raw=await AsyncStorage.getItem('pesco:household-cache:'+userId);
    if(!raw||!active||verifiedUser.current===userId)return;
    const saved=JSON.parse(raw) as {household:Household|null;expenses:Expense[]};
    if(!saved.household)return;
    const householdId=saved.household.id;
    if(active)setHousehold(previous=>previous??saved.household);
    const cached=Array.isArray(saved.expenses)?saved.expenses:[];
    // Existing installations already have an AsyncStorage snapshot.
    // Import it without replacing newer SQLite records.
    await seedHouseholdLedger(userId,householdId,cached);
    const durable=await loadHouseholdLedger(userId,householdId);
    if(!active)return;
    setLedgerExpenses(previous=>previous.length?previous:durable);
    setCloudExpenses(previous=>previous.length?previous:cached);
   }catch(error){console.warn('Could not restore household ledger',error)}
  })();
  return()=>{active=false};
 },[user?.id]);
 useEffect(()=>{
  let active=true;
  if(!user){setCloudPersonal([]);return}
  AsyncStorage.getItem('pesco:personal-cache:'+user.id).then(raw=>{
   if(!active||!raw)return;
   const parsed:unknown=JSON.parse(raw);
   if(Array.isArray(parsed)){
    const safe=parsed.filter((item):item is Expense=>
     item?.scope==='personal'&&item?.ownerId===user.id&&typeof item.id==='string');
    setCloudPersonal(previous=>previous.length?previous:safe);
   }
  }).catch(error=>console.warn('Could not restore private expense cache',error));
  return()=>{active=false};
 },[user?.id]);

 useEffect(()=>{
  let live=true;
  if(!user){setPending([]);setMutations([]);return}
  const mutationLoadEpoch=mutationEpoch.current;
  loadMutations(user.id).then(items=>{if(live&&mutationLoadEpoch===mutationEpoch.current)setMutations(items)}).catch(e=>{if(live)setQueueError(String(e))});
  loadPending(user.id).then(items=>{if(live)setPending(items)}).catch(e=>{if(live)setQueueError(String(e))});
  return()=>{live=false};
 },[user?.id]);

 // Keep private settings under the authenticated account, not a shared device-wide key.
 useEffect(()=>{
  let active=true;
  setLocalLoaded(false);
  setLoadedOwner(null);
  setLocalExpenses([]);
  setBudgets(defaultBudgets);
  setRecurringRules([]);
  setGenerated([]);
  if(!user)return()=>{active=false};
  const userId=user.id;
  void (async()=>{
   try{
    let raw=await AsyncStorage.getItem(userStorageKey(userId));
    if(!raw){
     // One-time migration from the previous device-wide store. Never import it again.
     const legacy=await AsyncStorage.getItem(LEGACY_STORAGE_KEY);
     const legacyOwner=await AsyncStorage.getItem('pesco:legacy-personal-owner');
     if(legacy&&(!legacyOwner||legacyOwner===userId)){
      await AsyncStorage.setItem(userStorageKey(userId),legacy);
      await AsyncStorage.removeItem(LEGACY_STORAGE_KEY);
      raw=legacy;
     }
    }
    if(!active)return;
    if(raw){
     const data=JSON.parse(raw);
     if(Array.isArray(data.expenses))setLocalExpenses(data.expenses);
     if(data.budgets)setBudgets({...defaultBudgets,personal:data.budgets.personal??null});
     if(Array.isArray(data.recurringRules))setRecurringRules(data.recurringRules);
     if(Array.isArray(data.generated))setGenerated(data.generated);
    }
   }catch(e){console.warn('Could not restore account settings',e)}
   finally{if(active){setLoadedOwner(userId);setLocalLoaded(true)}}
  })();
  return()=>{active=false};
 },[user?.id]);
 useEffect(()=>{
  if(!user||!localLoaded||loadedOwner!==user.id)return;
  AsyncStorage.setItem(userStorageKey(user.id),JSON.stringify({expenses:localExpenses,budgets:{personal:budgets.personal},recurringRules,generated}))
   .catch(e=>console.warn('Could not save account settings',e));
 },[localExpenses,budgets,recurringRules,generated,localLoaded,loadedOwner,user?.id]);
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
   if(membership){
    const checkKey=membership.id+':'+localDate();
    if(recurringGeneratedOn.current!==checkKey){
     try{await generateHouseholdRecurring(membership.id);recurringGeneratedOn.current=checkKey}
     catch(e){console.warn('Recurring generation postponed',e)}
    }
   }
   const snapshotStartedAt=Date.now();
   const rows=membership?await fetchAllHouseholdExpenses(membership.id):[];
   let localRows=rows;
   if(membership){
    try{localRows=await reconcileHouseholdLedger(user.id,membership.id,rows,snapshotStartedAt)}
    catch(error){console.warn('SQLite reconciliation failed; using cloud snapshot',error)}
   }
   if(localLoaded&&!personalImportBusy.current){
    personalImportBusy.current=true;
    try{
     const ownerKey='pesco:legacy-personal-owner';
     const recordedOwner=await AsyncStorage.getItem(ownerKey);
     const legacy=personalSource.current.filter(e=>e.scope==='personal');
     // Reclaim an empty device ledger for the current account, but never adopt
     // another user's existing local transactions automatically.
     if(!recordedOwner||recordedOwner!==user.id&&legacy.length===0){
      await AsyncStorage.setItem(ownerKey,user.id);
     }
     if(!recordedOwner||recordedOwner===user.id||legacy.length===0){
      for(const entry of legacy){
       await importPersonalExpense(entry);
       setLocalExpenses(previous=>previous.filter(e=>e.id!==entry.id));
      }
     }else if(personalSource.current.some(e=>e.scope==='personal')){
      setQueueError('Personal data on this device belongs to a different account and was not imported.');
     }
    }catch(e){
     setQueueError('Personal cloud backup pending: '+(e instanceof Error?e.message:String(e)));
    }finally{personalImportBusy.current=false}
   }
   const personalRows=await fetchAllPersonalExpenses(user.id);
   await AsyncStorage.setItem('pesco:personal-cache:'+user.id,JSON.stringify(personalRows)).catch(e=>console.warn('Personal cache write failed',e));
   try{await AsyncStorage.setItem('pesco:household-cache:'+user.id,JSON.stringify({household:membership,expenses:rows}))}
   catch(e){console.warn('Could not update offline household cache',e)}
   if(request===requested.current){
    verifiedUser.current=user.id;
    setHousehold(membership);setCloudExpenses(rows);setLedgerExpenses(localRows);setCloudPersonal(personalRows);
    // Only retire optimistic rows once the fetched cloud snapshot contains them.
    // This prevents a transient disappearance between upload ACK and refresh.
    const remoteIds=new Set(rows.map(row=>row.id));
    setPending(previous=>previous.filter(entry=>!remoteIds.has(entry.id)));
    setSyncError(null);setCloudReady(true);
   }
  }catch(e){
   if(request===requested.current){
    setSyncError(e instanceof Error?e.message:'Could not sync expenses');setCloudReady(true);
   }
  }finally{if(request===requested.current)setSyncing(false)}
 },[user?.id,configured,localLoaded]);
 refreshRef.current=refresh;

 // Upload the durable outbox separately from incoming refreshes. A partner's
 // realtime event must never trigger another outbound upload.
 const uploadBusy=useRef(false);
 const uploadRef=useRef<()=>Promise<void>>(async()=>{});
 const syncOutgoing=useCallback(async()=>{
  if(!user||!household||uploadBusy.current)return;
  uploadBusy.current=true;
  try{
   const id=user.id,houseId=household.id;
   const [queuedExpenses,queuedMutations]=await Promise.all([loadPending(id),loadMutations(id)]);
   const creates=queuedExpenses.filter(item=>item.draft.householdId===houseId).length;
   const edits=queuedMutations.filter(item=>item.householdId===houseId).length;
   // Interval ticks are cheap no-ops when the outbox is already empty.
   if(creates===0&&edits===0)return;
   const pendingResult=await flushPending(id,houseId);
   // Do not drop optimistic entries here: cloud refresh may still be in flight.
   // The refresh path removes an entry after its server record is visible.
   const currentMutationEpoch=mutationEpoch.current;
   const mutationResult=await flushMutations(id,houseId);
   setQueueError(pendingResult.errorMessage??mutationResult.error);
   // Read committed rows before clearing the optimistic edit/delete overlay.
   // Otherwise old values flash back while the cloud refresh is in flight.
   if(pendingResult.sent>0||(edits>0&&!mutationResult.error))
    await refreshRef.current();
   if(currentMutationEpoch===mutationEpoch.current){
    mutationEpoch.current++;
    setMutations(mutationResult.items);
   }
  }catch(error){
   setQueueError(error instanceof Error?error.message:String(error));
  }finally{uploadBusy.current=false}
 },[user?.id,household?.id]);
 uploadRef.current=syncOutgoing;

 useEffect(()=>{
  requested.current++;
  verifiedUser.current=null;
  recurringGeneratedOn.current=null;
  setHousehold(null);setCloudExpenses([]);setLedgerExpenses([]);setCloudPersonal([]);setCloudReady(false);setSyncError(null);
  if(!user)return;
  void refreshRef.current();
  // Realtime refreshes normally provide prompt updates; polling is a fallback after missed events.
  const interval=setInterval(()=>{if(AppState.currentState==='active')void refreshRef.current()},60000);
  // Batch outbound changes periodically instead of uploading every 15 seconds.
  const uploadInterval=setInterval(()=>{if(AppState.currentState==='active')void uploadRef.current()},30*60*1000);
  const app=AppState.addEventListener('change',s=>{
   if(s==='active'){void refreshRef.current()}
   if(s==='background')void uploadRef.current();
  });
  return()=>{
   clearInterval(interval);clearInterval(uploadInterval);app.remove();
   requested.current++;
  };
 },[user?.id]);

 // Outbound writes are sent by the fixed interval above, not every new expense.
 // Foreground resume also triggers a flush; pending rows remain visible locally.

 // Legacy personal entries have their own idempotent import path.
 useEffect(()=>{
  if(user&&localLoaded&&localExpenses.some(e=>e.scope==='personal')){
   const timer=setTimeout(()=>{void refreshRef.current()},1000);
   return()=>clearTimeout(timer);
  }
 },[user?.id,localLoaded,localExpenses]);
 
 // The channel notifies us of changed IDs; read only those rows under RLS.
 // Periodic and foreground full fetches recover missed events.
 useEffect(()=>{
  const client=supabase;
  if(!client||!user||!household?.id)return;
  const userId=user.id,householdId=household.id;
  let alive=true;
  const channel=client.channel('household-expenses-'+householdId)
   .on('postgres_changes',{
    event:'*',schema:'public',table:'expenses',filter:'household_id=eq.'+householdId
   },payload=>{
    const data=payload.eventType==='DELETE'?payload.old:payload.new;
    const id=typeof data?.id==='string'?data.id:null;
    if(!id){void refreshRef.current();return}
    void (async()=>{
     try{
      if(payload.eventType==='DELETE'){
       await removeSyncedHouseholdExpense(userId,id);
       if(!alive)return;
       setLedgerExpenses(previous=>previous.filter(row=>row.id!==id));
       setCloudExpenses(previous=>previous.filter(row=>row.id!==id));
      }else{
       const row=await fetchHouseholdExpenseById(id,householdId);
       if(!row||!alive)return;
       await upsertSyncedHouseholdExpense(userId,householdId,row);
       if(!alive)return;
       setLedgerExpenses(previous=>[...previous.filter(item=>item.id!==id),row]);
       setCloudExpenses(previous=>[...previous.filter(item=>item.id!==id),row]);
      }
     }catch(error){
      console.warn('Realtime expense merge failed',error);
      if(alive)void refreshRef.current();
     }
    })();
   })
   .subscribe(status=>{
    if(status==='CHANNEL_ERROR'||status==='TIMED_OUT')
     console.warn('Household Realtime disconnected:',status);
   });
  return()=>{alive=false;void client.removeChannel(channel)};
 },[user?.id,household?.id]);

 const realExpenses=useMemo(()=>[
  ...localExpenses.filter(e=>(e.scope==='personal'&&!cloudPersonal.some(remote=>remote.id===e.id))||(!household&&e.scope==='household')),
  ...cloudPersonal.filter(e=>!hiddenDeleted.includes(e.id)),
  ...(household?ledgerExpenses.filter(e=>!hiddenDeleted.includes(e.id)&&!mutations.some(op=>op.id===e.id&&op.kind==='delete')).map(e=>{
   const op=mutations.find(item=>item.id===e.id&&item.kind==='update');
   return op?.draft?{...e,amountPaise:op.draft.amountPaise,category:op.draft.category,note:op.draft.note,date:op.draft.date}:e;
  }):[]),
  ...pending.filter(p=>household&&p.draft.householdId===household.id&&!ledgerExpenses.some(e=>e.id===p.id)).map(p=>({
   id:p.id,scope:'household' as Scope,amountPaise:p.draft.amountPaise,category:p.draft.category,note:p.draft.note,date:p.draft.date,
   ownerId:p.userId,createdAt:p.queuedAt,updatedAt:p.queuedAt
  }))
 ],[localExpenses,ledgerExpenses,cloudPersonal,household,pending,mutations,hiddenDeleted]);
 const demoExpenses=useMemo(()=>__DEV__?makeDemoExpenses():[],[]);
 const expenses=useMemo(()=>demoEnabled&&__DEV__?[...realExpenses,...demoExpenses]:realExpenses,[demoEnabled,realExpenses,demoExpenses]);

 const add=useCallback(async(draft:ExpenseDraft)=>{
  if(draft.scope==='household'){
   if(!household)throw new Error('Create or join a household first');
   if(!user)throw new Error('Sign in required');
   const entry=await queueHouseholdExpense(user.id,{...draft,householdId:household.id});
   const optimistic:Expense={id:entry.id,...draft,ownerId:user.id,createdAt:entry.queuedAt,updatedAt:entry.queuedAt};
   // Durable queue first; local ledger second. Keep queue overlay if SQLite fails.
   try{
    await upsertLocalHouseholdExpense(user.id,household.id,optimistic);
    setLedgerExpenses(previous=>previous.some(row=>row.id===optimistic.id)?previous:[...previous,optimistic]);
   }catch(error){console.warn('Local ledger write failed; outbox is safe',error)}
   setPending(previous=>[...previous,entry]);
   return;
  }
  const now=new Date().toISOString();
  setLocalExpenses(prev=>[{...draft,id:now+'-'+Math.random().toString(36).slice(2),ownerId:'local-user',createdAt:now,updatedAt:now},...prev]);
 },[household,user?.id]);

 const update=useCallback(async(id:string,draft:ExpenseDraft)=>{
  if(id.startsWith('demo:'))throw new Error('Demo records are read-only. Turn off sample data in Settings to view actual records.');
  const queued=pending.find(entry=>entry.id===id);
  if(queued){
   if(!user||!household)throw new Error('Household unavailable');
   if(draft.scope!=='household')throw new Error('Changing the expense scope is unavailable');
   const updated=await editPending(user.id,id,{...draft,householdId:household.id});
   setPending(updated);
   const original=ledgerExpenses.find(e=>e.id===id);
   if(original){
    const row={...original,...draft,updatedAt:new Date().toISOString()};
    await upsertLocalHouseholdExpense(user.id,household.id,row);
    setLedgerExpenses(previous=>previous.map(e=>e.id===id?row:e));
   }
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
   return;
  }
  if(cloudPersonal.some(e=>e.id===id)){
   await editCloudExpense(id,{...draft,householdId:null});
   await refresh();
   return;
  }
  setLocalExpenses(prev=>prev.map(e=>e.id===id?{...e,...draft,updatedAt:new Date().toISOString()}:e));
 },[cloudExpenses,cloudPersonal,household,user?.id,refresh,pending,ledgerExpenses]);

 const remove=useCallback(async(id:string)=>{
  if(id.startsWith('demo:'))throw new Error('Demo records cannot be deleted. Turn off sample data in Settings.');
  if(pending.some(entry=>entry.id===id)){
   if(!user)throw new Error('Sign in required');
   const next=await cancelPending(user.id,id);
   setPending(next);
   await removeHouseholdLedgerExpense(user.id,id);
   setLedgerExpenses(previous=>previous.filter(e=>e.id!==id));
   return;
  }
  const cloud=cloudExpenses.find(e=>e.id===id);
  if(cloud){
   if(cloud.ownerId!==user?.id)throw new Error('Only the creator can delete this expense');
   if(!household||!user)throw new Error('Household unavailable');
   const latest=await queueMutation(user.id,household.id,id,'delete',undefined,cloud.updatedAt);
   mutationEpoch.current++;
   setMutations(latest);
  }else if(cloudPersonal.some(e=>e.id===id)){
   await deleteCloudExpense(id);
   await refresh();
  }else setLocalExpenses(prev=>prev.filter(e=>e.id!==id));
 },[cloudExpenses,cloudPersonal,user?.id,household,refresh,pending]);

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
