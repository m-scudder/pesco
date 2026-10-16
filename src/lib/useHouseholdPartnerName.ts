import {useCallback,useState} from 'react';
import {useFocusEffect} from 'expo-router';
import {getHouseholdMembers} from '@/lib/households';
import {useData} from '@/data';

/** Display the other household member's configured nickname, with a safe fallback. */
export function useHouseholdPartnerName(){
 const {household,currentUserId}=useData();
 const [name,setName]=useState('Partner');
 const householdId=household?.id;
 useFocusEffect(useCallback(()=>{
  let active=true;
  if(!householdId||!currentUserId){setName('Partner');return ()=>{active=false}}
  void getHouseholdMembers(householdId).then(members=>{
   if(!active)return;
   const other=members.find(member=>member.user_id!==currentUserId);
   const display=other?.display_name?.trim();
   setName(display&&display!=='Member'?display:'Partner');
  }).catch(()=>{if(active)setName('Partner')});
  return ()=>{active=false};
 },[householdId,currentUserId]));
 return name;
}
