import {fontSizes,fontFamilies,fontWeights} from '@/theme/typography';
import React,{useCallback,useState} from 'react';
import {Pressable,Switch,Text,View} from 'react-native';
import {useFocusEffect,useRouter} from 'expo-router';
import Constants from 'expo-constants';
import {Ionicons} from '@expo/vector-icons';
import {Screen} from '@/components/Screen';
import {useAppTheme} from '@/theme/ThemeContext';
import {useData} from '@/data';
import {useAuth} from '@/lib/AuthContext';
import {googleDisplayName} from '@/lib/profileName';
import {supabase} from '@/lib/supabase';
import {useAccountActions} from '@/lib/useAccountActions';

function SettingsSection({title,children}:{title:string;children:React.ReactNode}){
 const {colors}=useAppTheme();
 return <View style={{backgroundColor:colors.surface,borderRadius:19,overflow:'hidden',borderWidth:1,borderColor:colors.border}}>
  <View style={{paddingHorizontal:17,paddingTop:18,paddingBottom:8,flexDirection:'row',alignItems:'center',gap:11}}>
   <View style={{width:3,height:25,borderRadius:2,backgroundColor:colors.household}}/>
   <Text style={{color:colors.text,fontSize:fontSizes.section,fontFamily:fontFamilies.displayBold}}>{title}</Text>
  </View>
  <View>{children}</View>
 </View>;
}

function SettingsRow({icon,label,subtitle,onPress,right,danger=false,last=false}:{
 icon:keyof typeof Ionicons.glyphMap;label:string;subtitle?:string;
 onPress?:()=>void;right?:React.ReactNode;danger?:boolean;last?:boolean;
}){
 const {colors}=useAppTheme();
 return <View>
  <Pressable accessibilityRole={onPress?'button':undefined} onPress={onPress} disabled={!onPress&&!right}
   style={{flexDirection:'row',alignItems:'center',gap:15,paddingHorizontal:20,paddingVertical:14,minHeight:58}}>
   <Ionicons name={icon} size={21} color={danger?'#E35D5B':colors.muted}/>
   <View style={{flex:1,gap:3}}>
    <Text style={{color:danger?'#E35D5B':colors.text,fontSize:fontSizes.body,fontFamily:fontFamilies.medium}}>{label}</Text>
    {subtitle?<Text style={{color:colors.muted,fontSize:fontSizes.caption,fontFamily:fontFamilies.regular,lineHeight:16}}>{subtitle}</Text>:null}
   </View>
   {right??(onPress?<Ionicons name="chevron-forward" size={19} color={colors.muted}/>:null)}
  </Pressable>
  {!last?<View style={{height:1,backgroundColor:colors.border,marginLeft:55,marginRight:18}}/>:null}
 </View>;
}

