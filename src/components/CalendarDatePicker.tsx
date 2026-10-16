import React,{useEffect,useState} from 'react';
import {Modal,Pressable,Text,View} from 'react-native';
import {Ionicons} from '@expo/vector-icons';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {useAppTheme} from '@/theme/ThemeContext';

const weekdays=['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
const pad=(n:number)=>String(n).padStart(2,'0');
const iso=(d:Date)=>`${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
export function CalendarDatePicker({visible,value,onChange,onClose}:{visible:boolean;value:string;onChange:(value:string)=>void;onClose:()=>void}){
 const {colors}=useAppTheme();
 const insets=useSafeAreaInsets();
 const [month,setMonth]=useState(()=>{const d=new Date(value+'T12:00:00');return new Date(d.getFullYear(),d.getMonth(),1)});
 useEffect(()=>{if(visible){const d=new Date(value+'T12:00:00');setMonth(new Date(d.getFullYear(),d.getMonth(),1))}},[visible,value]);
 const start=(month.getDay()+6)%7;
 const days=new Date(month.getFullYear(),month.getMonth()+1,0).getDate();
 const cells=Array.from({length:Math.ceil((start+days)/7)*7},(_,i)=>i-start+1);
 const today=iso(new Date());
 const changeMonth=(delta:number)=>setMonth(m=>new Date(m.getFullYear(),m.getMonth()+delta,1));
 return <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose} presentationStyle="overFullScreen">
  <View style={{flex:1,justifyContent:'flex-end',backgroundColor:'rgba(0,0,0,0.45)'}}>
   <Pressable accessibilityLabel="Close calendar" onPress={onClose} style={{flex:1}}/>
   <View style={{backgroundColor:colors.surface,borderTopLeftRadius:0,borderTopRightRadius:0,paddingHorizontal:16,paddingTop:14,paddingBottom:Math.max(insets.bottom,16)}}>
    <View style={{flexDirection:'row',justifyContent:'space-between',alignItems:'center',paddingBottom:12}}>
     <Text style={{color:colors.text,fontSize:16,fontWeight:'600'}}>Date</Text>
     <Pressable onPress={onClose} accessibilityLabel="Close date picker" style={{padding:8}}><Ionicons name="close" size={22} color={colors.text}/></Pressable>
    </View>
    <View style={{flexDirection:'row',justifyContent:'space-between',alignItems:'center',paddingVertical:5}}>
     <Pressable onPress={()=>changeMonth(-1)} accessibilityLabel="Previous calendar month" style={{padding:12}}><Ionicons name="chevron-back" size={20} color={colors.text}/></Pressable>
     <Text style={{color:colors.text,fontSize:16,fontWeight:'600'}}>{month.toLocaleDateString('en-IN',{month:'long',year:'numeric'})}</Text>
     <Pressable onPress={()=>changeMonth(1)} accessibilityLabel="Next calendar month" style={{padding:12}}><Ionicons name="chevron-forward" size={20} color={colors.text}/></Pressable>
    </View>
    <View style={{flexDirection:'row',marginTop:8}}>
     {weekdays.map(day=><Text key={day} style={{width:'14.2857%',textAlign:'center',color:colors.muted,fontSize:12,paddingVertical:9}}>{day}</Text>)}
    </View>
    <View style={{flexDirection:'row',flexWrap:'wrap'}}>
     {cells.map((day,i)=>{
      const inMonth=day>0&&day<=days;
      const dayDate=new Date(month.getFullYear(),month.getMonth(),day);
      const candidate=iso(dayDate);
      const selected=inMonth&&candidate===value;
      return <View key={i} style={{width:'14.2857%',height:49,alignItems:'center',justifyContent:'center'}}>
       {inMonth?<Pressable accessibilityRole="button" accessibilityLabel={dayDate.toDateString()} accessibilityState={{selected}} onPress={()=>{onChange(candidate);onClose()}} style={{width:40,height:40,alignItems:'center',justifyContent:'center',borderRadius:0,backgroundColor:selected?colors.household:'transparent',borderWidth:candidate===today&&!selected?1:0,borderColor:colors.border}}>
        <Text style={{fontSize:15,color:selected?'#fff':colors.text,fontWeight:selected?'700':'400'}}>{day}</Text>
       </Pressable>:null}
      </View>;
     })}
    </View>
    <Pressable accessibilityRole="button" onPress={()=>{onChange(today);onClose()}} style={{alignSelf:'flex-end',padding:12,marginTop:6}}>
     <Text style={{color:colors.household,fontWeight:'600'}}>Today</Text>
    </Pressable>
   </View>
  </View>
 </Modal>;
}
