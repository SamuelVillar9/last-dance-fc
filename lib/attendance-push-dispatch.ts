import {createClient} from '@supabase/supabase-js';
import {sendPush,type WebSubscription} from './web-push';
type Job=WebSubscription&{id:string;match_key:string;title:string;body:string};
export async function dispatchAttendance(){
 const url=process.env.NEXT_PUBLIC_SUPABASE_URL,key=process.env.SUPABASE_SERVICE_ROLE_KEY;
 if(!url||!key||!process.env.VAPID_PRIVATE_KEY)return {sent:0,configured:false};
 const db=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
 const {error:prepareError}=await db.rpc('attendance_dispatch',{p_action:'prepare'});
 if(prepareError)throw prepareError;
 const {data,error}=await db.rpc('attendance_dispatch',{p_action:'claim'});
 if(error)throw error;
 const jobs=(data??[]) as Job[];
 await Promise.all(jobs.map(async job=>{
  let status=503;
  try{status=await sendPush(job,{title:job.title,body:job.body,url:'/equipo?partido='+encodeURIComponent(job.match_key),tag:'attendance-'+job.match_key})}catch{status=503}
  const {error:ack}=await db.rpc('attendance_dispatch',{p_action:'finish',p_payload:{id:job.id,status}});
  if(ack)console.error('attendance_push_ack_failed');
 }));
 return {sent:jobs.length,configured:true};
}
