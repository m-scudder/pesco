import React,{useCallback,useState} from 'react';
import {Alert,ActivityIndicator,Image,Pressable,ScrollView,Text,View} from 'react-native';
import {useFocusEffect} from 'expo-router';
import {Ionicons} from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import {File} from 'expo-file-system';
import * as Crypto from 'expo-crypto';
import {supabase} from '@/lib/supabase';
import {useAppTheme} from '@/theme/ThemeContext';
import {fontFamilies,fontSizes} from '@/theme/typography';

type Receipt={id:string;storage_path:string;file_name:string;mime_type:string;url?:string};
const BUCKET='expense-receipts';
const LIMIT=5;
const MAX_BYTES=5*1024*1024;
export function ExpenseReceipts({expenseId,editable}:{expenseId:string;editable:boolean}){
 const {colors}=useAppTheme();
 const [receipts,setReceipts]=useState<Receipt[]>([]);
 const [busy,setBusy]=useState(false);
 const [error,setError]=useState('');
 const load=useCallback(async()=>{
  if(!supabase)return;
  const {data,error:readError}=await supabase.from('expense_receipts')
   .select('id,storage_path,file_name,mime_type').eq('expense_id',expenseId)
   .order('created_at',{ascending:true});
  if(readError){setError('Receipts unavailable');return}
  const next=await Promise.all((data??[]).map(async item=>{
   const {data:signed}=await supabase!.storage.from(BUCKET).createSignedUrl(item.storage_path,3600);
   return {...item,url:signed?.signedUrl};
  }));
  setReceipts(next);setError('');
 },[expenseId]);
 useFocusEffect(useCallback(()=>{void load()},[load]));
 const upload=async(uri:string,name:string,mime:string)=>{
  if(!supabase||busy)return;
  if(receipts.length>=LIMIT){Alert.alert('Receipt limit','Up to five receipts can be attached to an expense.');return}
  setBusy(true);
  const cleanMime=mime==='image/jpg'?'image/jpeg':mime;
  try{
   if(!['image/jpeg','image/png','image/webp','application/pdf'].includes(cleanMime))throw new Error('Choose a JPG, PNG, WEBP or PDF file.');
   const bytes=await new File(uri).arrayBuffer();
   if(bytes.byteLength>MAX_BYTES||bytes.byteLength===0)throw new Error('Receipt must be smaller than 5 MB.');
   const {data:user,error:authError}=await supabase.auth.getUser();
   if(authError||!user.user)throw new Error('Sign in to attach receipts.');
   const receiptId=Crypto.randomUUID();
   const ext=cleanMime==='application/pdf'?'pdf':cleanMime==='image/png'?'png':cleanMime==='image/webp'?'webp':'jpg';
   const path=expenseId+'/'+receiptId+'.'+ext;
   const storage=supabase.storage.from(BUCKET);
   const {error:uploadError}=await storage.upload(path,bytes,{contentType:cleanMime,upsert:false});
   if(uploadError)throw uploadError;
   const {error:recordError}=await supabase.from('expense_receipts').insert({
    id:receiptId,expense_id:expenseId,uploaded_by:user.user.id,storage_path:path,
    mime_type:cleanMime,file_name:name.slice(0,255),size_bytes:bytes.byteLength
   });
   if(recordError){
    await storage.remove([path]);
    throw new Error('Could not save receipt. Sync the expense and try again.');
   }
   await load();
  }catch(e){Alert.alert('Could not attach receipt',e instanceof Error?e.message:'Try again')}
  finally{setBusy(false)}
 };
 const choosePhoto=async(camera:boolean)=>{
  if(camera){
   const permission=await ImagePicker.requestCameraPermissionsAsync();
   if(!permission.granted){Alert.alert('Camera access needed','Allow camera access in Settings to take a receipt photo.');return}
  }
  const result=camera?
   await ImagePicker.launchCameraAsync({mediaTypes:['images'],quality:0.75}):
   await ImagePicker.launchImageLibraryAsync({mediaTypes:['images'],quality:0.75});
  if(result.canceled||!result.assets[0])return;
  const asset=result.assets[0];
  await upload(asset.uri,asset.fileName??'Receipt.jpg',asset.mimeType??'image/jpeg');
 };
 const chooseFile=async()=>{
  const result=await DocumentPicker.getDocumentAsync({
   type:['application/pdf','image/jpeg','image/png','image/webp'],copyToCacheDirectory:true
  });
  if(result.canceled||!result.assets[0])return;
  const asset=result.assets[0];
  await upload(asset.uri,asset.name,asset.mimeType??'application/pdf');
 };
 const choose=()=>Alert.alert('Add Receipt','Choose a source',[
  {text:'Camera',onPress:()=>{void choosePhoto(true)}},
  {text:'Photo Library',onPress:()=>{void choosePhoto(false)}},
  {text:'File',onPress:()=>{void chooseFile()}},
  {text:'Cancel',style:'cancel'}
 ]);
 const remove=(item:Receipt)=>Alert.alert('Remove Receipt?','The attached file will be deleted.',[
  {text:'Cancel',style:'cancel'},
  {text:'Remove',style:'destructive',onPress:()=>{void (async()=>{
   if(!supabase||busy)return;
   setBusy(true);
   try{
    const {error:dbError}=await supabase.from('expense_receipts').delete().eq('id',item.id);
    if(dbError)throw dbError;
    const {error:storageError}=await supabase.storage.from(BUCKET).remove([item.storage_path]);
    if(storageError)throw storageError;
    await load();
   }catch(e){Alert.alert('Could not remove receipt',e instanceof Error?e.message:'Try again')}
   finally{setBusy(false)}
  })()}}
 ]);
 return <View style={{gap:9}}>
  <View style={{flexDirection:'row',alignItems:'center',gap:9,flexWrap:'wrap'}}>
   {editable&&receipts.length<LIMIT?<Pressable accessibilityRole="button" disabled={busy} onPress={choose}
    style={{flexDirection:'row',alignItems:'center',gap:6,minHeight:44,paddingHorizontal:12,borderRadius:9,borderWidth:1,borderColor:colors.border,backgroundColor:colors.surface,opacity:busy?0.5:1}}>
    <Ionicons name="attach-outline" size={18} color={colors.text}/>
    <Text style={{fontFamily:fontFamilies.medium,fontSize:fontSizes.label,color:colors.text}}>Add Receipt</Text>
   </Pressable>:null}
   {busy?<ActivityIndicator size="small" color={colors.household}/>:null}
   {receipts.map(item=><View key={item.id} style={{width:50,height:50}}>
    <Pressable accessibilityRole="button" accessibilityLabel={'View '+item.file_name}
     onPress={()=>{if(item.url)void import('expo-linking').then(Linking=>Linking.openURL(item.url!))}}
     style={{width:44,height:44,overflow:'hidden',borderRadius:7,borderWidth:1,borderColor:colors.border,backgroundColor:colors.secondary,alignItems:'center',justifyContent:'center'}}>
     {item.mime_type.startsWith('image/')&&item.url?<Image source={{uri:item.url}} style={{width:44,height:44}}/>:
      <Ionicons name="document-text-outline" size={22} color={colors.muted}/>}
    </Pressable>
    {editable?<Pressable accessibilityRole="button" accessibilityLabel={'Remove '+item.file_name} onPress={()=>remove(item)}
     style={{position:'absolute',right:0,top:0,width:19,height:19,borderRadius:10,backgroundColor:colors.background,borderWidth:1,borderColor:colors.border,alignItems:'center',justifyContent:'center'}}>
     <Ionicons name="close" size={12} color={colors.text}/>
    </Pressable>:null}
   </View>)}
  </View>
  {error?<Text style={{color:colors.muted,fontSize:fontSizes.caption}}>{error}</Text>:null}
 </View>;
}
