import {useState} from 'react';
import {Alert} from 'react-native';
import {useRouter} from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {useData} from '@/data';
import {useAuth} from '@/lib/AuthContext';
import {supabase} from '@/lib/supabase';

export function useAccountActions(){
 const router=useRouter();
 const {pendingCount,pendingEditCount,expenses,recurringRules,budgets,clearAll}=useData();
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
  const hasLocalData=expenses.some(x=>x.scope==='personal'||(x.scope==='household'&&x.ownerId==='local-user'))||
   recurringRules.length>0||budgets.household!==null||budgets.personal!==null;
  Alert.alert('Log out of PESCO?',hasLocalData
   ?'Personal expenses, local budgets and recurring rules are stored only on this device. Logging out will erase these device-only records. Shared cloud expenses will remain. Export anything you need first.'
   :'You will need to sign in with Google again. Your shared household expenses stay in the cloud.',[
   {text:'Cancel',style:'cancel'},
   {text:hasLocalData?'Erase local data & log out':'Log out',style:hasLocalData?'destructive':'default',onPress:()=>{void (async()=>{
    if(!supabase)return;
    setLoggingOut(true);
    try{
     const {error}=await supabase.auth.signOut({scope:'local'});
     if(error)throw error;
     clearAll();
     // User-scoped queue/cache data remains inaccessible after logout; remove private local categories.
     await AsyncStorage.removeItem('pesco:personal-categories:v1');
     router.replace('/onboarding');
    }catch(e){Alert.alert('Could not log out',e instanceof Error?e.message:'Please try again')}
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
