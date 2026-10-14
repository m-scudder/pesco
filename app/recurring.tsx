import React,{useCallback,useState} from 'react';
import {Alert,Pressable,Switch,Text,View} from 'react-native';
import {useFocusEffect,useRouter} from 'expo-router';
import {Ionicons} from '@expo/vector-icons';
import {Screen} from '@/components/Screen';
import {Body,Card} from '@/components/UI';
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
  <Screen modal style={{gap:10,paddingBottom:110}}>
   <View style={{flexDirection:'row',padding:3,borderRadius:11,backgroundColor:colors.secondary}}>
    {(['household','personal'] as const).map(v=><Pressable key={v} accessibilityRole="button" accessibilityState={{selected:scope===v}} onPress={()=>setScope(v)}
     style={{flex:1,minHeight:37,alignItems:'center',justifyContent:'center',borderRadius:8,backgroundColor:scope===v?colors.surface:undefined}}>
     <Text style={{fontFamily:scope===v?'Inter_700Bold':'Inter_500Medium',color:scope===v?(v==='household'?colors.household:colors.personal):colors.muted,fontSize:13}}>{v==='household'?'Household':'Personal'}</Text>
    </Pressable>)}
   </View>
   <Text style={{fontSize:12,color:colors.muted}}>{scope==='household'?'Shared with your household':'Only visible on this device'}</Text>
   {scope==='household'&&!household?<Card><Body muted>Create or join a household to manage shared bills.</Body></Card>:null}
   {items.length>0?<View style={{backgroundColor:colors.surface,borderColor:colors.border,borderWidth:1,borderRadius:12,overflow:'hidden'}}>
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
     return <View key={rule.id} style={{flexDirection:'row',alignItems:'center',paddingLeft:13,paddingRight:8,minHeight:66,gap:10,borderBottomWidth:index===items.length-1?0:1,borderColor:colors.border}}>
      <Pressable accessibilityRole="button" disabled={!mine} onPress={()=>edit(rule.id)} style={{flex:1,gap:4,paddingVertical:10}}>
       <Text numberOfLines={1} style={{fontFamily:'Inter_600SemiBold',fontSize:14,color:rule.active?colors.text:colors.muted}}>{title}</Text>
       <Text numberOfLines={1} style={{fontFamily:'Inter_400Regular',color:colors.muted,fontSize:11}}>{rule.category} · {ordinal(day)} monthly{!rule.active?' · Paused':''}</Text>
      </Pressable>
      <View style={{alignItems:'flex-end',justifyContent:'center',gap:4}}>
       <Text style={{fontFamily:'Inter_600SemiBold',fontSize:14,color:colors.text}}>{formatMoney(amount)}</Text>
       {!mine?<Text style={{fontSize:10,color:colors.muted}}>Partner's bill</Text>:null}
      </View>
      {mine?<View style={{flexDirection:'row',alignItems:'center',justifyContent:'center',gap:2}}>
       <Switch accessibilityLabel={'Active '+title} value={rule.active} style={{transform:[{scaleX:0.77},{scaleY:0.77}]}}
        onValueChange={value=>{
         if(sharedRule&&household)void toggleHouseholdRecurring(household.id,rule.id,value).then(reload).catch(e=>Alert.alert('Could not update',String(e)));
         else setRecurringActive(rule.id,value);
        }} trackColor={{false:colors.border,true:colors.household}}/>
       <Pressable accessibilityRole="button" accessibilityLabel={'Options for '+title} onPress={()=>Alert.alert(title,'Manage recurring bill',[
        {text:'Edit',onPress:()=>edit(rule.id)},
        {text:'Delete',style:'destructive',onPress:onDelete},
        {text:'Cancel',style:'cancel'}
       ])} style={{width:32,height:42,alignItems:'center',justifyContent:'center'}}>
        <Ionicons name="ellipsis-vertical" color={colors.muted} size={18}/>
       </Pressable>
      </View>:null}
     </View>
    })}
   </View>:<View style={{alignItems:'center',paddingVertical:22}}><Text style={{color:colors.muted,fontSize:13}}>No recurring bills yet</Text></View>}
   {error?<Pressable accessibilityRole="button" onPress={()=>{void reload()}}><Text style={{color:'#C94F4F',fontSize:13}}>Could not sync bills · Retry</Text></Pressable>:null}
  </Screen>
  {!(scope==='household'&&!household)?<Pressable accessibilityRole="button" accessibilityLabel="Add recurring bill" onPress={()=>edit()}
   style={{position:'absolute',right:20,bottom:28,width:54,height:54,borderRadius:27,backgroundColor:accent,alignItems:'center',justifyContent:'center',shadowColor:'#000',shadowOpacity:0.18,shadowRadius:8,shadowOffset:{width:0,height:3},elevation:5}}>
   <Ionicons name="add" size={29} color="#fff"/>
  </Pressable>:null}
 </View>;
}
