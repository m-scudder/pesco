import {createClient} from 'npm:@supabase/supabase-js@2';
Deno.serve(async(req)=>{
 const json=(status:number,body:object)=>new Response(JSON.stringify(body),{status,headers:{'content-type':'application/json'}});
 if(req.method!=='POST')return json(405,{error:'Method not allowed'});
 const auth=req.headers.get('authorization')||'';
 if(!auth.startsWith('Bearer '))return json(401,{error:'Authentication required'});
 const url=Deno.env.get('SUPABASE_URL');
 const serviceKey=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
 if(!url||!serviceKey)return json(500,{error:'Service unavailable'});
 const admin=createClient(url,serviceKey,{auth:{persistSession:false,autoRefreshToken:false}});
 const {data,error}=await admin.auth.getUser(auth.slice(7));
 if(error||!data.user)return json(401,{error:'Invalid session'});
 const user=data.user;
 try{
  // Ensure shared data/ownership is handled before deleting auth identity.
  const result=await admin.rpc('prepare_account_deletion',{target_user:user.id});
  if(result.error)throw result.error;
  const removed=await admin.auth.admin.deleteUser(user.id);
  if(removed.error)throw removed.error;
  return json(200,{deleted:true});
 }catch(error){
  console.error('Account deletion failed',error);
  return json(500,{error:'Unable to complete account deletion. Please retry or contact support.'});
 }
});
