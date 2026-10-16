import {useState} from 'react';
import {Alert} from 'react-native';
import {useRouter} from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {useData} from '@/data';
import {useAuth} from '@/lib/AuthContext';
import {supabase} from '@/lib/supabase';

export function useAccountActions(){
 const router=useRouter();
 const {pendingCount,pendingEditCount,expenses,clearAll}=useData();
 const {user}=useAuth();
 const [loggingOut,setLoggingOut]=useState(false);
 const [deleting,setDeleting]=useState(false);
 const busy=loggingOut||deleting;
 const logout=()=>{
  if(busy)return;
  if(pendingCount+pendingEditCount>0){
   Alert.alert('Unsynced changes','Please sync or discard pending household changes before logging out.');
   return;
  }
  if(expenses.some(x=>x.scope==='personal'&&x.ownerId==='local-user')){
   Alert.alert('Personal backup pending','Wait for personal expenses to finish syncing before logging out.');
   return;
  }
  Alert.alert('Log Out?','Your saved budgets and recurring bills will be kept for your next sign-in on this device.',[
   {text:'Cancel',style:'cancel'},
   {text:'Log Out',onPress:()=>{void (async()=>{
    if(!supabase)return;
    setLoggingOut(true);
    try{
     const {error}=await supabase.auth.signOut({scope:'local'});
     if(error)throw error;
     // The data provider clears only in-memory state on auth change.
     // Account-scoped local preferences must survive sign-out.
     router.replace('/onboarding');
    }catch(e){Alert.alert('Could Not Log Out',e instanceof Error?e.message:'Please try again')}
    finally{setLoggingOut(false)}
   })()}}
  ]);
 };
 const deleteAccount=()=>Alert.alert('Delete your PESCO account?','This permanently deletes your account and your expenses. If you own a shared household, ownership will pass to your partner when possible. This cannot be undone.',[
  {text:'Cancel',style:'cancel'},
  {text:'Continue',style:'destructive',onPress:()=>Alert.alert('Final confirmation','Delete account and associated data permanently?',[
   {text:'Keep account',style:'cancel'},
   {text:'Delete permanently',style:'destructive',onPress:()=>{void (async()=>{
    if(!supabase||!user)return;
    if(pendingCount+pendingEditCount>0){Alert.alert('Pending changes','Sync or discard pending changes before deleting your account.');return}
    setDeleting(true);
    try{
     const {data,error:requestError}=await supabase.functions.invoke('delete-account',{method:'POST'});
     if(requestError||!data?.deleted)throw requestError??new Error('Deletion was not confirmed');
     clearAll();
     await supabase.auth.signOut({scope:'local'}).catch(()=>{});
     await AsyncStorage.clear();
     router.replace('/onboarding');
    }catch(e){Alert.alert('Could not delete account',e instanceof Error?e.message:'Please retry. Your account was not confirmed deleted.')}
    finally{setDeleting(false)}
   })()}}
  ])}
 ]);

 return {logout,deleteAccount,loggingOut,deleting};
}
