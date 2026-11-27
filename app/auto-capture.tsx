import {fontSizes,fontFamilies} from '@/theme/typography';
import React,{useCallback,useEffect,useState} from 'react';
import {ActivityIndicator,Alert,Linking,PermissionsAndroid,Platform,Pressable,Text,View} from 'react-native';
import {useRouter} from 'expo-router';
import {Ionicons} from '@expo/vector-icons';
import {Screen} from '@/components/Screen';
import {useAppTheme} from '@/theme/ThemeContext';
import {useAutoCapture} from '@/lib/AutoCaptureContext';

type AndroidState='checking'|'off'|'on'|'blocked';
const SMS_PERMISSIONS=[PermissionsAndroid.PERMISSIONS.RECEIVE_SMS,PermissionsAndroid.PERMISSIONS.READ_SMS];

export default function AutoCaptureSetup(){
 const {colors}=useAppTheme();
 const router=useRouter();
 const {available,mode,lastCapturedAt,newCount}=useAutoCapture();
 const status=lastCapturedAt
  ?'Working · last bank message '+new Date(lastCapturedAt).toLocaleString('en-IN',{day:'numeric',month:'short',hour:'numeric',minute:'2-digit'})
  :null;
 return <Screen modal style={{gap:14,paddingBottom:40}}>
  <Text style={{color:colors.muted,fontSize:fontSizes.label,lineHeight:19}}>
   PESCO can find payments in your bank and UPI messages, so you don't have to type them in. You review each payment before it becomes an expense.
  </Text>
  {!available?<Card>
   <Title>Needs the latest app version</Title>
   <Muted>Automatic tracking needs an updated build of PESCO. Until then, you can paste a bank message on the Detected payments screen.</Muted>
  </Card>:mode==='sms'?<AndroidSetup/>:<IPhoneSetup/>}
  {status?<View style={{flexDirection:'row',gap:8,alignItems:'center'}}>
   <Ionicons name="checkmark-circle" size={18} color={colors.household}/>
   <Text style={{color:colors.text,fontSize:fontSizes.label}}>{status}</Text>
  </View>:null}
  <Pressable accessibilityRole="button" onPress={()=>router.push('/detected')} style={{paddingVertical:6,alignSelf:'flex-start'}}>
   <Text style={{color:colors.household,fontFamily:fontFamilies.semibold,fontSize:fontSizes.label}}>
    {newCount?'Review '+newCount+' detected payment'+(newCount===1?'':'s'):'Open detected payments'}
   </Text>
  </Pressable>
 </Screen>;
}

function AndroidSetup(){
 const {importRecent}=useAutoCapture();
 const [state,setState]=useState<AndroidState>('checking');
 const [importing,setImporting]=useState(false);
 const check=useCallback(async()=>{
  if(Platform.OS!=='android')return;
  const granted=await Promise.all(SMS_PERMISSIONS.map(p=>PermissionsAndroid.check(p)));
  setState(granted.every(Boolean)?'on':'off');
 },[]);
 useEffect(()=>{void check()},[check]);
 const turnOn=async()=>{
  const result=await PermissionsAndroid.requestMultiple(SMS_PERMISSIONS);
  const values=SMS_PERMISSIONS.map(p=>result[p]);
  if(values.every(v=>v===PermissionsAndroid.RESULTS.GRANTED)){setState('on');return}
  setState(values.some(v=>v===PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN)?'blocked':'off');
 };
 const importLast30=async()=>{
  setImporting(true);
  try{
   const found=await importRecent(30);
   Alert.alert(found?'Payments found':'No new payments',found?found+' payment'+(found===1?'':'s')+' from the last 30 days are ready to review.':'No new bank or UPI payments were found in the last 30 days.');
  }catch(e){Alert.alert('Could not read messages',e instanceof Error?e.message:'Try again')}
  finally{setImporting(false)}
 };
 if(state==='checking')return <ActivityIndicator/>;
 return <>
  <Card>
   <Title>How it works</Title>
   <Bullet>PESCO reads SMS only from banks and payment services, such as "VM-HDFCBK". Messages from people, and OTPs, are skipped and never stored.</Bullet>
   <Bullet>Payments are found on your phone. A message's details are uploaded only when you add it as an expense.</Bullet>
   <Bullet>It also works while PESCO is closed. You can turn it off any time in your phone's app settings.</Bullet>
  </Card>
  {state==='on'?<Card>
   <Title>Automatic tracking is on</Title>
   <Muted>New bank and UPI payments will appear in Detected payments.</Muted>
   <Button label={importing?'Reading messages…':'Find payments from the last 30 days'} onPress={()=>{void importLast30()}} disabled={importing}/>
  </Card>:<Card>
   <Muted>To turn this on, PESCO will ask for permission to read SMS. If you say no, everything else in PESCO still works.</Muted>
   {state==='blocked'
    ?<Button label="Open app settings" onPress={()=>{void Linking.openSettings()}}/>
    :<Button label="Allow SMS access" onPress={()=>{void turnOn()}}/>}
  </Card>}
 </>;
}

