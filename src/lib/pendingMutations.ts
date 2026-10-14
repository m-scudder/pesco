import AsyncStorage from '@react-native-async-storage/async-storage';
import {deleteCloudExpense,editCloudExpense,type CloudExpenseInput} from './cloudExpenses';

export type PendingMutation={
 id:string; userId:string; householdId:string; kind:'update'|'delete';
 draft?:CloudExpenseInput; revision:string;
};
const key=(userId:string)=>'pesco:pending-mutations:'+userId;
let serial:Promise<unknown>=Promise.resolve();
const locked=<T>(callback:()=>Promise<T>):Promise<T>=>{
 const next=serial.then(callback,callback);
 serial=next.catch(()=>{});
 return next;
};
const sending=new Set<string>();
export async function loadMutations(userId:string):Promise<PendingMutation[]>{
 const raw=await AsyncStorage.getItem(key(userId));
 if(!raw)return [];
 const input:unknown=JSON.parse(raw);
 return Array.isArray(input)?input.filter((v):v is PendingMutation=>
  !!v&&typeof v.id==='string'&&v.userId===userId&&typeof v.householdId==='string'&&
  (v.kind==='delete'||(v.kind==='update'&&v.draft?.scope==='household'))):[];
}
async function persist(userId:string,items:PendingMutation[]){
 await AsyncStorage.setItem(key(userId),JSON.stringify(items));
}
export async function queueMutation(userId:string,householdId:string,id:string,kind:'update'|'delete',draft?:CloudExpenseInput){
 return locked(async()=>{
  if(sending.has(id))throw new Error('This expense is syncing. Try again shortly.');
  const previous=await loadMutations(userId);
  const old=previous.find(item=>item.id===id);
  // Never resurrect an item whose deletion is already queued.
  if(old?.kind==='delete'&&kind==='update')throw new Error('This expense is waiting to be deleted.');
  const entry:PendingMutation={id,userId,householdId,kind,draft,revision:new Date().toISOString()+'-'+Math.random()};
  const next=[...previous.filter(item=>item.id!==id),entry];
  await persist(userId,next);
  return next;
 });
}
const active=new Map<string,Promise<{items:PendingMutation[];error:string|null}>>();
export async function flushMutations(userId:string,householdId:string){
 const id=userId+':'+householdId;
 const existing=active.get(id);if(existing)return existing;
 const task=(async()=>{
  const queued=await locked(()=>loadMutations(userId));
  let error:string|null=null;
  for(const mutation of queued){
   if(mutation.householdId!==householdId)continue;
   sending.add(mutation.id);
   try{
    if(mutation.kind==='delete')await deleteCloudExpense(mutation.id);
    else if(mutation.draft)await editCloudExpense(mutation.id,mutation.draft);
    await locked(async()=>{
     const latest=await loadMutations(userId);
     await persist(userId,latest.filter(item=>item.id!==mutation.id||item.revision!==mutation.revision));
    });
   }catch(e){error=e instanceof Error?e.message:String(e);break}
   finally{sending.delete(mutation.id)}
  }
  return {items:await locked(()=>loadMutations(userId)),error};
 })();
 active.set(id,task);
 try{return await task}finally{active.delete(id)}
}
