import * as WebBrowser from 'expo-web-browser';
import {supabase} from './supabase';
import {ensureGoogleProfile} from './profileName';

const redirectTo='pesco://auth/callback';

function callbackCode(url:string){
 const hash=url.includes('#')?url.slice(url.indexOf('#')+1):'';
 const query=url.includes('?')?url.slice(url.indexOf('?')+1).split('#')[0]:'';
 const params=new URLSearchParams(query);
 const fragment=new URLSearchParams(hash);
 const failure=params.get('error_description')||params.get('error')||fragment.get('error_description')||fragment.get('error');
 if(failure)throw new Error(failure);
 return params.get('code');
}
export async function googleAuth(mode:'link'|'sign-in'){
 if(!supabase)throw new Error('Supabase is not configured.');
 const before=mode==='link'?(await supabase.auth.getUser()).data.user?.id:null;
 if(mode==='link'&&!before)throw new Error('You must be signed in to link Google.');
 const provider='google';
 const response=mode==='link'
  ?await supabase.auth.linkIdentity({provider,options:{redirectTo,skipBrowserRedirect:true}})
  :await supabase.auth.signInWithOAuth({provider:'google',options:{redirectTo,skipBrowserRedirect:true}});
 if(response.error)throw response.error;
 if(!response.data.url)throw new Error('Authentication URL unavailable');
 const result=await WebBrowser.openAuthSessionAsync(response.data.url,redirectTo);
 if(result.type!=='success')return false;
 await completeGoogleSignIn(result.url,mode,before);

 return true;
}

/** Handles both the in-app browser result and the Android deep-link route. */
const callbackAttempts=new Map<string,Promise<void>>();
export function completeGoogleSignIn(url:string,mode:'link'|'sign-in'='sign-in',before:string|null=null):Promise<void>{
 const existing=callbackAttempts.get(url);
 if(existing)return existing;
 const attempt=(async()=>{
  if(!supabase)throw new Error('Supabase is not configured.');
  // Raw access/refresh tokens in a deep link are never accepted: any app or web
  // page can open pesco://auth/callback. Only a PKCE code started on this device works.
  const code=callbackCode(url);
  if(!code)throw new Error('Provider did not return a valid authorization response');
  const {error:exchangeError}=await supabase.auth.exchangeCodeForSession(code);
  if(exchangeError)throw exchangeError;
  const {data,error}=await supabase.auth.getUser();
  if(error||!data.user)throw error??new Error('Unable to verify sign-in');
  if(mode==='link'&&before&&data.user.id!==before)throw new Error('Account identity unexpectedly changed. Stop and contact support.');
  try{await ensureGoogleProfile(data.user)}catch(e){console.warn('Unable to initialize Google profile',e)}
 })();
 callbackAttempts.set(url,attempt);
 return attempt;
}
