import React from 'react';
import {Alert,Pressable,Text,View} from 'react-native';
import {Screen} from '@/components/Screen';
import {formatMoney,useData} from '@/data';
import {useAppTheme} from '@/theme/ThemeContext';
import {Ionicons} from '@expo/vector-icons';

export default function PendingUploads(){
 const {colors}=useAppTheme();
 const {pendingEntries,household,syncing,syncError,refresh,remove}=useData();
 return <Screen modal style={{gap:13}}>
  <View style={{gap:5}}>
   <Text style={{color:colors.text,fontFamily:'Inter_600SemiBold',fontSize:16}}>
    {pendingEntries.length===0?'Everything is synced':pendingEntries.length+' expense'+(pendingEntries.length===1?'':'s')+' waiting to sync'}
   </Text>
   <Text style={{color:colors.muted,fontSize:13,lineHeight:19}}>
    Household expenses are saved on this device before upload. PESCO retries when connected. Never uninstall or clear app storage while uploads are pending.
   </Text>
  </View>
  <Pressable accessibilityRole="button" disabled={syncing} onPress={()=>{void refresh()}}
   style={{borderRadius:11,backgroundColor:colors.household,padding:13,alignItems:'center',opacity:syncing?0.6:1}}>
   <Text style={{color:'#fff',fontFamily:'Inter_600SemiBold'}}>{syncing?'Syncing…':'Retry pending uploads'}</Text>
  </Pressable>
  {syncError?<Text style={{color:'#C94F4F',fontSize:12}}>{syncError}</Text>:null}
  {pendingEntries.map(entry=>{
   const oldHousehold=entry.draft.householdId!==household?.id;
   return <View key={entry.id} style={{backgroundColor:colors.surface,borderColor:colors.border,borderWidth:1,borderRadius:13,padding:13,gap:6}}>
    <View style={{flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:12}}>
     <Text numberOfLines={2} style={{flex:1,color:colors.text,fontSize:15,fontFamily:'Inter_600SemiBold'}}>{entry.draft.note||entry.draft.category}</Text>
     <Text style={{color:colors.text,fontSize:15}}>{formatMoney(entry.draft.amountPaise)}</Text>
    </View>
    <Text style={{color:colors.muted,fontSize:12}}>{entry.draft.category} · {entry.draft.date}</Text>
    {oldHousehold?<Text style={{color:'#C94F4F',fontSize:12}}>From a previous household — will not upload to your current household</Text>:
     <View style={{flexDirection:'row',alignItems:'center',gap:5}}>
      <Ionicons name="time-outline" size={13} color={colors.muted}/>
      <Text style={{color:colors.muted,fontSize:12}}>Waiting to sync</Text>
     </View>}
    <Pressable accessibilityRole="button" onPress={()=>Alert.alert('Discard unsynced expense?','This removes the local pending copy. It cannot be restored.',[
     {text:'Keep',style:'cancel'},
     {text:'Discard',style:'destructive',onPress:()=>{void remove(entry.id).catch(e=>Alert.alert('Cannot discard',e instanceof Error?e.message:'Try again'))}}
    ])} style={{paddingVertical:7,alignSelf:'flex-start'}}>
     <Text style={{color:'#C94F4F',fontSize:13}}>Discard pending expense</Text>
    </Pressable>
   </View>
  })}
 </Screen>;
}
