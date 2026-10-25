import React,{useCallback,useEffect,useState} from 'react';
import {ActivityIndicator,Alert,Pressable,ScrollView,Text,View} from 'react-native';
import {Ionicons} from '@expo/vector-icons';
import {useRouter} from 'expo-router';
import {useAppTheme} from '@/theme/ThemeContext';
import {fontSizes,fontFamilies} from '@/theme/typography';
import {useAuth} from '@/lib/AuthContext';
import {useData} from '@/data';
import {supabase} from '@/lib/supabase';
import {getPlusPlans,getPlusCustomerInfo,hasActivePlusEntitlement,isPlusBillingConfigured,purchasePlusPlan,restorePlusPurchases,type PlusPlan} from '@/lib/plusBilling';

const features=[
 {icon:'people-outline' as const,title:'More people at home',detail:'Expand your household from 2 to 6 members'},
 {icon:'receipt-outline' as const,title:'Receipts on expenses',detail:'Add photos or files to keep proof of purchases'},
 {icon:'options-outline' as const,title:'More category budgets',detail:'Set spending limits for every category'},
 {icon:'stats-chart-outline' as const,title:'Deeper insights',detail:'Compare spending across months and members'},
];

type Entitlement={tier:string;valid_until:string|null};

export default function Plus(){
 const {colors}=useAppTheme();
 const router=useRouter();
 const {user}=useAuth();
 const {household}=useData();
 const [plans,setPlans]=useState<PlusPlan[]>([]);
 const [selectedPlan,setSelectedPlan]=useState<string|null>(null);
 const [loading,setLoading]=useState(true);
 const [busy,setBusy]=useState(false);
 const [error,setError]=useState<string|null>(null);
 const [entitlement,setEntitlement]=useState<Entitlement|null>(null);
 const [purchaseAwaitingVerification,setPurchaseAwaitingVerification]=useState(false);
 const billingConfigured=isPlusBillingConfigured();
 const plusActive=entitlement?.tier==='plus'&&Boolean(entitlement.valid_until)&&new Date(entitlement!.valid_until!).getTime()>Date.now();

 const refreshEntitlement=useCallback(async()=>{
  if(!supabase||!household?.id){setEntitlement(null);return null}
  const {data,error:queryError}=await supabase.from('household_entitlements')
   .select('tier,valid_until').eq('household_id',household.id).maybeSingle();
  if(queryError)throw queryError;
  const next=(data??null) as Entitlement|null;
  setEntitlement(next);
  return next;
 },[household?.id]);

 const waitForVerifiedEntitlement=useCallback(async()=>{
  for(let attempt=0;attempt<6;attempt++){
   const current=await refreshEntitlement();
   if(current?.tier==='plus'&&current.valid_until&&new Date(current.valid_until).getTime()>Date.now()){
    setPurchaseAwaitingVerification(false);
    return current;
   }
   if(attempt<5)await new Promise(resolve=>setTimeout(resolve,2000));
  }
  return null;
 },[refreshEntitlement]);

 useEffect(()=>{
  let active=true;
  setLoading(true);setError(null);
  void (async()=>{
   try{
    await refreshEntitlement();
    if(billingConfigured&&user?.id&&household?.id){
     const available=await getPlusPlans(user.id);
     const customerInfo=await getPlusCustomerInfo(user.id);
     if(!active)return;
     setPurchaseAwaitingVerification(hasActivePlusEntitlement(customerInfo));
     setPlans(available);
     setSelectedPlan(current=>current&&available.some(p=>p.id===current)?current:available[0]?.id??null);
    }else{
     setPlans([]);setSelectedPlan(null);setPurchaseAwaitingVerification(false);
    }
   }catch(e){
    if(active)setError(e instanceof Error?e.message:'Could not load PESCO Plus details.');
   }finally{if(active)setLoading(false)}
  })();
  return()=>{active=false};
 },[billingConfigured,user?.id,household?.id,refreshEntitlement]);

 const handlePurchase=async()=>{
  if(!user?.id||!household?.id||!selectedPlan)return;
  const plan=plans.find(p=>p.id===selectedPlan);
  if(!plan)return;
  setBusy(true);setError(null);
  let storePurchaseCompleted=false;
  try{
   const customerInfo=await purchasePlusPlan(user.id,plan);
   storePurchaseCompleted=true;
   setPurchaseAwaitingVerification(hasActivePlusEntitlement(customerInfo));
   const updated=await waitForVerifiedEntitlement();
   if(updated){
    Alert.alert('PESCO Plus is active','Your household Plus access has been verified.');
   }else{
    Alert.alert('Purchase received','Your store purchase completed, but household access is waiting for server verification. Do not purchase again. Check again shortly or contact support if it does not activate.');
   }
  }catch(e){
   const purchaseError=e as {userCancelled?:boolean;message?:string};
   if(storePurchaseCompleted){
    setPurchaseAwaitingVerification(true);
    setError('Your store purchase completed, but PESCO could not verify household access yet. Do not purchase again; restore purchases or reopen this screen later.');
   }else if(!purchaseError.userCancelled)setError(purchaseError.message??'The purchase could not be completed. Please try again.');
  }finally{setBusy(false)}
 };

 const handleRestore=async()=>{
  if(!user?.id||!household?.id)return;
  setBusy(true);setError(null);
  try{
   const customerInfo=await restorePlusPurchases(user.id);
   setPurchaseAwaitingVerification(hasActivePlusEntitlement(customerInfo));
   const updated=await waitForVerifiedEntitlement();
   if(updated)
    Alert.alert('Purchases restored','PESCO Plus is active for your household.');
   else Alert.alert('Restore checked','No active, server-verified PESCO Plus subscription was found for this household.');
  }catch(e){setError(e instanceof Error?e.message:'Could not restore purchases. Please try again.')}
  finally{setBusy(false)}
 };

 return <ScrollView style={{flex:1,backgroundColor:colors.background}} contentContainerStyle={{padding:20,paddingBottom:48,gap:20}}>
  <View style={{alignItems:'center',gap:9,paddingTop:20}}>
   <Ionicons name="diamond-outline" size={32} color={colors.household}/>
   <Text style={{fontFamily:fontFamilies.displayBold,fontSize:fontSizes.summary,color:colors.text}}>More for your household</Text>
   <Text style={{fontSize:fontSizes.body,color:colors.muted,textAlign:'center'}}>One plan. Everyone included.</Text>
  </View>
  <View style={{backgroundColor:colors.surface,borderRadius:14,borderColor:colors.border,borderWidth:1,paddingHorizontal:16}}>
   {features.map((item,index)=><View key={item.title} style={{flexDirection:'row',alignItems:'center',gap:13,paddingVertical:15,borderBottomWidth:index===features.length-1?0:1,borderColor:colors.border}}>
    <Ionicons name={item.icon} size={20} color={colors.household}/>
    <View style={{flex:1,gap:3}}>
     <Text style={{fontFamily:fontFamilies.semibold,fontSize:fontSizes.body,color:colors.text}}>{item.title}</Text>
     <Text style={{fontFamily:fontFamilies.regular,fontSize:fontSizes.caption,color:colors.muted}}>{item.detail}</Text>
    </View>
   </View>)}
  </View>
  <View style={{gap:10}}>
   <Text style={{fontFamily:fontFamilies.semibold,fontSize:fontSizes.body,color:colors.text}}>Your plan</Text>
   {loading?<View style={{padding:20,alignItems:'center'}}><ActivityIndicator color={colors.household}/></View>:plusActive?
    <View style={{padding:16,borderRadius:12,borderWidth:1,borderColor:colors.household,backgroundColor:colors.surface,gap:5}}>
     <Text style={{fontFamily:fontFamilies.semibold,fontSize:fontSizes.body,color:colors.text}}>PESCO Plus is active</Text>
     <Text style={{fontSize:fontSizes.caption,color:colors.muted}}>Household access is verified by PESCO.</Text>
    </View>:
    billingConfigured&&!household?<View style={{padding:15,borderRadius:12,borderWidth:1,borderColor:colors.border,backgroundColor:colors.surface,gap:5}}><Text style={{fontFamily:fontFamilies.semibold,fontSize:fontSizes.body,color:colors.text}}>Set up your household first</Text><Text style={{fontSize:fontSizes.caption,color:colors.muted,lineHeight:19}}>Create or join a household before subscribing to a shared plan.</Text></View>:billingConfigured&&plans.length>0?plans.map(plan=>
     <Pressable key={plan.id} accessibilityRole="radio" accessibilityState={{selected:selectedPlan===plan.id}} onPress={()=>setSelectedPlan(plan.id)}
      style={{flexDirection:'row',alignItems:'center',padding:14,borderRadius:12,borderWidth:1,borderColor:selectedPlan===plan.id?colors.household:colors.border,backgroundColor:colors.surface,gap:10}}>
      <Ionicons name={selectedPlan===plan.id?'radio-button-on':'radio-button-off'} size={20} color={selectedPlan===plan.id?colors.household:colors.muted}/>
      <Text style={{fontSize:fontSizes.body,color:colors.text,fontFamily:fontFamilies.medium,flex:1}}>{plan.title}</Text>
      <Text style={{fontSize:fontSizes.body,color:colors.text,fontFamily:fontFamilies.semibold}}>{plan.price}</Text>
     </Pressable>):
    <View style={{padding:15,borderRadius:12,borderWidth:1,borderColor:colors.border,backgroundColor:colors.surface,gap:5}}>
     <Text style={{fontFamily:fontFamilies.semibold,fontSize:fontSizes.body,color:colors.text}}>Subscriptions are not enabled yet</Text>
     <Text style={{fontSize:fontSizes.caption,color:colors.muted,lineHeight:19}}>Plans and localized prices will appear here after store products, RevenueCat, and server verification are configured.</Text>
    </View>}
  </View>
  {error?<Text accessibilityRole="alert" style={{fontSize:fontSizes.caption,color:'#C94F4F'}}>{error}</Text>:null}
  {billingConfigured&&!plusActive&&!purchaseAwaitingVerification?
   <Pressable accessibilityRole="button" disabled={busy||loading||!selectedPlan} onPress={handlePurchase} style={{minHeight:48,backgroundColor:colors.household,borderRadius:10,alignItems:'center',justifyContent:'center',opacity:busy||loading||!selectedPlan?0.6:1}}>
    {busy?<ActivityIndicator color="#FFFFFF"/>:<Text style={{fontFamily:fontFamilies.semibold,fontSize:fontSizes.body,color:'#FFFFFF'}}>Upgrade to Plus</Text>}
   </Pressable>:null}
  {billingConfigured&&household?
   <Pressable accessibilityRole="button" disabled={busy||loading} onPress={handleRestore} style={{minHeight:44,alignItems:'center',justifyContent:'center',opacity:busy||loading?0.6:1}}>
    <Text style={{fontFamily:fontFamilies.medium,fontSize:fontSizes.body,color:colors.household}}>Restore purchases</Text>
   </Pressable>:null}
  {plusActive?
   <Pressable accessibilityRole="button" onPress={()=>router.back()} style={{minHeight:48,backgroundColor:colors.household,borderRadius:10,alignItems:'center',justifyContent:'center'}}>
    <Text style={{fontFamily:fontFamilies.semibold,fontSize:fontSizes.body,color:'#FFFFFF'}}>Done</Text>
   </Pressable>:null}
  <Text style={{color:colors.muted,fontSize:fontSizes.caption,textAlign:'center'}}>Purchases are enabled only after server-side verification is configured. Access is granted by the verified household entitlement, not the purchase screen.</Text>
 </ScrollView>;
}
