import {dispatchMvp} from '@/lib/mvp-push-dispatch';
export const runtime='nodejs';
export const maxDuration=60;
export async function GET(request:Request){
 const secret=process.env.CRON_SECRET;
 if(!secret||request.headers.get('authorization')!==`Bearer ${secret}`)return Response.json({error:'Unauthorized'},{status:401});
 try{return Response.json(await dispatchMvp(),{headers:{'Cache-Control':'no-store'}})}
 catch(error){console.error('mvp_push_dispatch_failed',error);return Response.json({error:'Dispatch failed'},{status:500})}
}
