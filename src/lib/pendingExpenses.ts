import AsyncStorage from '@react-native-async-storage/async-storage';
import {addCloudExpenseBatch,type CloudExpenseInput} from './cloudExpenses';

export type PendingExpense={id:string;userId:string;draft:CloudExpenseInput;queuedAt:string};
const key=(userId:string)=>'pesco:pending-household:'+userId;
function uuid(){
 return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g,c=>{
  const r=Math.floor(Math.random()*16);return (c==='x'?r:(r&3|8)).toString(16);
 });
}
export async function loadPending(userId:string):Promise<PendingExpense[]>{
 const raw=await AsyncStorage.getItem(key(userId));
 if(!raw)return [];
 const parsed:unknown=JSON.parse(raw);
 return Array.isArray(parsed)?parsed.filter((v):v is PendingExpense=>
  !!v&&typeof v.id==='string'&&v.userId===userId&&v.draft?.scope==='household'&&typeof v.draft?.householdId==='string'):[];
}
let queueLock:Promise<unknown>=Promise.resolve();
function locked<T>(run:()=>Promise<T>):Promise<T>{const operation=queueLock.then(run,run);queueLock=operation.catch(()=>{});return operation}
export async function queueHouseholdExpense(userId:string,draft:CloudExpenseInput){
 const entry:PendingExpense={id:uuid(),userId,draft,queuedAt:new Date().toISOString()};
 return locked(async()=>{
  const existing=await loadPending(userId);
  await AsyncStorage.setItem(key(userId),JSON.stringify([...existing,entry]));
  return entry;
 });
}
export async function savePending(userId:string,pending:PendingExpense[]){
 await AsyncStorage.setItem(key(userId),JSON.stringify(pending));
}
const uploading=new Set<string>();
const activeFlushes=new Map<string,Promise<{remaining:number;sent:number;errorMessage:string|null}>>();
export async function flushPending(userId:string,householdId:string){
 const keyForFlush=userId+':'+householdId;
 const running=activeFlushes.get(keyForFlush);
 if(running)return running;
 const run=(async()=>{
  const pending=await locked(()=>loadPending(userId));
  let sent=0,errorMessage:string|null=null;
  const matching=pending.filter(entry=>entry.draft.householdId===householdId);
  for(let start=0;start<matching.length;start+=25){
   const chunk=matching.slice(start,start+25);
   chunk.forEach(entry=>uploading.add(entry.id));
   try{
    const confirmed=await addCloudExpenseBatch(chunk.map(entry=>({id:entry.id,draft:entry.draft})));
    const acknowledged=new Set(confirmed);
    if(acknowledged.size){
     await locked(async()=>{
      const latest=await loadPending(userId);
      await savePending(userId,latest.filter(item=>!acknowledged.has(item.id)));
     });
     sent+=acknowledged.size;
    }
    if(acknowledged.size!==chunk.length){
     errorMessage='Some expenses could not be confirmed on the server. Remaining items will be retried.';
     break;
    }
   }catch(e){
    errorMessage=e instanceof Error?e.message:String(e);
    break;
   }finally{chunk.forEach(entry=>uploading.delete(entry.id))}
  }
  const remaining=(await locked(()=>loadPending(userId))).length;
  return {remaining,sent,errorMessage};
 })();
 activeFlushes.set(keyForFlush,run);
 try{return await run}finally{activeFlushes.delete(keyForFlush)}
}

export async function editPending(userId:string,id:string,draft:CloudExpenseInput){
 return locked(async()=>{
  if(uploading.has(id))throw new Error('This expense is uploading. Try again after sync.');
  const existing=await loadPending(userId);
  const entry=existing.find(item=>item.id===id);
  if(!entry)throw new Error('Queued expense not found');
  if(entry.draft.householdId!==draft.householdId)throw new Error('Cannot change household');
  const next=existing.map(item=>item.id===id?{...item,draft}:item);
  await savePending(userId,next);
  return next;
 });
}

export async function cancelPending(userId:string,id:string){
 return locked(async()=>{
  if(uploading.has(id))throw new Error('This expense is uploading. Try again when sync finishes.');
  const existing=await loadPending(userId);
  const remaining=existing.filter(entry=>entry.id!==id);
  await savePending(userId,remaining);
  return remaining;
 });
}
