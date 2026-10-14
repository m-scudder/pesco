import React,{useMemo,useState} from 'react';
import {Alert,Platform,Pressable,Share,Text,TextInput,View} from 'react-native';
import DateTimePicker,{DateTimePickerAndroid} from '@react-native-community/datetimepicker';
import {Screen} from '@/components/Screen';
import {ScopeSwitch} from '@/components/UI';
import {useAppTheme} from '@/theme/ThemeContext';
import {formatMoney,localDate,useData} from '@/data';
import {expensesCsv,filterHistory} from '@/lib/expenseHistory';

const dateString=(d:Date)=>d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
const firstOfMonth=(d:Date)=>dateString(new Date(d.getFullYear(),d.getMonth(),1));
const displayDate=(date:string)=>new Date(date+'T12:00:00').toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'});
export default function History(){
 const {colors,scope}=useAppTheme();
 const {expenses,demoEnabled,refresh,syncError}=useData();
 const [from,setFrom]=useState(()=>firstOfMonth(new Date()));
 const [to,setTo]=useState(localDate());
 const [query,setQuery]=useState('');
 const [picker,setPicker]=useState<'from'|'to'|null>(null);
 const [sharing,setSharing]=useState(false);
 const [includeDemo,setIncludeDemo]=useState(false);
 const [visibleCount,setVisibleCount]=useState(50);
 const records=useMemo(()=>filterHistory(expenses,scope,from,to,query),[expenses,scope,from,to,query]);
 const exportRecords=useMemo(()=>records.filter(x=>includeDemo||!x.id.startsWith('demo:')),[records,includeDemo]);
 React.useEffect(()=>{setVisibleCount(50)},[scope,from,to,query]);
 const visible=records.slice(0,visibleCount);
 const total=records.reduce((value,item)=>value+item.amountPaise,0);
 const choose=(target:'from'|'to')=>{
  if(Platform.OS==='android'){
   DateTimePickerAndroid.open({mode:'date',value:new Date((target==='from'?from:to)+'T12:00:00'),
    onChange:(event,date)=>{if(event.type==='set'&&date)(target==='from'?setFrom:setTo)(dateString(date))}});
  }else setPicker(target);
 };
 const share=async()=>{
  if(!exportRecords.length){Alert.alert('Nothing to export','No matching non-demo expenses in this date range.');return}
  setSharing(true);
  try{await Share.share({title:'PESCO expenses CSV',message:expensesCsv(exportRecords)})}
  catch(e){Alert.alert('Could not share CSV',e instanceof Error?e.message:'Try again')}
  finally{setSharing(false)}
 };
 return <Screen modal style={{gap:12}}>
  <ScopeSwitch/>
  <Text style={{fontSize:12,color:colors.muted}}>Search your expense history across months and export matching records.</Text>
  <View style={{backgroundColor:colors.surface,borderColor:colors.border,borderWidth:1,borderRadius:11,padding:12,gap:10}}>
   <Text style={{fontSize:11,fontFamily:'Inter_600SemiBold',color:colors.muted}}>DATE RANGE</Text>
   <View style={{flexDirection:'row',gap:8}}>
    {(['from','to'] as const).map(target=><Pressable key={target} accessibilityRole="button" accessibilityLabel={'Select '+target+' date'} onPress={()=>choose(target)}
     style={{flex:1,borderRadius:9,backgroundColor:colors.secondary,padding:10,gap:3}}>
     <Text style={{fontSize:11,color:colors.muted}}>{target==='from'?'From':'To'}</Text>
     <Text style={{fontSize:13,color:colors.text,fontFamily:'Inter_500Medium'}}>{displayDate(target==='from'?from:to)} ▾</Text>
    </Pressable>)}
   </View>
   {picker!==null?<View style={{gap:8}}>
    <DateTimePicker value={new Date((picker==='from'?from:to)+'T12:00:00')} mode="date" display="spinner"
     onChange={(event,date)=>{if(event.type==='set'&&date)(picker==='from'?setFrom:setTo)(dateString(date))}}/>
    <Pressable accessibilityRole="button" onPress={()=>setPicker(null)} style={{padding:8,alignSelf:'flex-end'}}><Text style={{color:colors.household}}>Done</Text></Pressable>
   </View>:null}
   <TextInput accessibilityLabel="Search history" value={query} onChangeText={setQuery} placeholder="Search category, note or amount"
    placeholderTextColor={colors.muted} style={{height:42,borderWidth:1,borderColor:colors.border,borderRadius:9,paddingHorizontal:10,color:colors.text,fontSize:13}}/>
   {from>to?<Text style={{fontSize:12,color:'#C94F4F'}}>Start date must be before the end date.</Text>:null}
  </View>
  {syncError?<Pressable onPress={()=>{void refresh()}}><Text style={{fontSize:12,color:'#C94F4F'}}>Unable to refresh household expenses · Retry</Text></Pressable>:null}
  {demoEnabled?<Text style={{fontSize:11,color:colors.muted}}>DEMO DATA · Included in history preview, excluded from CSV by default</Text>:null}
  <View style={{flexDirection:'row',justifyContent:'space-between',alignItems:'center'}}>
   <Text style={{fontSize:12,color:colors.muted}}>{records.length} records</Text>
   <Text style={{fontSize:15,color:colors.text,fontFamily:'Inter_600SemiBold'}}>{formatMoney(total)}</Text>
  </View>
  <View style={{backgroundColor:colors.surface,borderRadius:11,borderColor:colors.border,borderWidth:1,paddingHorizontal:12}}>
   {records.length===0?<Text style={{color:colors.muted,paddingVertical:16,fontSize:13}}>No matching expenses</Text>:visible.map((expense,index)=><View key={expense.id}
    style={{paddingVertical:10,borderBottomWidth:index===visible.length-1?0:1,borderColor:colors.border,flexDirection:'row',alignItems:'center',gap:12}}>
    <View style={{flex:1,gap:3}}>
     <Text numberOfLines={1} style={{color:colors.text,fontFamily:'Inter_500Medium',fontSize:13}}>{expense.note||expense.category}{expense.id.startsWith('demo:')?' · Demo':''}</Text>
     <Text style={{fontSize:11,color:colors.muted}}>{displayDate(expense.date)} · {expense.category}</Text>
    </View>
    <Text style={{fontSize:13,color:colors.text,fontFamily:'Inter_500Medium'}}>{formatMoney(expense.amountPaise)}</Text>
   </View>)}
  </View>
  {records.length>visibleCount?<Pressable accessibilityRole="button" onPress={()=>setVisibleCount(n=>n+50)} style={{paddingVertical:12,alignItems:'center',borderRadius:10,backgroundColor:colors.secondary}}><Text style={{fontFamily:'Inter_600SemiBold',fontSize:13,color:colors.text}}>Show more ({records.length-visibleCount} remaining)</Text></Pressable>:null}
  {demoEnabled?<Pressable accessibilityRole="checkbox" accessibilityState={{checked:includeDemo}} onPress={()=>setIncludeDemo(v=>!v)} style={{paddingVertical:4}}>
   <Text style={{fontSize:12,color:colors.muted}}>{includeDemo?'☑':'□'} Include demo expenses in CSV</Text>
  </Pressable>:null}
  <Pressable accessibilityRole="button" disabled={sharing||exportRecords.length===0||from>to} onPress={()=>{void share()}}
   style={{borderRadius:9,padding:12,alignItems:'center',backgroundColor:colors.household,opacity:sharing||!exportRecords.length||from>to?0.45:1}}>
   <Text style={{color:'#fff',fontFamily:'Inter_600SemiBold',fontSize:13}}>{sharing?'Preparing…':'Export CSV'}</Text>
  </Pressable>
  <Text style={{fontSize:11,color:colors.muted}}>The share sheet sends CSV-formatted text, not an attached file. No export is uploaded by PESCO.</Text>
 </Screen>;
}
