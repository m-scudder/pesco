import {fontSizes,fontFamilies,fontWeights} from '@/theme/typography';
import React,{useCallback,useState} from 'react';
import {Alert,Pressable,Text,View} from 'react-native';
import {useFocusEffect,useRouter} from 'expo-router';
import {Ionicons} from '@expo/vector-icons';
import {Screen} from '@/components/Screen';
import {Body} from '@/components/UI';
import {useAppTheme} from '@/theme/ThemeContext';
import {useAuth} from '@/lib/AuthContext';
import {formatMoney,useData} from '@/data';
import {listHouseholdRecurring,toggleHouseholdRecurring,deleteHouseholdRecurring,generateHouseholdRecurring,type HouseholdRecurringRule} from '@/lib/householdRecurring';

type Scope='household'|'personal';
const ordinal=(day:number)=>day+(day%100>=11&&day%100<=13?'th':day%10===1?'st':day%10===2?'nd':day%10===3?'rd':'th');
export default function Recurring(){
 const router=useRouter();
 const {colors}=useAppTheme();
 const {household,refresh,recurringRules,setRecurringActive,deleteRecurring}=useData();
 const {user}=useAuth();
 const [scope,setScope]=useState<Scope>('personal');
 const [shared,setShared]=useState<HouseholdRecurringRule[]>([]);
 const [error,setError]=useState<string|null>(null);
 const reload=useCallback(async()=>{
  if(!household){setShared([]);return}
  try{await generateHouseholdRecurring(household.id);setShared(await listHouseholdRecurring(household.id));await refresh();setError(null)}
  catch(e){setError(e instanceof Error?e.message:'Could not sync recurring bills')}
 },[household?.id,refresh]);
 useFocusEffect(useCallback(()=>{void reload()},[reload]));
 const edit=(id?:string)=>router.push({pathname:'/recurring/edit',params:{scope,...(id?{id}:{})}});
 const items=scope==='household'?shared:recurringRules;
 const accent=scope==='household'?colors.household:colors.personal;
 return <View style={{flex:1,backgroundColor:colors.background}}>
  <Screen modal style={{gap:8,paddingBottom:100}}>
   <View style={{flexDirection:'row',padding:2,borderRadius:9,backgroundColor:colors.secondary}}>
    {(['household','personal'] as const).map(v=><Pressable key={v} accessibilityRole="button" accessibilityState={{selected:scope===v}} onPress={()=>setScope(v)}
     style={{flex:1,minHeight:34,alignItems:'center',justifyContent:'center',borderRadius:8,backgroundColor:scope===v?colors.surface:undefined}}>
     <Text style={{fontFamily:scope===v?'Inter_700Bold':'Inter_500Medium',color:scope===v?(v==='household'?colors.household:colors.personal):colors.muted,fontSize:fontSizes.caption}}>{v==='household'?'Household':'Personal'}</Text>
    </Pressable>)}
   </View>
   <Text style={{fontSize:fontSizes.caption,color:colors.muted}}>{scope==='household'?'Shared bills':'Private bills'}</Text>
   {scope==='household'&&!household?<View style={{paddingVertical:12}}><Body muted>Create or join a household to manage shared bills.</Body></View>:null}
   {items.length>0?<View style={{backgroundColor:colors.surface,borderColor:colors.border,borderWidth:1,borderRadius:10,overflow:'hidden'}}>
    {items.map((rule,index)=>{
     const sharedRule=scope==='household'?rule as HouseholdRecurringRule:null;
     const amount=sharedRule?sharedRule.amount_paise:(rule as typeof recurringRules[number]).amountPaise;
     const day=sharedRule?sharedRule.day_of_month:(rule as typeof recurringRules[number]).day;
     const mine=!sharedRule||sharedRule.created_by===user?.id;
     const title=rule.note||rule.category;
     const onDelete=()=>Alert.alert('Delete recurring bill?',title+' will stop repeating. Existing expenses remain.',[
      {text:'Cancel',style:'cancel'},
      {text:'Delete',style:'destructive',onPress:()=>{
       if(sharedRule&&household)void deleteHouseholdRecurring(household.id,rule.id).then(reload).catch(e=>Alert.alert('Could not delete',String(e)));
       else deleteRecurring(rule.id);
      }}
     ]);
     return <View key={rule.id} style={{flexDirection:'row',alignItems:'center',paddingLeft:12,paddingRight:8,minHeight:58,gap:8,borderBottomWidth:index===items.length-1?0:1,borderColor:colors.border}}>
      <Pressable accessibilityRole="button" disabled={!mine} onPress={()=>edit(rule.id)} style={{flex:1,gap:3,paddingVertical:8}}>
       <Text numberOfLines={1} style={{fontFamily:fontFamilies.semibold,fontSize:fontSizes.label,color:rule.active?colors.text:colors.muted}}>{title}</Text>
       <Text numberOfLines={1} style={{fontFamily:fontFamilies.regular,color:colors.muted,fontSize:fontSizes.caption}}>{rule.category} · {ordinal(day)} monthly{!rule.active?' · Paused':''}</Text>
      </Pressable>
      <View style={{alignItems:'flex-end',justifyContent:'center',gap:3}}>
       <Text style={{fontFamily:fontFamilies.medium,fontSize:fontSizes.label,color:colors.text}}>{formatMoney(amount)}</Text>
       <Text style={{fontFamily:fontFamilies.regular,fontSize:fontSizes.caption,color:colors.muted}}>{!mine?"Partner's bill":rule.active?'Active':'Paused'}</Text>
      </View>
      {mine?<Pressable accessibilityRole="button" accessibilityLabel={'Options for '+title} onPress={()=>Alert.alert(title,'Manage recurring bill',[
       {text:'Edit',onPress:()=>edit(rule.id)},
       {text:rule.active?'Pause':'Resume',onPress:()=>{
        const value=!rule.active;
        if(sharedRule&&household)void toggleHouseholdRecurring(household.id,rule.id,value).then(reload).catch(e=>Alert.alert('Could not update',String(e)));
        else setRecurringActive(rule.id,value);
       }},
       {text:'Delete',style:'destructive',onPress:onDelete},
       {text:'Cancel',style:'cancel'}
      ])} style={{width:34,height:44,alignItems:'center',justifyContent:'center'}}>
       <Ionicons name="ellipsis-horizontal" color={colors.muted} size={18}/>
      </Pressable>:null}
     </View>
    })}
   </View>:<View style={{alignItems:'center',paddingVertical:22}}><Text style={{color:colors.muted,fontSize:fontSizes.label}}>No recurring bills yet</Text></View>}
   {error?<Pressable accessibilityRole="button" onPress={()=>{void reload()}}><Text style={{color:'#C94F4F',fontSize:fontSizes.label}}>Could not sync bills · Retry</Text></Pressable>:null}
  </Screen>
  {!(scope==='household'&&!household)?<Pressable accessibilityRole="button" accessibilityLabel="Add recurring bill" onPress={()=>edit()}
   style={{position:'absolute',right:20,bottom:28,width:50,height:50,borderRadius:25,backgroundColor:accent,alignItems:'center',justifyContent:'center',shadowColor:'#000',shadowOpacity:0.18,shadowRadius:8,shadowOffset:{width:0,height:3},elevation:5}}>
   <Ionicons name="add" size={25} color="#fff"/>
  </Pressable>:null}
 </View>;
}
