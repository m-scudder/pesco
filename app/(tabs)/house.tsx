import {fontSizes,fontFamilies,fontWeights} from '@/theme/typography';
import React,{useEffect,useMemo,useState} from 'react';
import {Pressable,Text,View} from 'react-native';
import {Ionicons} from '@expo/vector-icons';
import {useFocusEffect,useRouter} from 'expo-router';
import {Screen} from '@/components/Screen';
import {Body,Card} from '@/components/UI';
import {MonthPicker} from '@/components/MonthPicker';
import {MonthSwipeView} from '@/components/MonthSwipeView';
import {formatMoney,localDate,monthKey,useData} from '@/data';
import {buildInsights} from '@/lib/insights';
import {useAppTheme} from '@/theme/ThemeContext';
import {supabase} from '@/lib/supabase';

export default function House(){
 const router=useRouter();
 const {colors}=useAppTheme();
 const {expenses,household,refresh,syncError,demoEnabled}=useData();
 const [month,setMonth]=useState(monthKey(localDate()));
 useFocusEffect(React.useCallback(()=>{void refresh()},[refresh]));
 const {spent,prior,difference,percentChange,selected,monthSeries}=useMemo(
  ()=>buildInsights(expenses,'household',month,null),[expenses,month]);
 const [budget,setBudget]=useState<number|null>(null);
 const householdId=household?.id;
 useEffect(()=>{
  if(!householdId||!supabase){setBudget(null);return}
  const db=supabase;
  let active=true;
  const load=async()=>{
   const {data,error}=await db.from('household_budgets').select('amount_paise').eq('household_id',householdId).maybeSingle();
   if(active&&!error)setBudget(data?Number(data.amount_paise):null);
  };
  void load();
  const channel=db.channel('house-budget-summary-'+householdId).on('postgres_changes',{event:'*',schema:'public',table:'household_budgets',filter:'household_id=eq.'+householdId},()=>{void load()}).subscribe();
  return()=>{active=false;void db.removeChannel(channel)};
 },[householdId]);
 const accent=colors.household;
 const maxMonth=Math.max(1,...monthSeries.map(m=>m.amount));
 if(!household)return <View style={{flex:1,backgroundColor:colors.background,alignItems:'center',justifyContent:'center',paddingHorizontal:24}}>
  <View style={{alignItems:'center',gap:14,width:'100%',maxWidth:360}}>
   <View style={{width:64,height:64,borderRadius:18,backgroundColor:colors.secondary,alignItems:'center',justifyContent:'center'}}>
    <Ionicons name="home-outline" size={30} color={colors.household}/>
   </View>
   <Text style={{fontFamily:fontFamilies.displayBold,fontSize:fontSizes.title,color:colors.text,textAlign:'center'}}>Your household starts here</Text>
   <Text style={{fontFamily:fontFamilies.regular,fontSize:fontSizes.body,lineHeight:21,color:colors.muted,textAlign:'center'}}>Join a household or create your own.</Text>
   <Pressable accessibilityRole="button" onPress={()=>router.push('/household')} style={{marginTop:8,minHeight:46,width:'100%',backgroundColor:colors.household,borderRadius:10,alignItems:'center',justifyContent:'center'}}>
    <Text style={{fontFamily:fontFamilies.semibold,fontSize:fontSizes.body,color:'#FFFFFF'}}>Create or Join Household</Text>
   </Pressable>
  </View>
 </View>;
 return <MonthSwipeView month={month} onChange={setMonth}><Screen style={{gap:12}}>
  <MonthPicker month={month} onChange={setMonth}/>
  {demoEnabled?<Text style={{color:colors.muted,fontSize:fontSizes.caption,fontFamily:fontFamilies.medium}}>DEMO DATA · Includes read-only sample expenses</Text>:null}
  {syncError?<Pressable onPress={()=>{void refresh()}}>
   <Text style={{fontSize:fontSizes.caption,color:'#C94F4F'}}>Unable to refresh shared expenses · Retry</Text>
  </Pressable>:null}
  <Card>
   <Body muted>Household spending</Body>
   <Text style={{color:colors.text,fontSize:fontSizes.summary,fontFamily:fontFamilies.displayBold}}>{formatMoney(spent)}</Text>
   <View style={{flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:8,flexWrap:'wrap'}}>
    <Text style={{fontSize:fontSizes.caption,color:colors.muted}}>{selected.length} {selected.length===1?'expense':'expenses'}</Text>
    {prior>0?<View style={{flexDirection:'row',alignItems:'center',gap:4}}>
     {difference!==0?<Ionicons name={difference>0?'arrow-up':'arrow-down'} size={14} color={difference>0?'#D94B4B':'#259A63'}/>:null}
     <Text style={{fontSize:fontSizes.caption,color:difference===0?colors.muted:difference>0?'#D94B4B':'#259A63',fontFamily:fontFamilies.medium}}>
      {difference===0?'Unchanged':`${percentChange}% ${difference>0?'more':'less'} vs last month`}
     </Text>
    </View>:null}
   </View>
   {budget!==null&&budget>0?<Pressable accessibilityRole="button" accessibilityLabel="Manage household budget" onPress={()=>router.push('/budget')}
    style={{paddingTop:10,borderTopWidth:1,borderColor:colors.border,flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:8}}>
    <Text style={{fontSize:fontSizes.caption,color:colors.muted}}>Monthly budget · {formatMoney(budget)}</Text>
    <Text style={{fontSize:fontSizes.caption,fontFamily:fontFamilies.medium,color:spent>budget?'#D94B4B':colors.muted}}>
     {spent>budget?formatMoney(spent-budget)+' over':formatMoney(budget-spent)+' left'}
    </Text>
   </Pressable>:<Pressable onPress={()=>router.push('/budget')}>
    <Text style={{fontSize:fontSizes.caption,color:accent}}>Set household budget ›</Text>
   </Pressable>}
  </Card>
  <Text style={{color:colors.text,fontSize:fontSizes.body,fontFamily:fontFamilies.semibold}}>Monthly trend</Text>
  <Card>
   <View style={{height:125,flexDirection:'row',alignItems:'flex-end',gap:8}}>
    {monthSeries.map(item=><View key={item.key} style={{flex:1,height:'100%',justifyContent:'flex-end',alignItems:'center',gap:5}}>
     <Text numberOfLines={1} style={{fontSize:fontSizes.caption,color:colors.muted}}>
      {item.amount===maxMonth&&item.amount>0?formatMoney(item.amount).replace(/\.00$/,''):''}
     </Text>
     <View style={{width:'72%',height:item.amount?Math.max(4,Math.round(item.amount/maxMonth*78)):3,
      borderRadius:4,backgroundColor:item.amount?(item.selected?accent:colors.muted):colors.secondary,opacity:item.selected?1:0.65}}/>
     <Text style={{fontSize:fontSizes.caption,color:item.selected?colors.text:colors.muted,fontWeight:item.selected?fontWeights.bold:fontWeights.regular}}>{item.label}</Text>
    </View>)}
   </View>
  </Card>
 </Screen></MonthSwipeView>;
}
