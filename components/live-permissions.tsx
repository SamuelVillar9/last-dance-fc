'use client';
import {useEffect,useState} from 'react';
import {browserDb} from '@/lib/browser-db';
type Member={user_id:string;name:string;number:number;can_record:boolean;can_control:boolean};
export function LivePermissions(){
 const [members,setMembers]=useState<Member[]>([]),[busy,setBusy]=useState(''),[error,setError]=useState('');
 const db=browserDb();
 async function refresh(){if(!db)return;const {data,error}=await db.rpc('live_admin_permissions' as never);if(error)setError(error.message);else setMembers((data??[]) as Member[])}
 useEffect(()=>{void refresh()},[]);
 async function change(m:Member,field:'can_record'|'can_control',value:boolean){if(!db)return;setBusy(m.user_id);setError('');const next={...m,[field]:value};const {error}=await db.rpc('live_set_permission' as never,{p_user:m.user_id,p_record:next.can_record,p_control:next.can_control} as never);if(error)setError(error.message);else await refresh();setBusy('')}
 return (
  <section className="admin-card">
   <h2>PERMISOS · PARTIDO EN DIRECTO</h2>
   <p className="muted">Solo el administrador puede autorizar anotadores. Los permisos se aplican a todos los partidos y se pueden retirar en cualquier momento.</p>
   {members.map(m=>(
    <fieldset className="live-permission-player" key={m.user_id}>
     <legend>#{m.number} {m.name}</legend>
     <div className="live-permission-options">
      <label>
       <input type="checkbox" checked={m.can_record} disabled={busy===m.user_id} onChange={e=>void change(m,'can_record',e.target.checked)}/>
       <span>Anotar goles y tarjetas</span>
      </label>
      <label>
       <input type="checkbox" checked={m.can_control} disabled={busy===m.user_id} onChange={e=>void change(m,'can_control',e.target.checked)}/>
       <span>Iniciar y finalizar</span>
      </label>
     </div>
    </fieldset>
   ))}
   {!members.length&&<p className="muted">No hay cuentas de jugadores vinculadas.</p>}
   {error&&<p className="notice" role="alert">{error}</p>}
  </section>
 )
}
