import React,{useRef} from 'react';
import {View} from 'react-native';
import {shiftMonth} from '@/lib/insights';

// Observe completed horizontal swipes without claiming the vertical scroll gesture.
export function MonthSwipeView({month,onChange,children}:{month:string;onChange:(value:string)=>void;children:React.ReactNode}){
 const start=useRef<{x:number;y:number}|null>(null);
 return <View style={{flex:1}} onTouchStart={e=>{start.current={x:e.nativeEvent.pageX,y:e.nativeEvent.pageY}}}
  onTouchEnd={e=>{
   const from=start.current;start.current=null;if(!from)return;
   const dx=e.nativeEvent.pageX-from.x,dy=e.nativeEvent.pageY-from.y;
   if(Math.abs(dx)<65||Math.abs(dx)<Math.abs(dy)*1.4)return;
   onChange(shiftMonth(month,dx<0?1:-1));
  }}>{children}</View>;
}