function IPhoneSetup(){
 const {colors}=useAppTheme();
 const steps=[
  'Open Shortcuts, tap Automation, then tap + (or New Automation).',
  'Choose Message. In "Message Contains", type Rs. Tap Run Immediately, then Next.',
  'Search for PESCO and choose "Log Bank Message in PESCO".',
  'Check that Message is set to "Shortcut Input". Tap Done.',
  'Optional: repeat with INR if your bank writes amounts as INR.',
 ];
 return <>
  <Card>
   <Title>Set up once, about 30 seconds</Title>
   <Muted>iPhone does not let apps read messages, so a Shortcuts automation sends bank texts to PESCO. Personal messages and OTPs are skipped, and nothing is uploaded until you add a payment.</Muted>
   {steps.map((step,index)=><View key={index} style={{flexDirection:'row',gap:10}}>
    <View style={{width:22,height:22,borderRadius:11,backgroundColor:colors.secondary,alignItems:'center',justifyContent:'center'}}>
     <Text style={{color:colors.household,fontSize:fontSizes.caption,fontFamily:fontFamilies.semibold}}>{index+1}</Text>
    </View>
    <Text style={{flex:1,color:colors.text,fontSize:fontSizes.label,lineHeight:19}}>{step}</Text>
   </View>)}
   <Button label="Open Shortcuts" onPress={()=>{void Linking.openURL('shortcuts://').catch(()=>Alert.alert('Shortcuts not found','Install the Shortcuts app from the App Store, then try again.'))}}/>
  </Card>
  <Muted>When your next bank message arrives, it shows up in Detected payments, and this screen confirms it's working.</Muted>
 </>;
}

function Card({children}:{children:React.ReactNode}){
 const {colors}=useAppTheme();
 return <View style={{backgroundColor:colors.surface,borderColor:colors.border,borderWidth:1,borderRadius:13,padding:15,gap:10}}>{children}</View>;
}
function Title({children}:{children:React.ReactNode}){
 const {colors}=useAppTheme();
 return <Text style={{color:colors.text,fontFamily:fontFamilies.semibold,fontSize:fontSizes.body}}>{children}</Text>;
}
function Muted({children}:{children:React.ReactNode}){
 const {colors}=useAppTheme();
 return <Text style={{color:colors.muted,fontSize:fontSizes.label,lineHeight:19}}>{children}</Text>;
}
function Bullet({children}:{children:React.ReactNode}){
 const {colors}=useAppTheme();
 return <View style={{flexDirection:'row',gap:8}}>
  <Text style={{color:colors.household,fontSize:fontSizes.label}}>•</Text>
  <Text style={{flex:1,color:colors.text,fontSize:fontSizes.label,lineHeight:19}}>{children}</Text>
 </View>;
}
function Button({label,onPress,disabled=false}:{label:string;onPress:()=>void;disabled?:boolean}){
 const {colors}=useAppTheme();
 return <Pressable accessibilityRole="button" disabled={disabled} onPress={onPress}
  style={{borderRadius:10,minHeight:42,paddingHorizontal:14,alignItems:'center',justifyContent:'center',backgroundColor:colors.household,opacity:disabled?0.6:1}}>
  <Text style={{color:'#fff',fontFamily:fontFamilies.semibold,fontSize:fontSizes.body}}>{label}</Text>
 </Pressable>;
}
