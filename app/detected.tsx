import {fontSizes,fontFamilies} from '@/theme/typography';
import React,{useState} from 'react';
import {Alert,Pressable,ScrollView,Text,TextInput,View} from 'react-native';
import {useRouter} from 'expo-router';
import {Ionicons} from '@expo/vector-icons';
import {Screen} from '@/components/Screen';
import {useAppTheme} from '@/theme/ThemeContext';
import {formatMoney,useData} from '@/data';
import {useCategories} from '@/lib/CategoryContext';
import {useAutoCapture} from '@/lib/AutoCaptureContext';
import type {DetectedTransaction} from '@/lib/transactionParser';
import type {Scope} from '@/theme/palette';

export default function DetectedPayments(){
 const {colors}=useAppTheme();
 const router=useRouter();
 const {detected,addPastedMessage,available}=useAutoCapture();
 const [pasted,setPasted]=useState('');
 const fresh=detected.filter(item=>item.status==='new');
 const readPasted=async()=>{
  const result=await addPastedMessage(pasted);
  if(result==='added')setPasted('');
  else Alert.alert(result==='duplicate'?'Already detected':'Not recognised',
   result==='duplicate'?'This payment is already in your list.':'This does not look like a completed bank or UPI payment message.');
 };
 return <Screen modal style={{gap:13,paddingBottom:40}}>
  <Text style={{color:colors.muted,fontSize:fontSizes.label,lineHeight:19}}>
   Payments found in your bank and UPI messages. Check each one, then add it to your expenses or dismiss it.
  </Text>
  {fresh.length===0?<View style={{backgroundColor:colors.surface,borderColor:colors.border,borderWidth:1,borderRadius:13,padding:16,gap:8,alignItems:'flex-start'}}>
   <Text style={{color:colors.text,fontFamily:fontFamilies.semibold,fontSize:fontSizes.body}}>Nothing new to review</Text>
   <Text style={{color:colors.muted,fontSize:fontSizes.caption,lineHeight:17}}>
    {available?'New bank and UPI payments will appear here automatically.':'Paste a bank message below, or set up automatic tracking.'}
   </Text>
   <Pressable accessibilityRole="button" onPress={()=>router.push('/auto-capture')} style={{paddingVertical:6}}>
    <Text style={{color:colors.household,fontFamily:fontFamilies.semibold,fontSize:fontSizes.label}}>Automatic tracking settings</Text>
   </Pressable>
  </View>:fresh.map(item=><DetectedCard key={item.id} item={item}/>)}
  <View style={{gap:8,marginTop:6}}>
   <Text style={{color:colors.text,fontFamily:fontFamilies.semibold,fontSize:fontSizes.body}}>Paste a bank message</Text>
   <TextInput accessibilityLabel="Bank message text" value={pasted} onChangeText={setPasted} multiline placeholder="e.g. Rs.450 debited from A/c XX1234 to VPA …" placeholderTextColor={colors.muted}
    style={{minHeight:78,borderColor:colors.border,borderWidth:1,borderRadius:10,padding:11,color:colors.text,fontSize:fontSizes.label,textAlignVertical:'top'}}/>
   <Pressable accessibilityRole="button" disabled={!pasted.trim()} onPress={()=>{void readPasted()}}
    style={{alignSelf:'flex-start',borderRadius:10,paddingHorizontal:15,paddingVertical:10,backgroundColor:colors.secondary,opacity:pasted.trim()?1:0.5}}>
    <Text style={{color:colors.text,fontFamily:fontFamilies.semibold,fontSize:fontSizes.label}}>Read message</Text>
   </Pressable>
  </View>
 </Screen>;
}

