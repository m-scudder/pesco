import React,{useMemo,useState} from 'react';
import {useFocusEffect,useRouter} from 'expo-router';
import {Pressable,Text,View,useWindowDimensions} from 'react-native';
import Svg,{Circle,Path,Polyline} from 'react-native-svg';
import {Screen} from '@/components/Screen';
import {ScopeSwitch} from '@/components/UI';
import {MonthPicker} from '@/components/MonthPicker';
import {formatMoney,localDate,monthKey,useData} from '@/data';
import {buildInsights,shiftMonth} from '@/lib/insights';
import {useAppTheme} from '@/theme/ThemeContext';

const SEGMENT_COLORS=['#FF655B','#FF984F','#FFD143','#FFE600','#B7DF48','#64D073','#4AD1C9','#568AF2','#AA7CE4','#F77FB4'];
const fmt=(amount:number)=>formatMoney(amount);
const amountText=(value:number)=>fmt(value).replace(/\.00$/,'');
function slicePath(cx:number,cy:number,r:number,start:number,end:number){
 const point=(angle:number)=>({x:cx+r*Math.cos(angle),y:cy+r*Math.sin(angle)});
 const a=point(start),b=point(end);
 return `M ${cx} ${cy} L ${a.x} ${a.y} A ${r} ${r} 0 ${end-start>Math.PI?1:0} 1 ${b.x} ${b.y} Z`;
}

