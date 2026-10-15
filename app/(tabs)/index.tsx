import React,{useEffect,useMemo,useState} from 'react';
import {useFocusEffect,useRouter} from 'expo-router';
import {Alert,Pressable,Text,TextInput,View} from 'react-native';
import {Ionicons} from '@expo/vector-icons';
import {Screen} from '@/components/Screen';
import {AddExpenseButton} from '@/components/AddExpenseButton';
import {ScopeSwitch} from '@/components/UI';
import {MonthPicker} from '@/components/MonthPicker';
import {formatMoney,localDate,monthKey,useData} from '@/data';
import {useAppTheme} from '@/theme/ThemeContext';

export default function Home(){
 const {colors,scope}=useAppTheme();
 const {expenses,refresh,syncError,currentUserId,pendingCount,pendingEditCount,pendingIds,remove,demoEnabled}=useData();
 const router=useRouter();
 const [month,setMonth]=useState(monthKey(localDate()));
 const [search,setSearch]=useState('');
 const [showFilters,setShowFilters]=useState(false);
 const [categoryFilter,setCategoryFilter]=useState('All');
 const [contributor,setContributor]=useState<'all'|'me'|'partner'>('all');
 const [minAmount,setMinAmount]=useState('');
 const [maxAmount,setMaxAmount]=useState('');
 const [visibleCount,setVisibleCount]=useState(60);
 useEffect(()=>{setVisibleCount(60)},[scope,month,search,categoryFilter,contributor,minAmount,maxAmount]);

 useFocusEffect(React.useCallback(()=>{void refresh()},[refresh]));
 const options=useMemo(()=>['All',...Array.from(new Set(expenses.filter(e=>e.scope===scope).map(e=>e.category))).sort()], [expenses,scope]);
 const filtered=useMemo(()=>{
  const query=search.trim().toLocaleLowerCase();
  const min=minAmount.trim()?Number(minAmount)*100:null;
  const max=maxAmount.trim()?Number(maxAmount)*100:null;
  return expenses.filter(e=>{
   if(e.scope!==scope||monthKey(e.date)!==month)return false;
   if(query&&!([e.category,e.note,formatMoney(e.amountPaise),String(e.amountPaise/100)].join(' ').toLocaleLowerCase().includes(query)))return false;
   if(categoryFilter!=='All'&&e.category!==categoryFilter)return false;
   if(scope==='household'&&contributor!=='all'){
    const mine=e.ownerId==='local-user'||e.ownerId===currentUserId;
    if((contributor==='me')!==mine)return false;
   }
   if(min!==null&&Number.isFinite(min)&&e.amountPaise<min)return false;
   if(max!==null&&Number.isFinite(max)&&e.amountPaise>max)return false;
   return true;
  }).sort((a,b)=>b.date.localeCompare(a.date)||b.createdAt.localeCompare(a.createdAt));
 },[expenses,scope,month,search,categoryFilter,contributor,minAmount,maxAmount,currentUserId]);
 const visibleExpenses=useMemo(()=>filtered.slice(0,visibleCount),[filtered,visibleCount]);
 const groups=useMemo(()=>{
  const result:typeof filtered[]=[];
  visibleExpenses.forEach(e=>{
   const last=result[result.length-1];
   if(last&&last[0].date===e.date)last.push(e);
   else result.push([e]);
  });
  return result;
 },[visibleExpenses]);

 return <View style={{flex:1,backgroundColor:colors.background}}>
  <Screen style={{paddingHorizontal:0,gap:0}}>
   <View style={{paddingHorizontal:16,paddingBottom:8,gap:8}}>
    <ScopeSwitch/>
    {demoEnabled?<Text style={{fontSize:11,color:colors.muted,fontFamily:'Inter_500Medium'}}>DEMO DATA · Sample expenses are read-only</Text>:null}
    <MonthPicker month={month} onChange={setMonth}/>
    <View style={{flexDirection:'row',alignItems:'center',gap:8}}>
     <View style={{flex:1,flexDirection:'row',alignItems:'center',backgroundColor:colors.surface,borderWidth:1,borderColor:colors.border,borderRadius:11,paddingHorizontal:10}}>
      <Ionicons name="search-outline" color={colors.muted} size={18}/>
      <TextInput accessibilityLabel="Search expenses" value={search} onChangeText={setSearch} placeholder="Search expenses" placeholderTextColor={colors.muted}
       style={{flex:1,height:42,paddingHorizontal:8,color:colors.text,fontFamily:'Inter_400Regular',fontSize:14}}/>
      {search?<Pressable accessibilityLabel="Clear search" onPress={()=>setSearch('')}><Ionicons name="close-circle" color={colors.muted} size={18}/></Pressable>:null}
     </View>
     <Pressable accessibilityRole="button" accessibilityLabel="Expense filters" accessibilityState={{expanded:showFilters}} onPress={()=>setShowFilters(v=>!v)}
      style={{height:44,width:44,alignItems:'center',justifyContent:'center',backgroundColor:showFilters?colors.secondary:colors.surface,borderRadius:11,borderWidth:1,borderColor:colors.border}}>
      <Ionicons name="options-outline" size={21} color={colors.text}/>
     </Pressable>
    </View>
    {showFilters?<View style={{gap:9,paddingVertical:6}}>
     <Text style={{fontSize:12,color:colors.muted}}>Category</Text>
     <View style={{flexDirection:'row',flexWrap:'wrap',gap:6}}>
      {options.map(option=><Pressable key={option} onPress={()=>setCategoryFilter(option)}
       style={{paddingHorizontal:10,paddingVertical:7,borderRadius:9,backgroundColor:categoryFilter===option?colors.household:colors.secondary}}>
       <Text style={{color:categoryFilter===option?'#fff':colors.text,fontSize:12}}>{option}</Text>
      </Pressable>)}
     </View>
     {scope==='household'?<View style={{flexDirection:'row',alignItems:'center',gap:8}}>
      <Text style={{fontSize:12,color:colors.muted,marginRight:4}}>Added by</Text>
      {(['all','me','partner'] as const).map(v=><Pressable key={v} onPress={()=>setContributor(v)}
       style={{paddingHorizontal:11,paddingVertical:7,borderRadius:9,backgroundColor:contributor===v?colors.household:colors.secondary}}>
       <Text style={{color:contributor===v?'#fff':colors.text,fontSize:12}}>{v==='all'?'Everyone':v==='me'?'You':'Partner'}</Text>
      </Pressable>)}
     </View>:null}
     <View style={{flexDirection:'row',gap:8}}>
      {[{label:'Min ₹',value:minAmount,set:setMinAmount},{label:'Max ₹',value:maxAmount,set:setMaxAmount}].map(item=><TextInput key={item.label}
       accessibilityLabel={item.label} value={item.value} onChangeText={item.set} keyboardType="decimal-pad" placeholder={item.label} placeholderTextColor={colors.muted}
       style={{flex:1,height:40,borderRadius:9,borderWidth:1,borderColor:colors.border,paddingHorizontal:10,color:colors.text,backgroundColor:colors.surface}}/>)}
     </View>
     <Pressable accessibilityRole="button" onPress={()=>{setSearch('');setCategoryFilter('All');setContributor('all');setMinAmount('');setMaxAmount('')}}>
      <Text style={{fontSize:13,color:colors.household,fontWeight:'600'}}>Clear filters</Text>
     </Pressable>
    </View>:null}
   </View>
   {scope==='household'&&pendingCount>0?<Pressable onPress={()=>{void refresh()}} style={{paddingHorizontal:16,paddingVertical:9,backgroundColor:colors.secondary}}>
    <Text style={{color:colors.text,fontSize:12}}>{pendingCount} expense{pendingCount===1?'':'s'} waiting to sync · Tap to retry</Text>
   </Pressable>:null}
   {scope==='household'&&pendingEditCount>0?<Pressable onPress={()=>{void refresh()}} style={{paddingHorizontal:16,paddingVertical:9,backgroundColor:colors.secondary}}>
    <Text style={{color:colors.text,fontSize:12}}>{pendingEditCount} edit/delete change{pendingEditCount===1?'':'s'} waiting to sync · Tap to retry</Text>
   </Pressable>:null}
   {scope==='household'&&syncError?
    <Pressable onPress={()=>{void refresh()}} style={{paddingHorizontal:16,paddingVertical:10}}>
     <Text style={{color:'#C94F4F',fontSize:13}}>Sync failed · Tap to retry</Text>
    </Pressable>:null}
   {groups.length===0?
    <View style={{paddingVertical:28,alignItems:'center'}}>
     <Text style={{color:colors.muted,fontSize:14}}>No expenses for this month</Text>
    </View>:
    groups.map(group=>{
     const date=group[0].date;
     const parsed=new Date(date+'T12:00:00');
     const weekday=parsed.toLocaleDateString('en-IN',{weekday:'short'});
     return <View key={date}>
      <View style={{flexDirection:'row',alignItems:'center',gap:7,paddingHorizontal:12,paddingVertical:7,backgroundColor:colors.secondary,borderTopWidth:1,borderBottomWidth:1,borderColor:colors.border}}>
       <Text style={{fontSize:20,fontFamily:'PlusJakartaSans_700Bold',color:colors.text}}>{parsed.getDate()}</Text>
       <View style={{backgroundColor:colors.surface,borderRadius:5,paddingHorizontal:6,paddingVertical:2}}>
        <Text style={{fontSize:12,color:colors.muted,fontWeight:'600'}}>{weekday}</Text>
       </View>
      </View>
      {group.map(expense=><Pressable
       key={expense.id}
       accessibilityRole="button"
       accessibilityLabel={expense.category+', '+formatMoney(expense.amountPaise)}
       onPress={()=>{
        if(expense.id.startsWith('demo:')){Alert.alert('Demo expense','Sample records are read-only and are not shared with your partner. Disable them in Settings to view only real expenses.');return}
        router.push({pathname:'/expense/[id]',params:{id:expense.id}});
       }}
       style={{flexDirection:'row',alignItems:'center',paddingHorizontal:12,paddingVertical:9,gap:9,borderBottomWidth:1,borderColor:colors.border,minHeight:56}}>
       <Text numberOfLines={2} style={{width:88,color:colors.muted,fontSize:11,lineHeight:17}}>{expense.category}</Text>
       <View style={{flex:1,gap:2}}>
        <Text numberOfLines={2} style={{color:colors.text,fontSize:14,fontFamily:'Inter_500Medium'}}>{expense.note?.trim()||expense.category}</Text>
        {scope==='household'?
         <Text style={{color:colors.muted,fontSize:12}}>{expense.ownerId==='local-user'||expense.ownerId===currentUserId?'You':'Partner'}</Text>:null}
       </View>
       <View style={{alignItems:'flex-end',gap:3}}>
        <Text style={{color:'#F25B59',fontSize:15,fontWeight:'500',textAlign:'right'}}>{formatMoney(expense.amountPaise)}</Text>
        {pendingIds.includes(expense.id)?<Text style={{color:colors.muted,fontSize:10}}>Waiting to sync</Text>:null}
       </View>
      </Pressable>)}
     </View>;
    })
   }
   {filtered.length>visibleCount?<Pressable accessibilityRole="button" onPress={()=>setVisibleCount(count=>count+60)}
    style={{margin:12,padding:12,borderRadius:10,alignItems:'center',backgroundColor:colors.secondary}}>
    <Text style={{color:colors.text,fontSize:13,fontFamily:'Inter_600SemiBold'}}>Show more ({filtered.length-visibleCount} remaining)</Text>
   </Pressable>:null}
  </Screen>
  <AddExpenseButton/>
 </View>;
}
