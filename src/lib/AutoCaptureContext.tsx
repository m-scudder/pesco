import React,{createContext,useCallback,useContext,useEffect,useMemo,useRef,useState} from 'react';
import {AppState} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';
import {useAuth} from './AuthContext';
import {useData} from '@/data';
import type {Scope} from '@/theme/palette';
import {mergeDetected,parseBankMessage,type DetectedTransaction,type RawMessage} from './transactionParser';
import {captureAvailable,captureMode,drainQueue,onQueued,readInbox} from '../../modules/pesco-capture';

// Detected payments stay on this device until the user adds or dismisses them.
// Nothing from a bank message is uploaded until it becomes an expense.

type Suggestion={category:string|null;scope:Scope|null};
type AutoCaptureStore={
 available:boolean;mode:'sms'|'shortcut'|null;loaded:boolean;
 detected:DetectedTransaction[];newCount:number;lastCapturedAt:number|null;
 refresh:()=>Promise<void>;
 importRecent:(days:number)=>Promise<number>;
 addPastedMessage:(text:string)=>Promise<'added'|'duplicate'|'not-recognised'>;
 confirm:(id:string,choice:{category:string;scope:Scope;note:string})=>Promise<void>;
 dismiss:(id:string)=>Promise<void>;
 suggestionFor:(item:DetectedTransaction)=>Suggestion;
};
const Context=createContext<AutoCaptureStore|null>(null);
const listKey=(userId:string)=>'pesco:detected:'+userId+':v1';
const memoryKey=(userId:string)=>'pesco:merchant-memory:'+userId+':v1';
const lastKey=(userId:string)=>'pesco:capture-last:'+userId+':v1';
const merchantKey=(merchant:string|null)=>(merchant??'').trim().toLowerCase();

export function AutoCaptureProvider({children}:{children:React.ReactNode}){
 const {user}=useAuth();
 const {add,household}=useData();
 const userId=user?.id??null;
 const [detected,setDetected]=useState<DetectedTransaction[]>([]);
 const [memory,setMemory]=useState<Record<string,{category:string;scope:Scope}>>({});
 const [lastCapturedAt,setLastCapturedAt]=useState<number|null>(null);
 const [loaded,setLoaded]=useState(false);
 const current=useRef<DetectedTransaction[]>([]);
 const serial=useRef<Promise<unknown>>(Promise.resolve());
 // Every change goes through one queue, so a capture and a tap never overwrite each other.
 const locked=useCallback(<T,>(run:()=>Promise<T>):Promise<T>=>{
  const next=serial.current.then(run,run);
  serial.current=next.catch(()=>{});
  return next;
 },[]);

 const save=useCallback(async(owner:string,items:DetectedTransaction[])=>{
  current.current=items;
  setDetected(items);
  await AsyncStorage.setItem(listKey(owner),JSON.stringify(items));
 },[]);

 const ingest=useCallback((messages:RawMessage[])=>locked(async()=>{
  if(!userId||!messages.length)return 0;
  const {all,added}=mergeDetected(current.current,messages,()=>Crypto.randomUUID());
  if(added){
   await save(userId,all);
   const latest=Math.max(...messages.map(m=>m.receivedAt));
   setLastCapturedAt(latest);
   await AsyncStorage.setItem(lastKey(userId),String(latest));
  }
  return added;
 }),[userId,locked,save]);

 const refresh=useCallback(async()=>{
  if(!userId)return;
  // Leave messages in the native queue until a user is signed in to own them.
  await ingest(drainQueue());
 },[userId,ingest]);

 useEffect(()=>{
  let active=true;
  setLoaded(false);current.current=[];setDetected([]);setMemory({});setLastCapturedAt(null);
  if(!userId)return;
  void (async()=>{
   try{
    const [list,mem,last]=await Promise.all([
     AsyncStorage.getItem(listKey(userId)),AsyncStorage.getItem(memoryKey(userId)),AsyncStorage.getItem(lastKey(userId)),
    ]);
    if(!active)return;
    const items=list?JSON.parse(list):[];
    current.current=Array.isArray(items)?items:[];
    setDetected(current.current);
    setMemory(mem?JSON.parse(mem):{});
    setLastCapturedAt(last?Number(last):null);
   }catch(error){console.warn('Could not load detected transactions',error)}
   finally{if(active)setLoaded(true)}
   if(active)await refresh();
  })();
  const app=AppState.addEventListener('change',state=>{if(state==='active')void refresh()});
  const stop=onQueued(()=>{void refresh()});
  return()=>{active=false;app.remove();stop()};
 },[userId]);

 const importRecent=useCallback(async(days:number)=>{
  const since=Date.now()-days*86400000;
  return ingest(await readInbox(since,1000));
 },[ingest]);

 const addPastedMessage=useCallback(async(text:string)=>{
  const parsed=parseBankMessage(text,null,new Date());
  if(!parsed||parsed.direction!=='debit')return 'not-recognised' as const;
  const added=await ingest([{body:text,sender:null,receivedAt:Date.now(),source:'paste'}]);
  return added?'added' as const:'duplicate' as const;
 },[ingest]);

 const setStatus=useCallback((id:string,status:'added'|'dismissed')=>locked(async()=>{
  if(!userId)return;
  await save(userId,current.current.map(item=>item.id===id?{...item,status}:item));
 }),[userId,locked,save]);

 const confirm=useCallback(async(id:string,choice:{category:string;scope:Scope;note:string})=>{
  if(!userId)throw new Error('Sign in required');
  const item=current.current.find(entry=>entry.id===id);
  if(!item||item.status!=='new')return;
  const scope=choice.scope==='household'&&!household?'personal':choice.scope;
  await add({scope,amountPaise:item.amountPaise,category:choice.category,note:choice.note.trim(),date:item.date});
  await setStatus(id,'added');
  const key=merchantKey(item.merchant);
  if(key){
   const next={...memory,[key]:{category:choice.category,scope}};
   setMemory(next);
   await AsyncStorage.setItem(memoryKey(userId),JSON.stringify(next)).catch(()=>{});
  }
 },[userId,household,add,setStatus,memory]);

 const dismiss=useCallback((id:string)=>setStatus(id,'dismissed'),[setStatus]);
 const suggestionFor=useCallback((item:DetectedTransaction):Suggestion=>{
  const remembered=memory[merchantKey(item.merchant)];
  return {category:remembered?.category??null,scope:remembered?.scope??null};
 },[memory]);

 const value=useMemo<AutoCaptureStore>(()=>({
  available:captureAvailable,mode:captureMode,loaded,detected,
  newCount:detected.filter(item=>item.status==='new').length,lastCapturedAt,
  refresh,importRecent,addPastedMessage,confirm,dismiss,suggestionFor,
 }),[loaded,detected,lastCapturedAt,refresh,importRecent,addPastedMessage,confirm,dismiss,suggestionFor]);
 return <Context.Provider value={value}>{children}</Context.Provider>;
}

export function useAutoCapture(){
 const store=useContext(Context);
 if(!store)throw new Error('AutoCaptureProvider missing');
 return store;
}