function DetectedCard({item}:{item:DetectedTransaction}){
 const {colors}=useAppTheme();
 const {household}=useData();
 const {names}=useCategories();
 const {confirm,dismiss,suggestionFor}=useAutoCapture();
 const suggestion=suggestionFor(item);
 const [scope,setScope]=useState<Scope>(household?(suggestion.scope??'household'):'personal');
 const options=names(scope);
 const [category,setCategory]=useState<string|null>(suggestion.category&&options.includes(suggestion.category)?suggestion.category:null);
 const [busy,setBusy]=useState(false);
 const chosen=category&&options.includes(category)?category:null;
 const details=[
  new Date(item.date+'T12:00:00').toLocaleDateString('en-IN',{day:'numeric',month:'short'}),
  item.bank,item.accountLast4?'••'+item.accountLast4:null,
  item.channel==='upi'?'UPI':item.channel==='card'?'Card':item.channel==='atm'?'ATM':null,
 ].filter(Boolean).join(' · ');
 const run=async(action:()=>Promise<void>)=>{
  if(busy)return;setBusy(true);
  try{await action()}catch(e){Alert.alert('Could not save',e instanceof Error?e.message:'Try again')}
  finally{setBusy(false)}
 };
 return <View style={{backgroundColor:colors.surface,borderColor:colors.border,borderWidth:1,borderRadius:13,padding:13,gap:10}}>
  <View style={{flexDirection:'row',alignItems:'flex-start',gap:10}}>
   <View style={{flex:1,gap:3}}>
    <Text numberOfLines={1} style={{color:colors.text,fontSize:fontSizes.input,fontFamily:fontFamilies.semibold}}>{item.merchant??'Unknown payee'}</Text>
    <Text style={{color:colors.muted,fontSize:fontSizes.caption}}>{details}</Text>
   </View>
   <Text style={{color:colors.text,fontSize:fontSizes.input,fontFamily:fontFamilies.semibold}}>{formatMoney(item.amountPaise)}</Text>
  </View>
  {household?<View style={{flexDirection:'row',padding:3,borderRadius:9,backgroundColor:colors.secondary}}>
   {(['household','personal'] as const).map(value=><Pressable key={value} accessibilityRole="button" accessibilityState={{selected:scope===value}} onPress={()=>setScope(value)}
    style={{flex:1,minHeight:32,alignItems:'center',justifyContent:'center',borderRadius:7,backgroundColor:scope===value?colors.surface:undefined}}>
    <Text style={{fontSize:fontSizes.caption,fontFamily:scope===value?fontFamilies.semibold:fontFamilies.medium,color:scope===value?(value==='household'?colors.household:colors.personal):colors.muted}}>{value==='household'?'Household':'Personal'}</Text>
   </Pressable>)}
  </View>:null}
  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{gap:6}}>
   {options.map(name=><Pressable key={name} accessibilityRole="button" accessibilityState={{selected:chosen===name}} onPress={()=>setCategory(name)}
    style={{borderWidth:1,borderRadius:16,paddingHorizontal:11,paddingVertical:6,borderColor:chosen===name?colors.household:colors.border,backgroundColor:chosen===name?colors.secondary:colors.background}}>
    <Text style={{fontSize:fontSizes.caption,color:chosen===name?colors.household:colors.text,fontFamily:chosen===name?fontFamilies.semibold:fontFamilies.regular}}>{name}</Text>
   </Pressable>)}
  </ScrollView>
  <Text numberOfLines={2} style={{color:colors.muted,fontSize:11,lineHeight:15}}>{item.preview}</Text>
  <View style={{flexDirection:'row',gap:10}}>
   <Pressable accessibilityRole="button" disabled={busy||!chosen} onPress={()=>{void run(()=>confirm(item.id,{category:chosen!,scope,note:item.merchant??''}))}}
    style={{flex:1,flexDirection:'row',gap:6,alignItems:'center',justifyContent:'center',borderRadius:10,minHeight:40,backgroundColor:colors.household,opacity:busy||!chosen?0.5:1}}>
    <Ionicons name="checkmark" size={17} color="#fff"/>
    <Text style={{color:'#fff',fontFamily:fontFamilies.semibold,fontSize:fontSizes.label}}>{chosen?'Add expense':'Choose a category'}</Text>
   </Pressable>
   <Pressable accessibilityRole="button" disabled={busy} onPress={()=>{void run(()=>dismiss(item.id))}}
    style={{paddingHorizontal:15,alignItems:'center',justifyContent:'center',borderRadius:10,minHeight:40,backgroundColor:colors.secondary}}>
    <Text style={{color:colors.text,fontFamily:fontFamilies.medium,fontSize:fontSizes.label}}>Dismiss</Text>
   </Pressable>
  </View>
 </View>;
}
