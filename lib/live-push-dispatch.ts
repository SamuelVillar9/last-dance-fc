import {createClient} from '@supabase/supabase-js';
import {sendPush,type WebSubscription} from './web-push';
type Job=WebSubscription&{id:string;match_key:string;kind:string;side:string;minute:number;player_name:string|null;assist_name:string|null;home_goals:number;away_goals:number};
export async function dispatchLive(){
 const url=process.env.NEXT_PUBLIC_SUPABASE_URL,key=process.env.SUPABASE_SERVICE_ROLE_KEY;
 if(!url||!key||!process.env.VAPID_PRIVATE_KEY)return;
 const db=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
 const {data,error}=await db.rpc('live_dispatch',{p_action:'claim'});if(error)throw error;
 await Promise.all(((data??[]) as Job[]).map(async job=>{
  const label=job.kind==='goal'?'⚽ ¡GOOOL!':job.kind==='yellow'?'🟨 Tarjeta amarilla':job.kind==='kickoff'?'🏁 ¡Comienza el partido!':job.kind==='halftime'?'⏸️ Descanso':job.kind==='resume'?'▶️ Segunda parte':job.kind==='final'?'🏁 Final del partido':'🟥 Tarjeta roja';
  const name=job.player_name??'Jugador sin identificar';
  const body=['kickoff','halftime','resume','final'].includes(job.kind)?'Marcador provisional: '+job.home_goals+'-'+job.away_goals+'.':job.kind==='goal'?`${job.minute}' · ${name}. Marcador provisional ${job.home_goals}-${job.away_goals}.${job.assist_name?' Asistencia: '+job.assist_name+'.':''}`:`${job.minute}' · ${name}.`;
  let status=503;
  try{status=await sendPush(job,{title:'LAST DANCE · '+label,body,url:'/partidos/'+encodeURIComponent(job.match_key),tag:'live-'+job.id})}catch{status=503}
  const {error:ack}=await db.rpc('live_dispatch',{p_action:'finish',p_payload:{id:job.id,status}});
  if(ack)console.error('live_push_ack_failed');
 }));
}
