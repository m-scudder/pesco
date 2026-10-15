import * as AppleAuthentication from 'expo-apple-authentication';
import * as Crypto from 'expo-crypto';
import {Platform} from 'react-native';
import {supabase} from './supabase';
import {ensureGoogleProfile} from './profileName';

export async function nativeAppleSignIn(){
 if(Platform.OS!=='ios')throw new Error('Sign in with Apple is available only on iOS.');
 if(!supabase)throw new Error('Supabase is not configured.');
 if(!(await AppleAuthentication.isAvailableAsync()))throw new Error('Sign in with Apple is unavailable on this device.');

 // Apple receives the SHA-256 nonce; Supabase verifies using the original nonce.
 const nonce=Crypto.randomUUID().replace(/-/g,'');
 const hashedNonce=await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256,nonce);
 let credential:AppleAuthentication.AppleAuthenticationCredential;
 try{
  credential=await AppleAuthentication.signInAsync({
   requestedScopes:[AppleAuthentication.AppleAuthenticationScope.FULL_NAME,AppleAuthentication.AppleAuthenticationScope.EMAIL],
   nonce:hashedNonce
  });
 }catch(error){
  if(error instanceof Error&&(error as Error&{code?:string}).code==='ERR_REQUEST_CANCELED')return false;
  throw error;
 }
 if(!credential.identityToken)throw new Error('Apple did not provide a verified identity token.');
 const {data,error}=await supabase.auth.signInWithIdToken({
  provider:'apple',token:credential.identityToken,nonce
 });
 if(error)throw error;
 if(!data.user)throw new Error('Apple sign-in did not return an account.');
 try{
  const given=credential.fullName?.givenName?.trim()??'';
  const family=credential.fullName?.familyName?.trim()??'';
  const appleName=[given,family].filter(Boolean).join(' ');
  if(appleName){
   const {data:profile,error:readError}=await supabase.from('profiles')
    .select('display_name').eq('id',data.user.id).maybeSingle();
   if(readError)throw readError;
   if(!profile?.display_name?.trim()||profile.display_name==='Member'){
    const {error:saveError}=await supabase.from('profiles')
     .upsert({id:data.user.id,display_name:appleName},{onConflict:'id'});
    if(saveError)throw saveError;
   }
  }else{
   await ensureGoogleProfile(data.user);
  }
 }catch(error){console.warn('Could not initialize profile',error)}
 return true;
}
