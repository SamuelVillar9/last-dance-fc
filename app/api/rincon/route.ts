import {createClient} from '@supabase/supabase-js';
import {after} from 'next/server';
import {sendPush,type WebSubscription} from '@/lib/web-push';
import {dispatchRincon} from '@/lib/push-dispatch';
export const runtime='nodejs';
export const maxDuration=60;
export async function GET(){return Response.json({configured:!!(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY&&process.env.VAPID_PRIVATE_KEY&&process.env.SUPABASE_SERVICE_ROLE_KEY),publicKey:process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY??null},{headers:{'Cache-Control':'no-store'}})}
export async function POST(request:Request){
 const origin=request.headers.get('origin');if(origin&&origin!==new URL(request.url).origin)return Response.json({error:'Origen no válido'},{status:403});
 const token=request.headers.get('authorization')??'';
 const url=process.env.NEXT_PUBLIC_SUPABASE_URL,key=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
 if(!url||!key)return Response.json({error:'Servicio no disponible'},{status:503});
 if(!token.startsWith('Bearer '))return Response.json({error:'Inicia sesión'},{status:401});
 const db=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false},global:{headers:{Authorization:token}}});
 const {data:auth,error:authError}=await db.auth.getUser(token.slice(7));
 if(authError||!auth.user)return Response.json({error:'Vuelve a iniciar sesión'},{status:401});
 try{
  const raw=await request.text();if(raw.length>15000)return Response.json({error:'Solicitud demasiado grande'},{status:413});const payload=JSON.parse(raw);
  if(payload.action==='save'){
   const {data,error}=await db.rpc('save_rincon_comment',{p_match_key:payload.match_key,p_target_id:payload.target_id,p_body:payload.body,p_mentions:payload.mentions??[]});
   if(error)return Response.json({error:error.message},{status:400});
   after(async()=>{try{await dispatchRincon()}catch{console.error('rincon_push_dispatch_failed')}});
   return Response.json({id:data});
  }
  if(payload.action==='test'){
   const secret=process.env.SUPABASE_SERVICE_ROLE_KEY;if(!secret)return Response.json({error:'Las notificaciones todavía no están configuradas'},{status:503});
   const {error}=await db.rpc('rincon_notices',{p_action:'test',p_payload:{endpoint:payload.endpoint}});if(error)return Response.json({error:error.message},{status:400});
   const server=createClient(url,secret,{auth:{persistSession:false,autoRefreshToken:false}});
   const {data,error:lookupError}=await server.rpc('rincon_dispatch',{p_action:'test',p_payload:{user_id:auth.user.id,endpoint:payload.endpoint}});
   if(lookupError||!data)return Response.json({error:'Activa las notificaciones en este dispositivo'},{status:400});
   const status=await sendPush(data as unknown as WebSubscription,{title:'LAST DANCE · Prueba recibida',body:'¡Todo listo! Te avisaremos cuando te mencionen en El rincón de rajar.',url:'/equipo?ajustes=notificaciones',tag:'rincon-test'});
   return status>=200&&status<300?Response.json({ok:true}):Response.json({error:'El servicio push no ha aceptado la prueba. Prueba a desactivar y volver a activar este dispositivo.'},{status:502});
  }
  return Response.json({error:'Acción no válida'},{status:400});
 }catch{return Response.json({error:'No se pudo completar la operación. Puedes reintentarlo.'},{status:500})}
}
