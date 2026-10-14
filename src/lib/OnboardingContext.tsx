import React,{createContext,useContext,useEffect,useMemo,useState} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY='pesco:onboarding-completed:v1';
type OnboardingState={ready:boolean;complete:boolean;finish:()=>Promise<void>};
const Context=createContext<OnboardingState|null>(null);

export function OnboardingProvider({children}:{children:React.ReactNode}){
 const [ready,setReady]=useState(false);
 const [complete,setComplete]=useState(false);
 useEffect(()=>{let alive=true;AsyncStorage.getItem(KEY).then(value=>{
  if(alive)setComplete(value==='yes');
 }).catch(error=>console.warn('Onboarding state load failed',error)).finally(()=>{if(alive)setReady(true)});
 return()=>{alive=false}},[]);
 const value=useMemo<OnboardingState>(()=>({ready,complete,finish:async()=>{
  await AsyncStorage.setItem(KEY,'yes');
  setComplete(true);
 }}),[ready,complete]);
 return <Context.Provider value={value}>{children}</Context.Provider>;
}
export function useOnboarding(){const context=useContext(Context);if(!context)throw new Error('OnboardingProvider missing');return context}
