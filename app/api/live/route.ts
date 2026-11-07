import {timingSafeEqual} from 'node:crypto';
import {createClient} from '@supabase/supabase-js';
import {after} from 'next/server';
import {dispatchLive} from '@/lib/live-push-dispatch';
export const runtime='nodejs';
export const maxDuration=60;
export async function POST(request:Request){
 const origin=request.headers.get('origin');if(origin&&origin!==new URL(request.url).origin)return Response.json({error:'Origen no válido'},{status:403});
 const token=request.headers.get('authorization')??'';
 if(!token.startsWith('Bearer '))return Response.json({error:'Inicia sesión'},{status:401});
 const url=process.env.NEXT_PUBLIC_SUPABASE_URL,key=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
 if(!url||!key)return Response.json({error:'Servicio no disponible'},{status:503});
 const db=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
 const {data,error}=await db.auth.getUser(token.slice(7));if(error||!data.user)return Response.json({error:'No autorizado'},{status:401});
 // No payload or user-selected recipient is trusted: worker claims its own secured outbox.
 after(async()=>{try{await dispatchLive()}catch{console.error('live_push_dispatch_failed')}});
 return Response.json({queued:true});
}

export async function GET(request:Request){
 const expected=process.env.CRON_SECRET?'Bearer '+process.env.CRON_SECRET:'';
 const actual=request.headers.get('authorization')??'';
 if(!expected||expected.length!==actual.length||!timingSafeEqual(Buffer.from(actual),Buffer.from(expected)))return Response.json({error:'No autorizado'},{status:401});
 try{await dispatchLive();return Response.json({ok:true})}catch{return Response.json({error:'No se pudo procesar la cola'},{status:503})}
}