export default function Insights(){
 const router=useRouter();
 const {colors,scope}=useAppTheme();
 const {width}=useWindowDimensions();
 const {expenses,currentUserId,refresh,loaded}=useData();
 const [month,setMonth]=useState(monthKey(localDate()));
 const [chosen,setChosen]=useState<string|null>(null);
 useFocusEffect(React.useCallback(()=>{void refresh()},[refresh]));
 const model=useMemo(()=>buildInsights(expenses,scope,month,currentUserId),[expenses,scope,month,currentUserId]);
 const {categories,spent}=model;
 const selected=useMemo(()=>expenses.filter(e=>e.scope===scope&&e.category===chosen&&monthKey(e.date)===month)
  .sort((a,b)=>b.date.localeCompare(a.date)||b.createdAt.localeCompare(a.createdAt)),[expenses,scope,chosen,month]);
 const groups=useMemo(()=>{
  const out:typeof selected[]=[];
  for(const e of selected){const last=out[out.length-1];if(last&&last[0].date===e.date)last.push(e);else out.push([e]);}
  return out;
 },[selected]);
 const chartSize=Math.min(width-24,360);
 const cx=chartSize/2,cy=chartSize/2,r=chartSize*0.37;
 let angle=-Math.PI/2;
 const slices=categories.filter(c=>c.amount>0).map((c,i)=>{
  const start=angle;angle+=c.amount/spent*Math.PI*2;
  return {...c,color:SEGMENT_COLORS[i%SEGMENT_COLORS.length],start,end:angle};
 });
 const monthlyCategory=useMemo(()=>Array.from({length:7},(_,i)=>{
  const key=shiftMonth(month,i-4);
  return {key,label:new Date(Number(key.slice(0,4)),Number(key.slice(5))-1,1).toLocaleDateString('en-IN',{month:'short'}),amount:expenses.filter(e=>e.scope===scope&&e.category===chosen&&monthKey(e.date)===key).reduce((s,e)=>s+e.amountPaise,0)};
 }),[expenses,scope,chosen,month]);
 const trendMax=Math.max(1,...monthlyCategory.map(m=>m.amount));
 const trendWidth=Math.min(width-24,440);
 const trendHeight=170;
 const trendPoints=monthlyCategory.map((m,i)=>({x:18+i*(trendWidth-36)/6,y:18+(1-m.amount/trendMax)*112,...m}));
 const categoryTotal=selected.reduce((sum,e)=>sum+e.amountPaise,0);
 return <Screen style={{paddingHorizontal:0,gap:0,paddingTop:10}}>
  {chosen!==null?
   <View style={{flexDirection:'row',alignItems:'center',paddingHorizontal:14,paddingBottom:12,gap:14}}>
    <Pressable accessibilityRole="button" accessibilityLabel="Back to categories" onPress={()=>setChosen(null)}>
     <Text style={{color:colors.text,fontSize:28}}>‹</Text>
    </Pressable>
    <Text numberOfLines={1} style={{color:colors.text,fontSize:19,fontWeight:'600',flex:1}}>{chosen}</Text>
   </View>:
   <View style={{paddingHorizontal:12,paddingBottom:8}}><ScopeSwitch/></View>}
  <View style={{paddingHorizontal:12,paddingBottom:12}}><MonthPicker month={month} onChange={setMonth}/></View>
  {chosen===null?<>
   {spent>0?<View style={{alignItems:'center',justifyContent:'center',paddingVertical:8,borderTopWidth:1,borderColor:colors.border}}>
    <Svg width={chartSize} height={chartSize} viewBox={`0 0 ${chartSize} ${chartSize}`}>
     {slices.map((s,i)=><Path key={s.name} d={slicePath(cx,cy,r,s.start,s.end)} fill={s.color} stroke={colors.background} strokeWidth={1.5}/>)}
    </Svg>
   </View>:<Text style={{color:colors.muted,textAlign:'center',paddingVertical:36}}>{loaded?'No expenses this month':'Loading…'}</Text>}
   {slices.map((s,i)=><Pressable key={s.name} accessibilityRole="button"
    accessibilityLabel={s.name+', '+s.percent+' percent, '+fmt(s.amount)}
    onPress={()=>setChosen(s.name)}
    style={{flexDirection:'row',alignItems:'center',gap:10,paddingHorizontal:14,paddingVertical:13,minHeight:58,borderTopWidth:1,borderColor:colors.border}}>
    <View style={{backgroundColor:s.color,borderRadius:5,paddingHorizontal:7,paddingVertical:5,minWidth:48,alignItems:'center'}}>
     <Text style={{color:'#22252B',fontSize:13,fontWeight:'700'}}>{s.percent}%</Text>
    </View>
    <Text style={{color:colors.text,flex:1,fontSize:15}} numberOfLines={1}>{s.name}</Text>
    <Text style={{color:colors.text,fontSize:15,fontWeight:'500'}}>{fmt(s.amount)}</Text>
   </Pressable>)}
  </>:<>
   <View style={{height:trendHeight+30,justifyContent:'center',alignItems:'center',borderTopWidth:1,borderBottomWidth:1,borderColor:colors.border}}>
    <Svg width={trendWidth} height={trendHeight} viewBox={`0 0 ${trendWidth} ${trendHeight}`}>
     <Polyline points={trendPoints.map(p=>`${p.x},${p.y}`).join(' ')} fill="none" stroke="#FF655B" strokeWidth={3} strokeLinejoin="round"/>
     {trendPoints.map(p=><React.Fragment key={p.key}>
      <Circle cx={p.x} cy={p.y} r={4.5} fill="#FF655B"/>
     </React.Fragment>)}
    </Svg>
    <View style={{width:trendWidth,flexDirection:'row',justifyContent:'space-between',paddingHorizontal:3}}>
     {monthlyCategory.map(m=><Text key={m.key} style={{fontSize:11,color:m.key===month?'#FF655B':colors.muted}}>{m.label}</Text>)}
    </View>
   </View>
   {groups.map(group=>{
    const date=group[0].date;
    const d=new Date(date+'T12:00:00');
    return <View key={date}>
     <View style={{flexDirection:'row',alignItems:'center',gap:8,paddingHorizontal:12,paddingVertical:8,backgroundColor:colors.secondary,borderBottomWidth:1,borderColor:colors.border}}>
      <Text style={{color:colors.text,fontWeight:'700',fontSize:20}}>{String(d.getDate()).padStart(2,'0')}</Text>
      <Text style={{color:colors.muted,fontSize:12}}>{d.toLocaleDateString('en-IN',{weekday:'short'})}</Text>
      <View style={{flex:1}}/>
      <Text style={{color:'#FF655B',fontSize:15}}>{fmt(group.reduce((s,e)=>s+e.amountPaise,0))}</Text>
     </View>
     {group.map(e=><Pressable key={e.id} onPress={()=>router.push({pathname:'/expense/[id]',params:{id:e.id}})}
      style={{flexDirection:'row',alignItems:'center',paddingHorizontal:12,paddingVertical:12,minHeight:55,gap:12,borderBottomWidth:1,borderColor:colors.border}}>
      <Text style={{color:colors.muted,fontSize:12,width:90}} numberOfLines={2}>{e.category}</Text>
      <Text style={{color:colors.text,fontSize:15,flex:1}} numberOfLines={2}>{e.note?.trim()||e.category}</Text>
      <Text style={{color:'#FF655B',fontSize:15}}>{fmt(e.amountPaise)}</Text>
     </Pressable>)}
    </View>;
   })}
   {groups.length===0?<Text style={{color:colors.muted,textAlign:'center',paddingVertical:30}}>No transactions for this month</Text>:null}
  </>}
 </Screen>;
}
