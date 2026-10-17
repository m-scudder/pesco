import {useCallback,useState} from 'react';
import {useFocusEffect} from 'expo-router';
import {getHouseholdMembers} from '@/lib/households';
import {useData} from '@/data';

/** Household nickname lookup keyed by the expense owner's user ID. */
export function useHouseholdMemberNames(){
 const {household,currentUserId}=useData();
 const [names,setNames]=useState<Record<string,string>>({});
 useFocusEffect(useCallback(()=>{
  let active=true;
  if(!household?.id||!currentUserId){setNames({});return ()=>{active=false}}
  void getHouseholdMembers(household.id).then(members=>{
   if(!active)return;
   setNames(Object.fromEntries(members.map(member=>[
    member.user_id,
    member.user_id===currentUserId?'You':
     member.display_name.trim()&&member.display_name!=='Member'?member.display_name:'Member'
   ])));
  }).catch(()=>{if(active)setNames({})});
  return ()=>{active=false};
 },[household?.id,currentUserId]));
 return names;
}

/** Legacy two-person fallback for interface labels, not transaction ownership. */
export function useHouseholdPartnerName(){
 const {currentUserId}=useData();
 const names=useHouseholdMemberNames();
 const others=Object.entries(names).filter(([id])=>id!==currentUserId);
 return others.length===1?others[0][1]:others.length>1?'Others':'Member';
}
