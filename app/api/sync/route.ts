import{timingSafeEqual}from'node:crypto';import{createClient}from'@supabase/supabase-js';import{fetchLeague}from'@/lib/league-import';
export const maxDuration=60;
export async function GET(request:Request){return sync(request,true)}
export async function POST(request:Request){return sync(request,false)}
async function sync(request:Request,cron:boolean){const url=process.env.NEXT_PUBLIC_SUPABASE_URL,key=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;if(!url||!key)return Response.json({error:'Servicio pendiente de configuración'},{status:503});const token=request.headers.get('authorization')??'';const secret=process.env.CRON_SECRET;let pSecret='';
 if(cron){const expected=secret?`Bearer ${secret}`:'';if(!expected||token.length!==expected.length||!timingSafeEqual(Buffer.from(token),Buffer.from(expected)))return Response.json({error:'No autorizado'},{status:401});pSecret=secret!;}
 const client=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false},global:cron?{}:{headers:{Authorization:token}}});
 if(!cron){const{data,error}=await client.auth.getUser(token.replace(/^Bearer /,''));if(error||!data.user)return Response.json({error:'No autorizado'},{status:401});const a=await client.from('admins').select('user_id').eq('user_id',data.user.id).maybeSingle();if(!a.data)return Response.json({error:'Acceso denegado'},{status:403});}
 try{const data=await fetchLeague();const r=await client.rpc('import_league',{p_data:data,p_secret:pSecret});if(r.error)throw r.error;return Response.json({ok:true,updatedAt:data.updatedAt});}catch{return Response.json({error:'No se pudo actualizar. Se conservan los últimos datos válidos. Si acabas de actualizar, espera un minuto.'},{status:502});}}
