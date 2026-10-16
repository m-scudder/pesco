import {fontSizes,fontFamilies,fontWeights} from '@/theme/typography';
import React,{useMemo,useState} from 'react';
import {Alert,Modal,Platform,Pressable,Text,TextInput,View} from 'react-native';
import DateTimePicker,{DateTimePickerAndroid} from '@react-native-community/datetimepicker';
import {File,Paths} from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import {Screen} from '@/components/Screen';
import {ScopeSwitch} from '@/components/UI';
import {useAppTheme} from '@/theme/ThemeContext';
import {formatMoney,localDate,useData} from '@/data';
import {expensesCsv,filterHistory} from '@/lib/expenseHistory';

const dateString=(d:Date)=>d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
const firstOfMonth=(d:Date)=>dateString(new Date(d.getFullYear(),d.getMonth(),1));
const displayDate=(date:string)=>new Date(date+'T12:00:00').toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'});
export default function History(){
 const {colors,scope,resolved}=useAppTheme();
 const {expenses,demoEnabled,refresh,syncError}=useData();
 const [from,setFrom]=useState(()=>firstOfMonth(new Date()));
 const [to,setTo]=useState(localDate());
 const [query,setQuery]=useState('');
 const [picker,setPicker]=useState<'from'|'to'|null>(null);
 const [pendingDate,setPendingDate]=useState(new Date());
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
  }else{
   setPendingDate(new Date((target==='from'?from:to)+'T12:00:00'));
   setPicker(target);
  }
 };
 const share=async()=>{
  if(!exportRecords.length){Alert.alert('Nothing to export','No matching non-demo expenses in this date range.');return}
  setSharing(true);
  try{
   if(!await Sharing.isAvailableAsync())throw new Error('File sharing is unavailable on this device');
   const file=new File(Paths.cache,'PESCO-'+scope+'-'+from+'-to-'+to+'.csv');
   try{
    file.create({overwrite:true});
    file.write(expensesCsv(exportRecords));
    await Sharing.shareAsync(file.uri,{mimeType:'text/csv',UTI:'public.comma-separated-values',dialogTitle:'Export PESCO CSV'});
   }finally{
    if(file.exists)file.delete();
   }
  }
  catch(e){Alert.alert('Could not share CSV',e instanceof Error?e.message:'Try again')}
  finally{setSharing(false)}
 };
 return <Screen modal style={{gap:12}}>
  <ScopeSwitch/>
  <Text style={{fontSize:fontSizes.caption,color:colors.muted}}>Search your expense history across months and export matching records.</Text>
  <View style={{backgroundColor:colors.surface,borderColor:colors.border,borderWidth:1,borderRadius:11,padding:12,gap:10}}>
   <Text style={{fontSize:fontSizes.caption,fontFamily:fontFamilies.semibold,color:colors.muted}}>DATE RANGE</Text>
   <View style={{flexDirection:'row',gap:8}}>
    {(['from','to'] as const).map(target=><Pressable key={target} accessibilityRole="button" accessibilityLabel={'Select '+target+' date'} onPress={()=>choose(target)}
     style={{flex:1,borderRadius:9,backgroundColor:colors.secondary,padding:10,gap:3}}>
     <Text style={{fontSize:fontSizes.caption,color:colors.muted}}>{target==='from'?'From':'To'}</Text>
     <Text style={{fontSize:fontSizes.label,color:colors.text,fontFamily:fontFamilies.medium}}>{displayDate(target==='from'?from:to)} ▾</Text>
    </Pressable>)}
   </View>
   <TextInput accessibilityLabel="Search history" value={query} onChangeText={setQuery} placeholder="Search category, note or amount"
    placeholderTextColor={colors.muted} style={{height:42,borderWidth:1,borderColor:colors.border,borderRadius:9,paddingHorizontal:10,color:colors.text,fontSize:fontSizes.label}}/>
   {from>to?<Text style={{fontSize:fontSizes.caption,color:'#C94F4F'}}>Start date must be before the end date.</Text>:null}
  </View>
  {syncError?<Pressable onPress={()=>{void refresh()}}><Text style={{fontSize:fontSizes.caption,color:'#C94F4F'}}>Unable to refresh household expenses · Retry</Text></Pressable>:null}
  {demoEnabled?<Text style={{fontSize:fontSizes.caption,color:colors.muted}}>DEMO DATA · Included in history preview, excluded from CSV by default</Text>:null}
  <View style={{flexDirection:'row',justifyContent:'space-between',alignItems:'center'}}>
   <Text style={{fontSize:fontSizes.caption,color:colors.muted}}>{records.length} records</Text>
   <Text style={{fontSize:fontSizes.input,color:colors.text,fontFamily:fontFamilies.semibold}}>{formatMoney(total)}</Text>
  </View>
  <View style={{backgroundColor:colors.surface,borderRadius:11,borderColor:colors.border,borderWidth:1,paddingHorizontal:12}}>
   {records.length===0?<Text style={{color:colors.muted,paddingVertical:16,fontSize:fontSizes.label}}>No matching expenses</Text>:visible.map((expense,index)=><View key={expense.id}
    style={{paddingVertical:10,borderBottomWidth:index===visible.length-1?0:1,borderColor:colors.border,flexDirection:'row',alignItems:'center',gap:12}}>
    <View style={{flex:1,gap:3}}>
     <Text numberOfLines={1} style={{color:colors.text,fontFamily:fontFamilies.medium,fontSize:fontSizes.label}}>{expense.note||expense.category}{expense.id.startsWith('demo:')?' · Demo':''}</Text>
     <Text style={{fontSize:fontSizes.caption,color:colors.muted}}>{displayDate(expense.date)} · {expense.category}</Text>
    </View>
    <Text style={{fontSize:fontSizes.label,color:colors.text,fontFamily:fontFamilies.medium}}>{formatMoney(expense.amountPaise)}</Text>
   </View>)}
  </View>
  {records.length>visibleCount?<Pressable accessibilityRole="button" onPress={()=>setVisibleCount(n=>n+50)} style={{paddingVertical:12,alignItems:'center',borderRadius:10,backgroundColor:colors.secondary}}><Text style={{fontFamily:fontFamilies.semibold,fontSize:fontSizes.label,color:colors.text}}>Show more ({records.length-visibleCount} remaining)</Text></Pressable>:null}
  {demoEnabled?<Pressable accessibilityRole="checkbox" accessibilityState={{checked:includeDemo}} onPress={()=>setIncludeDemo(v=>!v)} style={{paddingVertical:4}}>
   <Text style={{fontSize:fontSizes.caption,color:colors.muted}}>{includeDemo?'☑':'□'} Include demo expenses in CSV</Text>
  </Pressable>:null}
  <Pressable accessibilityRole="button" disabled={sharing||exportRecords.length===0||from>to} onPress={()=>{void share()}}
   style={{borderRadius:9,padding:12,alignItems:'center',backgroundColor:colors.household,opacity:sharing||!exportRecords.length||from>to?0.45:1}}>
   <Text style={{color:'#fff',fontFamily:fontFamilies.semibold,fontSize:fontSizes.label}}>{sharing?'Preparing…':'Export CSV'}</Text>
  </Pressable>
  <Text style={{fontSize:fontSizes.caption,color:colors.muted}}>Exports a .csv file to your device's share sheet. No export is uploaded by PESCO.</Text>
  <Modal visible={picker!==null} transparent animationType="fade" presentationStyle="overFullScreen" onRequestClose={()=>setPicker(null)}>
   <View style={{flex:1,justifyContent:'center',paddingHorizontal:24,backgroundColor:'rgba(0,0,0,0.55)'}}>
    <Pressable onPress={()=>setPicker(null)} accessibilityLabel="Dismiss date picker" style={{position:'absolute',top:0,bottom:0,left:0,right:0}}/>
    <View style={{backgroundColor:colors.surface,borderColor:colors.border,borderWidth:1,borderRadius:14,padding:14}}>
     <Text style={{color:colors.text,fontFamily:fontFamilies.semibold,fontSize:fontSizes.input}}>{picker==='from'?'From date':'To date'}</Text>
     <DateTimePicker value={pendingDate} mode="date" display="spinner" themeVariant={resolved} textColor={colors.text}
      style={{height:210,width:'100%'}} onChange={(event,date)=>{if(event.type==='set'&&date)setPendingDate(date)}}/>
     <View style={{flexDirection:'row',justifyContent:'flex-end',gap:18}}>
      <Pressable accessibilityRole="button" onPress={()=>setPicker(null)} style={{padding:10}}>
       <Text style={{color:colors.muted,fontFamily:fontFamilies.medium,fontSize:fontSizes.label}}>Cancel</Text>
      </Pressable>
      <Pressable accessibilityRole="button" onPress={()=>{
       if(picker==='from')setFrom(dateString(pendingDate));
       if(picker==='to')setTo(dateString(pendingDate));
       setPicker(null);
      }} style={{padding:10}}>
       <Text style={{color:colors.household,fontFamily:fontFamilies.semibold,fontSize:fontSizes.label}}>Done</Text>
      </Pressable>
     </View>
    </View>
   </View>
  </Modal>
 </Screen>;
}
