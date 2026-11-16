'use client';
import {useCallback,useEffect,useState} from 'react';
import Link from 'next/link';
import {browserDb} from '@/lib/browser-db';
type Notice={id:string;match_key:string;kind:string;title:string;body:string;created_at:string;read_at:string|null};
type Data={items:Notice[];unread:number;attendance_push:boolean;attendance_activity_push:boolean;match_changes_push:boolean};
export function AttendancePushPanel({mode}:{mode:'settings'|'notices'}){
 const db=browserDb();const [data,setData]=useState<Data|null>(null),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const load=useCallback(async()=>{
  if(!db)return;
  const {data:session}=await db.auth.getSession();if(!session.session)return;
  const {data:result,error}=await db.rpc('attendance_notices',{p_action:'list'});
  if(!error&&result){setData(result as unknown as Data);window.dispatchEvent(new CustomEvent('attendance-notices-count',{detail:(result as unknown as Data).unread}));}
 },[db]);
 useEffect(()=>{void load()},[load]);
 async function update(payload:Record<string,boolean>){
  if(!db||busy)return;setBusy(true);setError('');
  const {data:result,error}=await db.rpc('attendance_notices',{p_action:'settings',p_payload:payload});
  if(error)setError(error.message);else if(result)setData(result as unknown as Data);
  setBusy(false);
 }
 async function read(id:string){
  if(!db)return;
  const {error}=await db.rpc('attendance_notices',{p_action:'read',p_payload:{id}});
  if(!error)void load();
 }
 if(!data)return null;
 if(mode==='notices')return <section className="attendance-push-section" aria-label="Avisos de asistencia">
  <h3>CONVOCATORIAS Y ASISTENCIA {data.unread>0&&<span>({data.unread} nuevos)</span>}</h3>
  {!data.items.length?<p className="muted">Todavía no tienes avisos de asistencia.</p>:<ul className="notices-list">
   {data.items.map(n=><li key={n.id} className={n.read_at?'':'notice-unread'}>
    <Link href={'/equipo?partido='+encodeURIComponent(n.match_key)} onClick={()=>void read(n.id)}>
     <b>{n.title}</b><span>{n.body} · {new Date(n.created_at).toLocaleDateString('es-ES')}</span>
    </Link>
   </li>)}
  </ul>}
 </section>;
 return <section className="attendance-push-section" aria-label="Preferencias de asistencia">
  <h3>CONVOCATORIAS Y ASISTENCIA</h3>
  <p className="muted">Los recordatorios se detienen cuando respondes Voy, No voy o Duda. Descanso nocturno de 23:00 a 09:00.</p>
  <label className="push-preference"><input type="checkbox" checked={data.attendance_push} disabled={busy} onChange={e=>void update({attendance_push:e.target.checked})}/> Recibir convocatorias y recordatorios de asistencia</label>
  <label className="push-preference"><input type="checkbox" checked={data.attendance_activity_push} disabled={busy} onChange={e=>void update({attendance_activity_push:e.target.checked})}/> Resúmenes agrupados de actividad de compañeros (cada 30 minutos)</label>
  <label className="push-preference"><input type="checkbox" checked={data.match_changes_push} disabled={busy} onChange={e=>void update({match_changes_push:e.target.checked})}/> Avisos de cambios importantes del partido</label>
  {error&&<p role="alert">{error}</p>}
 </section>;
}
