import React from 'react';
import {Alert,Pressable,Text,View} from 'react-native';
import {useRouter} from 'expo-router';
import {Screen} from '@/components/Screen';
import {Body,Card,Heading} from '@/components/UI';
import {useAppTheme} from '@/theme/ThemeContext';
import {useData} from '@/data';
import type {Appearance} from '@/theme/palette';
export default function Settings(){
 const {appearance,setAppearance,colors}=useAppTheme();const {expenses,clearAll}=useData();const router=useRouter();
 return <Screen><Heading subtitle="Preferences and account">Settings</Heading><Card><Body>Appearance</Body><View style={{flexDirection:'row',gap:8}}>{(['system','light','dark'] as Appearance[]).map(value=><Pressable key={value} onPress={()=>setAppearance(value)} style={{flex:1,padding:12,alignItems:'center',borderRadius:10,backgroundColor:appearance===value?colors.secondary:colors.background}}><Text style={{color:colors.text,textTransform:'capitalize',fontWeight:appearance===value?'700':'400'}}>{value}</Text></Pressable>)}</View></Card><Card><Body>Monthly budgets</Body><Pressable onPress={()=>router.push('/budget')}><Text style={{color:colors.household}}>Set or edit optional budgets ›</Text></Pressable></Card><Card><Body>Household and invitations</Body><Body muted>TODO: Sign in, invite your partner, and sync household expenses after Supabase setup.</Body></Card><Card><Body>Profile and privacy</Body><Body muted>Local prototype. No account is connected, and your data is not uploaded.</Body></Card><Card><Body>Local data · {expenses.length} entries</Body><Pressable onPress={()=>Alert.alert('Clear local data?','All saved expenses and budgets will be deleted from this device.',[{text:'Cancel',style:'cancel'},{text:'Delete all',style:'destructive',onPress:clearAll}])}><Text style={{color:'#C54B4B'}}>Delete all local data</Text></Pressable></Card><Body muted>PESCO V1 · Local-only mode. Cloud synchronization and receipt attachments are not available yet.</Body></Screen>
}