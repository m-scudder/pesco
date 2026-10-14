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
export async function flushPending(userId:string,householdId:string){return locked(async()=>{
 const pending=await loadPending(userId);
 const retained:PendingExpense[]=[];
 let sent=0;
 let errorMessage:string|null=null;
 for(let i=0;i<pending.length;i++){
  const entry=pending[i];
  if(entry.draft.householdId!==householdId){retained.push(entry);continue}
  if(errorMessage){retained.push(entry);continue}
  try{
   await addCloudExpense(entry.draft,entry.id);
   sent++;
  }catch(e){
   retained.push(entry);
   errorMessage=e instanceof Error?e.message:String(e);
  }
 }
 await savePending(userId,retained);
 return {remaining:retained.length,sent,errorMessage};
});}

export async function cancelPending(userId:string,id:string){
 return locked(async()=>{
  const existing=await loadPending(userId);
  const remaining=existing.filter(entry=>entry.id!==id);
  await savePending(userId,remaining);
  return remaining;
 });
}
