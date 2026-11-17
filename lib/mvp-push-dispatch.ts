import {createClient} from '@supabase/supabase-js';
import {sendPush,type WebSubscription} from './web-push';
type Job=WebSubscription&{id:string;match_key:string;title:string;body:string};
export async function dispatchMvp(){
 const url=process.env.NEXT_PUBLIC_SUPABASE_URL,key=process.env.SUPABASE_SERVICE_ROLE_KEY;
 if(!url||!key||!process.env.VAPID_PRIVATE_KEY)throw Error('MVP push not configured');
 const db=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
 const {data:prepared,error:prepError}=await db.rpc('mvp_push_dispatch',{p_action:'prepare'});
 if(prepError)throw prepError;
 const {data,error}=await db.rpc('mvp_push_dispatch',{p_action:'claim'});
 if(error)throw error;
 const jobs=(data??[]) as Job[];
 await Promise.all(jobs.map(async job=>{
  let status=503;
  try{status=await sendPush(job,{title:job.title,body:job.body,url:'/mvp#'+encodeURIComponent(job.match_key),tag:'mvp-'+job.match_key})}catch{status=503}
  const {error:ack}=await db.rpc('mvp_push_dispatch',{p_action:'finish',p_payload:{id:job.id,status}});
  if(ack)console.error('mvp_push_ack_failed',ack);
 }));
 return {prepared,sent:jobs.filter(Boolean).length};
}
