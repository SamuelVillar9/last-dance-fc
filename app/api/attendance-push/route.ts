import {dispatchAttendance} from '@/lib/attendance-push-dispatch';
export const runtime='nodejs';
export const maxDuration=60;
export async function GET(request:Request){
 const secret=process.env.CRON_SECRET;
 const token=request.headers.get('authorization');
 if(!secret||token!==`Bearer ${secret}`)return Response.json({error:'Unauthorized'},{status:401});
 try{return Response.json(await dispatchAttendance(),{headers:{'Cache-Control':'no-store'}})}
 catch(error){console.error('attendance_push_dispatch_failed',error);return Response.json({error:'Dispatch failed'},{status:500})}
}
