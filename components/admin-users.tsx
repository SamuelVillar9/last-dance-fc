'use client';
import {useCallback,useEffect,useState} from 'react';
import {browserDb} from '@/lib/browser-db';

export type ActivityUser={id:string;email:string|null;name:string|null;number:number|null;player_id:string|null;is_admin:boolean;created_at:string;last_sign_in_at:string|null;last_seen_at:string|null};
type Filter='all'|'today'|'week'|'inactive'|'never';
const fullDate=new Intl.DateTimeFormat('es-ES',{timeZone:'Europe/Madrid',dateStyle:'short',timeStyle:'short'});
const day=new Intl.DateTimeFormat('sv-SE',{timeZone:'Europe/Madrid'});
const stamp=(value:string|null,fallback:string)=>value?fullDate.format(new Date(value)):fallback;

export function AdminUsers(){
 const [users,setUsers]=useState<ActivityUser[]>([]),[loading,setLoading]=useState(true),[error,setError]=useState('');
 const [search,setSearch]=useState(''),[filter,setFilter]=useState<Filter>('all'),[sort,setSort]=useState('activity');
 const [asOf,setAsOf]=useState(()=>Date.now());
 const load=useCallback(async()=>{
  const client=browserDb();if(!client)return;
  setLoading(true);setError('');
  try{
   const {data,error}=await client.rpc('admin_user_activity');
   if(error)throw error;
   setUsers(data as unknown as ActivityUser[]);setAsOf(Date.now());
  }catch{setUsers([]);setError('No se pudo cargar la actividad. Comprueba tu acceso de administrador e inténtalo de nuevo.')}
  finally{setLoading(false)}
 },[]);
 useEffect(()=>{void load()},[load]);
 const today=day.format(new Date(asOf));
 const seenToday=(u:ActivityUser)=>!!u.last_seen_at&&day.format(new Date(u.last_seen_at))===today;
 const seenWeek=(u:ActivityUser)=>!!u.last_seen_at&&Date.parse(u.last_seen_at)>=asOf-7*86400000;
 const query=search.trim().toLocaleLowerCase('es');
 const rows=users.filter(u=>(!query||`${u.name??''} ${u.email??''} ${u.number??''}`.toLocaleLowerCase('es').includes(query))&&(filter==='all'||filter==='today'&&seenToday(u)||filter==='week'&&seenWeek(u)||filter==='inactive'&&!!u.last_seen_at&&!seenWeek(u)||filter==='never'&&!u.last_sign_in_at));
 rows.sort((a,b)=>sort==='name'?(a.name??a.email??'').localeCompare(b.name??b.email??'','es'):sort==='login'?(Date.parse(b.last_sign_in_at??'')||0)-(Date.parse(a.last_sign_in_at??'')||0):(Date.parse(b.last_seen_at??'')||0)-(Date.parse(a.last_seen_at??'')||0));
 return <section className="admin-card"><div className="activity-heading"><div><h2>USUARIOS Y ACTIVIDAD</h2><p className="muted">Información exclusiva de administración · Horario de Madrid.</p></div><button className="action secondary" disabled={loading} onClick={()=>void load()}>{loading?'Cargando…':'Actualizar'}</button></div>
 <div className="activity-summary">{[['USUARIOS REGISTRADOS',users.length],['CON ACTIVIDAD HOY',users.filter(seenToday).length],['ÚLTIMOS 7 DÍAS',users.filter(seenWeek).length]].map(([label,value])=><div key={label}><strong>{loading?'—':value}</strong><span>{label}</span></div>)}</div>
 <div className="activity-filters"><label>Buscar usuario<input type="search" value={search} onChange={e=>setSearch(e.target.value)} placeholder="Nombre, correo o dorsal"/></label><label>Actividad<select value={filter} onChange={e=>setFilter(e.target.value as Filter)}><option value="all">Todos los usuarios</option><option value="today">Actividad hoy</option><option value="week">Últimos 7 días</option><option value="inactive">Sin actividad reciente (más de 7 días)</option><option value="never">Nunca ha iniciado sesión</option></select></label><label>Ordenar por<select value={sort} onChange={e=>setSort(e.target.value)}><option value="activity">Última actividad</option><option value="login">Último inicio de sesión</option><option value="name">Nombre</option></select></label></div>
 {error?<p role="alert" className="notice">{error}</p>:loading?<p role="status">Cargando usuarios…</p>:<><div className="table-scroll"><table className="admin-table activity-table"><caption className="sr-only">Usuarios registrados y últimas conexiones</caption><thead><tr><th scope="col">USUARIO</th><th scope="col">ROL</th><th scope="col">VINCULACIÓN</th><th scope="col">ÚLTIMO INICIO DE SESIÓN</th><th scope="col">ÚLTIMA ACTIVIDAD</th></tr></thead><tbody>{rows.map(u=><tr key={u.id}><td><b>{u.name?`${u.number!==null?'#'+u.number+' ':''}${u.name}`:u.email??'Sin nombre'}</b><small>{u.name&&u.email}</small></td><td>{u.is_admin?'Administrador':'Jugador'}</td><td>{u.player_id?'Jugador vinculado':'Sin jugador vinculado'}</td><td>{stamp(u.last_sign_in_at,'Nunca ha iniciado sesión')}</td><td>{stamp(u.last_seen_at,'Sin actividad registrada')}</td></tr>)}</tbody></table></div>{!rows.length&&<p className="empty">No hay usuarios que coincidan con los filtros.</p>}</>}
 <p className="muted activity-note">La última actividad es aproximada y se registra como máximo cada cinco minutos de uso. No indica que el usuario siga conectado. El registro comienza al activar esta mejora; los inicios de sesión anteriores se muestran cuando están disponibles.</p></section>;
}
