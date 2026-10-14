import React, {createContext, useCallback, useContext, useEffect, useMemo, useState} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type {Scope} from './theme/palette';

export const CATEGORIES = ['Groceries','Food & Drinks','Shopping','Utilities','Rent','Transport','Health','Entertainment','Education','Travel','Other'] as const;
export type Expense = {id:string;scope:Scope;amountPaise:number;category:string;note:string;date:string;createdAt:string;updatedAt:string;ownerId:string};
type Draft = Pick<Expense,'scope'|'amountPaise'|'category'|'note'|'date'>;
type Budgets = {household:number|null;personal:number|null};
type Store = {loaded:boolean;expenses:Expense[];budgets:Budgets;add:(d:Draft)=>void;update:(id:string,d:Draft)=>void;remove:(id:string)=>void;setBudget:(scope:Scope,v:number|null)=>void;clearAll:()=>void};
const Context = createContext<Store|null>(null);
const STORAGE_KEY='pesco-local-v1';
const defaults:Budgets={household:null,personal:null};
export function DataProvider({children}:{children:React.ReactNode}){
 const [loaded,setLoaded]=useState(false);
 const [expenses,setExpenses]=useState<Expense[]>([]);
 const [budgets,setBudgets]=useState<Budgets>(defaults);
 useEffect(()=>{let alive=true;(async()=>{try{const raw=await AsyncStorage.getItem(STORAGE_KEY);if(raw&&alive){const data=JSON.parse(raw);if(Array.isArray(data.expenses))setExpenses(data.expenses);if(data.budgets)setBudgets({...defaults,...data.budgets});}}catch(e){console.warn('PESCO local data load failed',e)}finally{if(alive)setLoaded(true)}})();return()=>{alive=false}},[]);
 useEffect(()=>{if(!loaded)return;AsyncStorage.setItem(STORAGE_KEY,JSON.stringify({expenses,budgets})).catch((e:unknown)=>console.warn('PESCO local save failed',e))},[expenses,budgets,loaded]);
 const add=useCallback((d:Draft)=>{const now=new Date().toISOString();setExpenses(prev=>[{...d,id:now+'-'+Math.random().toString(36).slice(2),ownerId:'local-user',createdAt:now,updatedAt:now},...prev])},[]);
 const update=useCallback((id:string,d:Draft)=>setExpenses(prev=>prev.map(e=>e.id===id?{...e,...d,updatedAt:new Date().toISOString()}:e)),[]);
 const remove=useCallback((id:string)=>setExpenses(prev=>prev.filter(e=>e.id!==id)),[]);
 const setBudget=useCallback((scope:Scope,v:number|null)=>setBudgets(prev=>({...prev,[scope]:v})),[]);
 const clearAll=useCallback(()=>{setExpenses([]);setBudgets(defaults)},[]);
 const value=useMemo(()=>({loaded,expenses,budgets,add,update,remove,setBudget,clearAll}),[loaded,expenses,budgets,add,update,remove,setBudget,clearAll]);
 return <Context.Provider value={value}>{children}</Context.Provider>;
}
export function useData(){const store=useContext(Context);if(!store)throw new Error('Missing DataProvider');return store}
export function formatMoney(paise:number){return new Intl.NumberFormat('en-IN',{style:'currency',currency:'INR',minimumFractionDigits:2,maximumFractionDigits:2}).format(paise/100)}
export function parseMoney(input:string){if(!/^\d+(\.\d{1,2})?$/.test(input.trim()))return null;const [whole,decimal='']=input.trim().split('.');const value=Number(whole)*100+Number(decimal.padEnd(2,'0'));return Number.isSafeInteger(value)&&value>0?value:null}
export function localDate(){const d=new Date();return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0')}
export function monthKey(date:string){return date.slice(0,7)}
export function monthly(expenses:Expense[],scope:Scope,month:string){return expenses.filter(e=>e.scope===scope&&monthKey(e.date)===month)}
export function total(expenses:Expense[]){return expenses.reduce((sum,e)=>sum+e.amountPaise,0)}
