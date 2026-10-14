import AsyncStorage from '@react-native-async-storage/async-storage';
import {addCloudExpense,type CloudExpenseInput} from './cloudExpenses';

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
  for(const entry of pending){
   if(entry.draft.householdId!==householdId)continue;
   // A new expense can be saved to disk while a network upload is running.
   uploading.add(entry.id);
   try{
    await addCloudExpense(entry.draft,entry.id);
    await locked(async()=>{
     const latest=await loadPending(userId);
     await savePending(userId,latest.filter(item=>item.id!==entry.id));
    });
    sent++;
   }catch(e){
    errorMessage=e instanceof Error?e.message:String(e);
    break;
   }finally{uploading.delete(entry.id)}
  }
  const remaining=(await locked(()=>loadPending(userId))).length;
  return {remaining,sent,errorMessage};
 })();
 activeFlushes.set(keyForFlush,run);
 try{return await run}finally{activeFlushes.delete(keyForFlush)}
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
