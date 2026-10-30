import {createClient} from '@supabase/supabase-js';
import {sendPush,type WebSubscription} from './web-push';
type Job=WebSubscription&{id:string;notification_id:string;comment_id:string;match_key:string;target_id:string;author_name:string};
export async function dispatchRincon(){
 const url=process.env.NEXT_PUBLIC_SUPABASE_URL,key=process.env.SUPABASE_SERVICE_ROLE_KEY;
 if(!url||!key||!process.env.VAPID_PRIVATE_KEY)return;
 const db=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
 const {data,error}=await db.rpc('rincon_dispatch',{p_action:'claim'});if(error)throw Error('Push queue unavailable');
 await Promise.all((data as unknown as Job[]??[]).map(async job=>{
  let status=503;try{status=await sendPush(job,{title:'LAST DANCE · Te han mencionado',body:job.author_name+' te ha mencionado en El rincón de rajar.',url:'/partidos/'+encodeURIComponent(job.match_key)+'?jugador='+encodeURIComponent(job.target_id)+'&aviso='+job.notification_id+'&comentario='+job.comment_id+'#comentario-'+job.comment_id,tag:'rincon-'+job.notification_id})}catch{/* Leave queued for bounded retry. */}
  const {error}=await db.rpc('rincon_dispatch',{p_action:'finish',p_payload:{id:job.id,status}});if(error)console.error('rincon_push_ack_failed');
 }));
}
