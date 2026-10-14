import React from 'react';
import {Alert,Pressable,Switch,Text,View} from 'react-native';
import {useRouter} from 'expo-router';
import {Ionicons} from '@expo/vector-icons';
import {Screen} from '@/components/Screen';
import {useAppTheme} from '@/theme/ThemeContext';
import {useData} from '@/data';

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
 const {expenses,clearAll}=useData();
 return <Screen style={{gap:20,paddingBottom:90}}>
  <SettingsSection title="Manage">
   <SettingsRow icon="person-circle-outline" label="My profile" subtitle="Manage your name and household identity" onPress={()=>router.push('/profile')}/>
   <SettingsRow icon="people-outline" label="Household" subtitle="Members, house name and partner invitations" onPress={()=>router.push('/household')}/>
   <SettingsRow icon="wallet-outline" label="Monthly budgets" subtitle="Manage household and personal limits" onPress={()=>router.push('/budget')}/>
   <SettingsRow icon="pricetags-outline" label="Categories" subtitle="Organize your expenses" onPress={()=>router.push('/categories')} last/>
  </SettingsSection>
  <SettingsSection title="Preferences">
   <SettingsRow icon="moon-outline" label="Dark mode" subtitle="Customize the app appearance" last
    right={<Switch accessibilityLabel="Dark mode" accessibilityRole="switch" value={resolved==='dark'}
     onValueChange={enabled=>setAppearance(enabled?'dark':'light')}
     trackColor={{false:colors.secondary,true:colors.household}} thumbColor="#FFFFFF"/>}/>
  </SettingsSection>
  <SettingsSection title="Data">
   <SettingsRow icon="save-outline" label={expenses.length+' saved locally'} subtitle="Expense records stored on this device"/>
   <SettingsRow icon="trash-outline" label="Clear local data" subtitle="Remove locally saved expense records" danger last
    onPress={()=>Alert.alert('Delete local expenses?','This cannot be undone.',[
     {text:'Cancel',style:'cancel'},
     {text:'Delete',style:'destructive',onPress:clearAll}
    ])}/>
  </SettingsSection>
 </Screen>;
}
