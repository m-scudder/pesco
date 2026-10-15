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
 return <View style={{gap:8}}>
  <Text style={{color:colors.muted,fontSize:11,fontFamily:'Inter_600SemiBold',letterSpacing:0.9,textTransform:'uppercase',paddingHorizontal:4}}>{title}</Text>
  <View style={{backgroundColor:colors.surface,borderRadius:15,borderWidth:1,borderColor:colors.border,overflow:'hidden'}}>{children}</View>
 </View>;
}

function SettingsRow({icon,label,subtitle,onPress,right,danger=false,last=false}:{
 icon:keyof typeof Ionicons.glyphMap;label:string;subtitle?:string;
 onPress?:()=>void;right?:React.ReactNode;danger?:boolean;last?:boolean;
}){
 const {colors}=useAppTheme();
 return <View>
  <Pressable accessibilityRole={onPress?'button':undefined} onPress={onPress} disabled={!onPress&&!right}
   style={{flexDirection:'row',alignItems:'center',gap:12,paddingHorizontal:14,paddingVertical:12,minHeight:62}}>
   <View style={{width:36,height:36,borderRadius:10,backgroundColor:colors.secondary,justifyContent:'center',alignItems:'center'}}>
    <Ionicons name={icon} size={19} color={danger?'#E35D5B':colors.household}/>
   </View>
   <View style={{flex:1,gap:3}}>
    <Text style={{color:danger?'#E35D5B':colors.text,fontSize:14,fontFamily:'Inter_600SemiBold'}}>{label}</Text>
    {subtitle?<Text style={{color:colors.muted,fontSize:12,fontFamily:'Inter_400Regular',lineHeight:17}}>{subtitle}</Text>:null}
   </View>
   {right??(onPress?<Ionicons name="chevron-forward" size={17} color={colors.muted}/>:null)}
  </Pressable>
  {!last?<View style={{height:1,backgroundColor:colors.border,marginLeft:62}}/>:null}
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
 return <Screen style={{gap:18,paddingBottom:95,flexGrow:1}}>
  <Pressable accessibilityRole="button" accessibilityLabel="Edit my profile" onPress={()=>router.push('/profile')}
   style={{flexDirection:'row',alignItems:'center',gap:12,paddingVertical:6,paddingHorizontal:3}}>
   <View style={{width:54,height:54,borderRadius:27,backgroundColor:colors.secondary,alignItems:'center',justifyContent:'center'}}>
    <Text style={{fontSize:22,fontFamily:'PlusJakartaSans_700Bold',color:colors.household}}>{(displayName[0]||'P').toLocaleUpperCase()}</Text>
   </View>
   <View style={{flex:1,gap:3}}>
    <Text numberOfLines={1} style={{fontSize:16,fontFamily:'Inter_600SemiBold',color:colors.text}}>{displayName}</Text>
    <Text numberOfLines={1} style={{fontSize:12,color:colors.muted}}>{user?.email??'Google account'}</Text>
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
  <View style={{flexGrow:1,minHeight:30}}/>
  <View style={{gap:10,alignItems:'center'}}>
   <Pressable accessibilityRole="button" disabled={loggingOut||deleting} onPress={logout} style={{width:'100%',minHeight:46,backgroundColor:colors.secondary,borderWidth:1,borderColor:colors.border,borderRadius:10,flexDirection:'row',alignItems:'center',justifyContent:'center',gap:8,opacity:loggingOut||deleting?0.6:1}}>
    <Ionicons name="log-out-outline" size={18} color={colors.text}/><Text style={{color:colors.text,fontSize:14,fontFamily:'Inter_600SemiBold'}}>{loggingOut?'Logging out…':'Log out'}</Text>
   </Pressable>
   <Pressable accessibilityRole="button" disabled={deleting||loggingOut} onPress={deleteAccount} style={{minHeight:42,alignItems:'center',justifyContent:'center',paddingHorizontal:16,opacity:deleting||loggingOut?0.6:1}}>
    <Text style={{color:'#C94F4F',fontSize:13,fontFamily:'Inter_600SemiBold'}}>{deleting?'Deleting account…':'Delete account'}</Text>
   </Pressable>
   <Text style={{fontSize:11,color:colors.muted,textAlign:'center',marginTop:4}}>PESCO · v{version}</Text>
  </View>
 </Screen>;
}