export default function Settings(){
 const router=useRouter();
 const {resolved,setAppearance,colors}=useAppTheme();
 const {household,pendingEntries,pendingEditCount,demoEnabled,setDemoEnabled}=useData();
 const {user}=useAuth();
 const {logout,deleteAccount,loggingOut,deleting}=useAccountActions();
 const [displayName,setDisplayName]=useState(googleDisplayName(user));
 useFocusEffect(useCallback(()=>{let active=true;
  setDisplayName(googleDisplayName(user));
  if(supabase&&user)void supabase.from('profiles').select('display_name').eq('id',user.id).maybeSingle().then(({data})=>{
   if(active&&data?.display_name?.trim())setDisplayName(data.display_name.trim());
  });
  return()=>{active=false};
 },[user?.id]));
 const version=Constants.expoConfig?.version??'0.1.0';
 return <Screen style={{gap:16,paddingBottom:95,flexGrow:1}}>
  <Pressable accessibilityRole="button" accessibilityLabel="Edit my profile" onPress={()=>router.push('/profile')}
   style={{flexDirection:'row',alignItems:'center',gap:12,paddingVertical:6,paddingHorizontal:3}}>
   <View style={{width:54,height:54,borderRadius:27,backgroundColor:colors.secondary,alignItems:'center',justifyContent:'center'}}>
    <Text style={{fontSize:fontSizes.title,fontFamily:fontFamilies.displayBold,color:colors.household}}>{(displayName[0]||'P').toLocaleUpperCase()}</Text>
   </View>
   <View style={{flex:1,gap:3}}>
    <Text numberOfLines={1} style={{fontSize:fontSizes.section,fontFamily:fontFamilies.semibold,color:colors.text}}>{displayName}</Text>
    <Text numberOfLines={1} style={{fontSize:fontSizes.caption,color:colors.muted}}>{user?.email??'Google account'}</Text>
   </View>
   <Ionicons name="chevron-forward" size={18} color={colors.muted}/>
  </Pressable>
  <SettingsSection title="Manage">
   {household?<SettingsRow icon="people-outline" label="Household" subtitle="Members, house name and partner invitations" onPress={()=>router.push('/household')}/>:null}
   <SettingsRow icon="repeat-outline" label="Recurring bills" subtitle="Automatically record monthly personal expenses" onPress={()=>router.push('/recurring')}/>
   <SettingsRow icon="wallet-outline" label="Monthly budgets" subtitle="Manage household and personal limits" onPress={()=>router.push('/budget')}/>
   <SettingsRow icon="pricetags-outline" label="Categories" subtitle="Organize your expenses" onPress={()=>router.push('/categories')} last/>
  </SettingsSection>
  <SettingsSection title="Preferences">
   <SettingsRow icon="moon-outline" label="Dark mode" subtitle="Customize the app appearance" last
    right={<Switch accessibilityLabel="Dark mode" accessibilityRole="switch" value={resolved==='dark'}
     onValueChange={enabled=>setAppearance(enabled?'dark':'light')}
     trackColor={{false:colors.secondary,true:colors.household}} thumbColor="#FFFFFF"/>}/>
  </SettingsSection>
  {__DEV__?<SettingsSection title="Development">
   <SettingsRow icon="flask-outline" label="Sample expenses" subtitle="Show read-only demo records for the past 4 months" last
    right={<Switch accessibilityLabel="Show sample expenses" accessibilityRole="switch" value={demoEnabled}
     onValueChange={setDemoEnabled} trackColor={{false:colors.secondary,true:colors.household}} thumbColor="#FFFFFF"/>}/>
  </SettingsSection>:null}
  <SettingsSection title="Data">
   <SettingsRow icon="time-outline" label="Expense history & CSV" subtitle="Search all dates and share CSV records" onPress={()=>router.push('/history')}/>
   <SettingsRow icon="cloud-upload-outline" label="Pending uploads" subtitle={pendingEntries.length+pendingEditCount>0?(pendingEntries.length+pendingEditCount)+" pending change(s)":"No pending uploads"} onPress={()=>router.push('/sync')} last/>

  </SettingsSection>
  <View style={{height:8}}/>
  <View style={{gap:10,alignItems:'center'}}>
   <Pressable accessibilityRole="button" disabled={loggingOut||deleting} onPress={logout} style={{width:'100%',minHeight:46,backgroundColor:colors.secondary,borderWidth:1,borderColor:colors.border,borderRadius:10,flexDirection:'row',alignItems:'center',justifyContent:'center',gap:8,opacity:loggingOut||deleting?0.6:1}}>
    <Ionicons name="log-out-outline" size={18} color={colors.text}/><Text style={{color:colors.text,fontSize:fontSizes.body,fontFamily:fontFamilies.semibold}}>{loggingOut?'Logging out…':'Log Out'}</Text>
   </Pressable>
   <Pressable accessibilityRole="button" disabled={deleting||loggingOut} onPress={deleteAccount} style={{minHeight:42,alignItems:'center',justifyContent:'center',paddingHorizontal:16,opacity:deleting||loggingOut?0.6:1}}>
    <Text style={{color:'#C94F4F',fontSize:fontSizes.label,fontFamily:fontFamilies.semibold}}>{deleting?'Deleting account…':'Delete Account'}</Text>
   </Pressable>
   <Text style={{fontSize:fontSizes.caption,color:colors.muted,textAlign:'center',marginTop:4}}>PESCO · v{version}</Text>
  </View>
 </Screen>;
}
