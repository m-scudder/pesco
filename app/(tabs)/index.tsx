import {fontSizes,fontFamilies,fontWeights} from '@/theme/typography';
import React,{useEffect,useMemo,useState} from 'react';
import {useRouter} from 'expo-router';
import {Alert,Keyboard,Modal,Pressable,ScrollView,Text,TextInput,View} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {Ionicons} from '@expo/vector-icons';
import {Screen} from '@/components/Screen';
import {AddExpenseButton} from '@/components/AddExpenseButton';
import {ScopeSwitch} from '@/components/UI';
import {MonthPicker} from '@/components/MonthPicker';
import {MonthSwipeView} from '@/components/MonthSwipeView';
import {formatMoney,localDate,monthKey,useData} from '@/data';
import {useAppTheme} from '@/theme/ThemeContext';
import {useHouseholdMemberNames} from '@/lib/useHouseholdPartnerName';

export default function Home(){
 const {colors,scope}=useAppTheme();
 const {expenses,syncError,currentUserId,demoEnabled}=useData();
 const router=useRouter();
 const memberNames=useHouseholdMemberNames();
 const insets=useSafeAreaInsets();
 const [month,setMonth]=useState(monthKey(localDate()));
 const [search,setSearch]=useState('');
 const [showFilters,setShowFilters]=useState(false);
 const [categoryFilter,setCategoryFilter]=useState('All');
 const [contributor,setContributor]=useState<'all'|'me'|'partner'>('all');
 const [minAmount,setMinAmount]=useState('');
 const [maxAmount,setMaxAmount]=useState('');
 const [visibleCount,setVisibleCount]=useState(60);
 const [draftCategory,setDraftCategory]=useState('All');
 const [draftContributor,setDraftContributor]=useState<'all'|'me'|'partner'>('all');
 const [draftMin,setDraftMin]=useState('');
 const [draftMax,setDraftMax]=useState('');
 const activeFilterCount=Number(categoryFilter!=='All')+Number(scope==='household'&&contributor!=='all')+Number(Boolean(minAmount))+Number(Boolean(maxAmount));
 const openFilters=()=>{setDraftCategory(categoryFilter);setDraftContributor(contributor);setDraftMin(minAmount);setDraftMax(maxAmount);setShowFilters(true)};
 const applyFilters=()=>{setCategoryFilter(draftCategory);setContributor(draftContributor);setMinAmount(draftMin);setMaxAmount(draftMax);Keyboard.dismiss();setShowFilters(false)};
 const resetFilters=()=>{setDraftCategory('All');setDraftContributor('all');setDraftMin('');setDraftMax('')};
 useEffect(()=>{setVisibleCount(60)},[scope,month,search,categoryFilter,contributor,minAmount,maxAmount]);

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

 return <MonthSwipeView month={month} onChange={setMonth}><View style={{flex:1,backgroundColor:colors.background}}>
  <Screen style={{paddingHorizontal:0,gap:0}}>
   <View style={{paddingHorizontal:16,paddingBottom:8,gap:8}}>
    <ScopeSwitch/>
    {demoEnabled?<Text style={{fontSize:fontSizes.caption,color:colors.muted,fontFamily:fontFamilies.medium}}>DEMO DATA · Sample expenses are read-only</Text>:null}
    <MonthPicker month={month} onChange={setMonth}/>
    <View style={{flexDirection:'row',alignItems:'center',gap:8}}>
     <View style={{flex:1,flexDirection:'row',alignItems:'center',backgroundColor:colors.surface,borderWidth:1,borderColor:colors.border,borderRadius:11,paddingHorizontal:10}}>
      <Ionicons name="search-outline" color={colors.muted} size={18}/>
      <TextInput accessibilityLabel="Search expenses" value={search} onChangeText={setSearch} placeholder="Search expenses" placeholderTextColor={colors.muted}
       style={{flex:1,height:42,paddingHorizontal:8,color:colors.text,fontFamily:fontFamilies.regular,fontSize:fontSizes.body}}/>
      {search?<Pressable accessibilityLabel="Clear search" onPress={()=>setSearch('')}><Ionicons name="close-circle" color={colors.muted} size={18}/></Pressable>:null}
     </View>
     <Pressable accessibilityRole="button" accessibilityLabel="Expense filters" accessibilityState={{expanded:showFilters}} onPress={openFilters}
      style={{height:44,width:44,alignItems:'center',justifyContent:'center',backgroundColor:activeFilterCount?colors.secondary:colors.surface,borderRadius:11,borderWidth:1,borderColor:colors.border}}>
      <Ionicons name="options-outline" size={21} color={activeFilterCount?colors.household:colors.text}/>
      {activeFilterCount>0?<View style={{position:"absolute",right:3,top:3,width:7,height:7,borderRadius:4,backgroundColor:colors.household}}/>:null}
     </Pressable>
    </View>
    {activeFilterCount>0?<Pressable accessibilityRole="button" accessibilityLabel="Edit active filters" onPress={openFilters} style={{alignSelf:'flex-start',paddingVertical:5,flexDirection:'row',alignItems:'center',gap:6}}>
     <Ionicons name="funnel-outline" size={13} color={colors.household}/>
     <Text style={{fontSize:fontSizes.caption,color:colors.household}}>{activeFilterCount} active {activeFilterCount===1?'filter':'filters'} · Edit</Text>
    </Pressable>:null}
   </View>
   {scope==='household'&&syncError?<Text accessibilityRole="alert" style={{color:'#C94F4F',fontSize:fontSizes.caption,paddingHorizontal:16,paddingVertical:6}}>Unable to sync. Open Pending uploads in Settings for details.</Text>:null}
   {groups.length===0?
    <View style={{paddingVertical:28,alignItems:'center'}}>
     <Text style={{color:colors.muted,fontSize:fontSizes.body}}>No expenses for this month</Text>
    </View>:
    groups.map(group=>{
     const date=group[0].date;
     const parsed=new Date(date+'T12:00:00');
     const weekday=parsed.toLocaleDateString('en-IN',{weekday:'short'});
     return <View key={date}>
      <View style={{flexDirection:'row',alignItems:'center',gap:7,paddingHorizontal:12,paddingVertical:7,backgroundColor:colors.secondary,borderTopWidth:1,borderBottomWidth:1,borderColor:colors.border}}>
       <Text style={{fontSize:fontSizes.title,fontFamily:fontFamilies.displayBold,color:colors.text}}>{parsed.getDate()}</Text>
       <View style={{backgroundColor:colors.surface,borderRadius:5,paddingHorizontal:6,paddingVertical:2}}>
        <Text style={{fontSize:fontSizes.caption,color:colors.muted,fontWeight:fontWeights.semibold}}>{weekday}</Text>
       </View>
      </View>
      {group.map(expense=><Pressable
       key={expense.id}
       accessibilityRole="button"
       accessibilityLabel={expense.category+', '+formatMoney(expense.amountPaise)}
       onPress={()=>{
        if(expense.id.startsWith('demo:')){Alert.alert('Demo expense','Sample records are read-only and are not shared with other household members. Disable them in Settings to view only real expenses.');return}
        const mine=expense.ownerId==='local-user'||expense.ownerId===currentUserId;
        router.push(mine?{pathname:'/expense/new',params:{id:expense.id}}:{pathname:'/expense/[id]',params:{id:expense.id}});
       }}
       style={{flexDirection:'row',alignItems:'center',paddingHorizontal:12,paddingVertical:9,gap:9,borderBottomWidth:1,borderColor:colors.border,minHeight:56}}>
       <Text numberOfLines={2} style={{width:88,color:colors.muted,fontSize:fontSizes.caption,lineHeight:17}}>{expense.category}</Text>
       <View style={{flex:1,gap:2}}>
        <Text numberOfLines={2} style={{color:colors.text,fontSize:fontSizes.body,fontFamily:fontFamilies.medium}}>{expense.note?.trim()||expense.category}</Text>
        {scope==='household'?
         <Text style={{color:colors.muted,fontSize:fontSizes.caption}}>{expense.ownerId==='local-user'||expense.ownerId===currentUserId?'You':(memberNames[expense.ownerId]??'Member')}</Text>:null}
       </View>
       <View style={{alignItems:'flex-end',gap:3}}>
        <Text style={{color:'#F25B59',fontSize:fontSizes.input,fontWeight:fontWeights.medium,textAlign:'right'}}>{formatMoney(expense.amountPaise)}</Text>
       </View>
      </Pressable>)}
     </View>;
    })
   }
   {filtered.length>visibleCount?<Pressable accessibilityRole="button" onPress={()=>setVisibleCount(count=>count+60)}
    style={{margin:12,padding:12,borderRadius:10,alignItems:'center',backgroundColor:colors.secondary}}>
    <Text style={{color:colors.text,fontSize:fontSizes.label,fontFamily:fontFamilies.semibold}}>Show more ({filtered.length-visibleCount} remaining)</Text>
   </Pressable>:null}
  </Screen>
  <Modal visible={showFilters} transparent animationType="slide" presentationStyle="overFullScreen" onRequestClose={()=>setShowFilters(false)}>
   <View style={{flex:1,justifyContent:'flex-end',backgroundColor:'rgba(0,0,0,0.50)'}}>
    <Pressable accessibilityRole="button" accessibilityLabel="Dismiss filters" onPress={()=>setShowFilters(false)} style={{flex:1}}/>
    <View style={{backgroundColor:colors.surface,borderTopLeftRadius:20,borderTopRightRadius:20,paddingTop:14,paddingBottom:Math.max(insets.bottom,16),maxHeight:'85%'}}>
     <View style={{flexDirection:'row',alignItems:'center',justifyContent:'space-between',paddingHorizontal:20,paddingBottom:12,borderBottomWidth:1,borderColor:colors.border}}>
      <Text style={{fontSize:fontSizes.section,fontFamily:fontFamilies.displayBold,color:colors.text}}>Filter expenses</Text>
      <Pressable accessibilityRole="button" accessibilityLabel="Close filters" onPress={()=>setShowFilters(false)} style={{padding:7}}><Ionicons name="close" size={22} color={colors.muted}/></Pressable>
     </View>
     <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{paddingHorizontal:20,paddingTop:18,paddingBottom:18,gap:18}}>
      <View style={{gap:9}}>
       <Text style={{fontSize:fontSizes.label,fontFamily:fontFamilies.semibold,color:colors.text}}>Category</Text>
       <View style={{flexDirection:'row',flexWrap:'wrap',gap:8}}>
        {options.map(option=><Pressable key={option} accessibilityRole="button" accessibilityState={{selected:draftCategory===option}} onPress={()=>setDraftCategory(option)}
         style={{paddingHorizontal:13,paddingVertical:9,borderRadius:9,borderWidth:1,borderColor:draftCategory===option?colors.household:colors.border,backgroundColor:draftCategory===option?colors.household:colors.secondary}}>
         <Text style={{fontSize:fontSizes.label,color:draftCategory===option?'#FFFFFF':colors.text}}>{option}</Text>
        </Pressable>)}
       </View>
      </View>
      {scope==='household'?<View style={{gap:9}}>
       <Text style={{fontSize:fontSizes.label,fontFamily:fontFamilies.semibold,color:colors.text}}>Added by</Text>
       <View style={{flexDirection:'row',gap:8}}>
        {(['all','me','partner'] as const).map(value=><Pressable key={value} accessibilityRole="button" accessibilityState={{selected:draftContributor===value}} onPress={()=>setDraftContributor(value)}
         style={{flex:1,alignItems:'center',paddingVertical:11,borderRadius:9,borderWidth:1,borderColor:draftContributor===value?colors.household:colors.border,backgroundColor:draftContributor===value?colors.household:colors.secondary}}>
         <Text style={{fontSize:fontSizes.label,color:draftContributor===value?'#FFFFFF':colors.text}}>{value==='all'?'Everyone':value==='me'?'You':(memberNames[expense.ownerId]??'Member')}</Text>
        </Pressable>)}
       </View>
      </View>:null}
      <View style={{gap:9}}>
       <Text style={{fontSize:fontSizes.label,fontFamily:fontFamilies.semibold,color:colors.text}}>Amount range</Text>
       <View style={{flexDirection:'row',gap:10}}>
        {[{label:'Minimum ₹',value:draftMin,set:setDraftMin},{label:'Maximum ₹',value:draftMax,set:setDraftMax}].map(item=><View key={item.label} style={{flex:1,gap:6}}>
         <Text style={{fontSize:fontSizes.caption,color:colors.muted}}>{item.label}</Text>
         <TextInput accessibilityLabel={item.label} value={item.value} onChangeText={v=>item.set(v.replace(/[^0-9]/g,''))} keyboardType="number-pad" placeholder="Any" placeholderTextColor={colors.muted}
          style={{height:44,borderRadius:9,borderWidth:1,borderColor:colors.border,color:colors.text,backgroundColor:colors.secondary,paddingHorizontal:12,fontSize:fontSizes.body}}/>
        </View>)}
       </View>
      </View>
     </ScrollView>
     <View style={{flexDirection:'row',gap:10,paddingHorizontal:20,paddingTop:12,borderTopWidth:1,borderColor:colors.border}}>
      <Pressable accessibilityRole="button" onPress={resetFilters} style={{minHeight:48,paddingHorizontal:20,justifyContent:'center',alignItems:'center',borderRadius:10,backgroundColor:colors.secondary}}>
       <Text style={{fontSize:fontSizes.body,fontFamily:fontFamilies.semibold,color:colors.text}}>Reset</Text>
      </Pressable>
      <Pressable accessibilityRole="button" onPress={applyFilters} style={{flex:1,minHeight:48,justifyContent:'center',alignItems:'center',borderRadius:10,backgroundColor:colors.household}}>
       <Text style={{fontSize:fontSizes.body,fontFamily:fontFamilies.semibold,color:'#FFFFFF'}}>Show expenses</Text>
      </Pressable>
     </View>
    </View>
   </View>
  </Modal>
  <AddExpenseButton/>
 </View></MonthSwipeView>;
}
