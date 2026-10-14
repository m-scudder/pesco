import React, {createContext,useContext,useEffect,useMemo,useState} from 'react';
import {useColorScheme} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {Appearance,palette,Scope} from './palette';

type AppTheme={
 appearance:Appearance;
 setAppearance:(value:Appearance)=>void;
 scope:Scope;
 setScope:(value:Scope)=>void;
 colors:typeof palette.light|typeof palette.dark;
 resolved:'light'|'dark';
};
const KEY='pesco:appearance:v1';
const Context=createContext<AppTheme|null>(null);
export function ThemeProvider({children}:{children:React.ReactNode}){
 const deviceScheme=useColorScheme();
 const [appearance,setAppearance]=useState<Appearance>('system');
 const [preferenceLoaded,setPreferenceLoaded]=useState(false);
 const [scope,setScope]=useState<Scope>('household');

 useEffect(()=>{
  let active=true;
  AsyncStorage.getItem(KEY).then(value=>{
   if(active&&(value==='light'||value==='dark'||value==='system'))setAppearance(value);
  }).catch(error=>console.warn('Unable to load appearance preference',error))
   .finally(()=>{if(active)setPreferenceLoaded(true)});
  return()=>{active=false};
 },[]);
 useEffect(()=>{
  if(!preferenceLoaded)return;
  AsyncStorage.setItem(KEY,appearance).catch(error=>console.warn('Unable to save appearance preference',error));
 },[appearance,preferenceLoaded]);

 const resolved=appearance==='system'?(deviceScheme==='dark'?'dark':'light'):appearance;
 const value=useMemo(()=>({appearance,setAppearance,scope,setScope,colors:palette[resolved],resolved}),[appearance,scope,resolved]);
 return <Context.Provider value={value}>{children}</Context.Provider>;
}
export function useAppTheme(){
 const context=useContext(Context);
 if(!context)throw new Error('useAppTheme requires ThemeProvider');
 return context;
}
