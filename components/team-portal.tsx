'use client';
import Link from 'next/link';
import {useEffect,useState} from 'react';
import {browserDb} from '@/lib/browser-db';
import {clubMatch,type League,type Player,type Report} from '@/lib/types';
import {availabilityText,statusLabels,type Portal} from '@/lib/team';
import {dateLabel} from '@/lib/format';

export function TeamPortal({players,leagues,reports,initialMatch=''}:{players:Player[];leagues:League[];reports:Report[];initialMatch?:string}){
 const client=browserDb();
 const [ready,setReady]=useState(false),[logged,setLogged]=useState(false),[portal,setPortal]=useState<Portal|null>(null);
 const [email,setEmail]=useState(''),[password,setPassword]=useState(''),[register,setRegister]=useState(false),[recovery,setRecovery]=useState(false);
 const [busy,setBusy]=useState(false),[message,setMessage]=useState(''),[linkEmail,setLinkEmail]=useState(''),[linkPlayer,setLinkPlayer]=useState('');
 const fixtures=leagues.flatMap(l=>l.matches).filter(clubMatch).filter(m=>m.status!=='bye');
 const unique=fixtures.filter((m,i)=>fixtures.findIndex(x=>x.key===m.key)===i);
 const upcoming=unique.filter(m=>m.status==='scheduled'||m.status==='postponed').sort((a,b)=>(a.date??'9999').localeCompare(b.date??'9999')||(a.time??'').localeCompare(b.time??''));
 const [selected,setSelected]=useState(initialMatch||upcoming[0]?.key||unique[0]?.key||'');
 const [override,setOverride]=useState('');
 async function refresh(){
  if(!client)return;
  const {data,error}=await client.rpc('team_portal',{p_action:'dashboard'});
  if(error)throw Error(error.code==='PGRST202'?'El vestuario está preparado y pendiente de activar en la base de datos.':error.message);
  setPortal(data as unknown as Portal);
 }
 useEffect(()=>{
  if(!client){setReady(true);return;}
  let active=true;
  async function check(){
   try{
    const {data,error}=await client!.auth.getUser();
    if(!active)return;
    setLogged(!error&&!!data.user);
    if(!error&&data.user)await refresh();else setPortal(null);
   }catch(e){if(active)setMessage((e as Error).message)}finally{if(active)setReady(true)}
  }
  void check();
  const {data}=client.auth.onAuthStateChange(event=>{
   if(event==='PASSWORD_RECOVERY')setRecovery(true);
   setTimeout(()=>{if(active)void check()},0);
  });
  const timer=setInterval(()=>{if(active&&document.visibilityState==='visible')void check()},60000);
  return()=>{active=false;data.subscription.unsubscribe();clearInterval(timer)};
 },[client]);
 async function run(fn:()=>Promise<void>){
  setBusy(true);setMessage('');
  try{await fn()}catch(e){setMessage((e as Error).message||'No se pudo completar la operación.')}finally{setBusy(false)}
 }
 async function mutate(action:string,payload:Record<string,string>){
  if(!client)return;
  const {data,error}=await client.rpc('team_portal',{p_action:action,p_payload:payload});
  if(error)throw Error(error.message);
  setPortal(data as unknown as Portal);
 }
 const notice=message&&<p className="admin-message" role="status">{message}</p>;
 if(!ready)return <p className="notice">Abriendo el vestuario…</p>;
 if(!client)return <p className="notice">No se ha podido conectar el vestuario.</p>;
 if(recovery)return <form className="admin-card login-card" onSubmit={e=>{e.preventDefault();void run(async()=>{
  const {error}=await client.auth.updateUser({password});if(error)throw error;setRecovery(false);setPassword('');setMessage('Contraseña actualizada.');
 })}}><h2>NUEVA CONTRASEÑA</h2><label>Contraseña<input type="password" autoComplete="new-password" required minLength={12} value={password} onChange={e=>setPassword(e.target.value)}/></label><button className="action" disabled={busy}>Guardar contraseña</button>{notice}</form>;
 if(!logged)return <form className="admin-card login-card" onSubmit={e=>{e.preventDefault();void run(async()=>{
  if(register){
   const {error}=await client.auth.signUp({email,password,options:{emailRedirectTo:window.location.origin+'/equipo'}});if(error)throw error;
   setMessage('Registro solicitado. Confirma tu correo si recibes un enlace y avisa a Samu para que vincule tu cuenta a tu ficha.');setRegister(false);
  }else{
   const {error}=await client.auth.signInWithPassword({email,password});if(error)throw Error('No se pudo entrar. Revisa el correo, la contraseña y la confirmación del correo.');
  }setPassword('');
 })}}><h2>{register?'ÚNETE AL VESTUARIO.':'ENTRA AL VESTUARIO.'}</h2><p className="muted">Tu disponibilidad y los votos del equipo, en un mismo sitio.</p><label>Correo electrónico<input type="email" autoComplete="username" required value={email} onChange={e=>setEmail(e.target.value)}/></label><label>Contraseña<input type="password" autoComplete={register?'new-password':'current-password'} required minLength={register?12:undefined} value={password} onChange={e=>setPassword(e.target.value)}/></label><div className="team-actions"><button className="action" disabled={busy}>{register?'Crear cuenta':'Entrar'}</button><button className="action secondary" type="button" disabled={busy} onClick={()=>{setRegister(!register);setMessage('')}}>{register?'Ya tengo cuenta':'Crear mi cuenta'}</button></div>{!register&&<button className="action secondary" type="button" disabled={busy||!email} onClick={()=>void run(async()=>{
  const {error}=await client.auth.resetPasswordForEmail(email,{redirectTo:window.location.origin+'/equipo'});if(error)throw error;setMessage('Si la cuenta existe, recibirás un correo para recuperar la contraseña.');
 })}>Recuperar contraseña</button>}{notice}<p className="muted">Crear una cuenta no da acceso al equipo hasta que el administrador la vincule a tu ficha.</p></form>;
 const me=players.find(p=>p.id===portal?.playerId);
 const match=unique.find(m=>m.key===selected);
 const responses=(portal?.availability??[]).filter(r=>r.match_key===selected);
 const own=responses.find(r=>r.player_id===me?.id)?.status;
 const ballot=portal?.rounds?.find(r=>r.match_key===selected);
 const report=reports.find(r=>r.match_key===selected);
 const participants=report?.entries.map(e=>players.find(p=>p.id===e.playerId)).filter((p):p is Player=>!!p)??[];
 const eligible=!!me&&participants.some(p=>p.id===me.id);
 const open=!!ballot&&Date.now()>=Date.parse(ballot.opens_at)&&Date.now()<Date.parse(ballot.closes_at);
 const title=match?match.home+' — '+match.away+' · '+dateLabel(match.date):'Convocatoria';
 const activePlayers=players.filter(p=>p.active);
 return <><div className="admin-toolbar"><Link href="/mvp" className="action secondary">Ranking MVP</Link>{portal?.admin&&<Link href="/admin" className="action secondary">Administración y actas</Link>}<button className="action secondary" disabled={busy} onClick={()=>void run(refresh)}>Actualizar</button><button className="action secondary" disabled={busy} onClick={()=>void run(async()=>{const {error}=await client.auth.signOut();if(error)throw error;setPortal(null);setLogged(false)})}>Salir</button><button className="action secondary" disabled={busy} onClick={()=>{setRecovery(true);setMessage('')}}>Cambiar contraseña</button></div>{notice}
 {!portal?<p className="notice">No se pudo cargar tu área privada. Pulsa Actualizar para volver a intentarlo.</p>:portal.pending?<div className="admin-card"><h2>CASI ESTÁS DENTRO.</h2><p>Tu cuenta está creada. Dile a Samu qué correo has utilizado para que lo vincule a tu ficha de jugador.</p></div>:<>
 {(portal.rounds??[]).filter(r=>Date.now()<Date.parse(r.closes_at)&&!r.my_vote&&reports.find(report=>report.match_key===r.match_key)?.entries.some(e=>e.playerId===portal.playerId)).map(r=><p className="notice" key={r.match_key}>Tienes una votación MVP pendiente. <button className="chip" onClick={()=>setSelected(r.match_key)}>Ir a votar</button></p>)}<p className="team-welcome">{me?'Hola, '+me.name+' · #'+me.number:'Panel del administrador'}</p>
 <div className="admin-card"><label>Partido<select value={selected} onChange={e=>{setSelected(e.target.value);setMessage('')}}><option value="" disabled>Selecciona un partido</option>{[...upcoming,...unique.filter(m=>m.status==='played').reverse()].map(m=><option key={m.key} value={m.key}>J{m.round} · {m.home} — {m.away} · {dateLabel(m.date)}{m.status==='played'?' · Finalizado':''}</option>)}</select></label>{match&&<p className="muted">{dateLabel(match.date)} · {match.time??'Hora pendiente'} · {match.venue??'Campo pendiente'}</p>}</div>
 {match&&(match.status==='scheduled'||match.status==='postponed')&&<section className="admin-card"><h2>¿VIENES AL PARTIDO?</h2><p className="muted">Esta lista es la convocatoria. Puedes cambiar tu respuesta hasta que empiece el partido.</p>{me&&<div className="team-actions" role="group" aria-label="Mi disponibilidad">{(['yes','no','maybe'] as const).map(s=><button key={s} aria-pressed={own===s} className={'chip '+(own===s?'active':'')} disabled={busy} onClick={()=>void run(async()=>{await mutate('availability',{match_key:selected,status:s});setMessage('Disponibilidad guardada.')})}>{statusLabels[s]}</button>)}</div>}
 <div className="availability-grid">{(['yes','no','maybe','pending'] as const).map(s=>{const list=activePlayers.filter(p=>(responses.find(r=>r.player_id===p.id)?.status??'pending')===s);return <div key={s} className="availability-group"><h3>{s==='pending'?'Sin responder':statusLabels[s]} <span>{list.length}</span></h3><ul>{list.map(p=><li key={p.id}>#{p.number} {p.name}{p.id===me?.id?' · Tú':''}</li>)}</ul>{!list.length&&<p className="muted">Nadie por ahora</p>}</div>})}</div>
 <button className="action secondary" disabled={busy} onClick={()=>void run(async()=>{const text=availabilityText(title,activePlayers,responses)+'\n\n'+window.location.origin+'/equipo?partido='+encodeURIComponent(selected);await navigator.clipboard.writeText(text);setMessage('Lista copiada. Ya puedes pegarla en WhatsApp.')})}>Copiar lista para WhatsApp</button>
 {portal.admin&&<div className="team-admin-override"><label>Responder por un jugador<select value={override} onChange={e=>setOverride(e.target.value)}><option value="">Selecciona un jugador</option>{activePlayers.map(p=><option value={p.id} key={p.id}>#{p.number} {p.name}</option>)}</select></label><div className="team-actions">{(['yes','no','maybe'] as const).map(s=><button className="chip" key={s} disabled={busy||!override} onClick={()=>void run(async()=>{await mutate('availability',{match_key:selected,status:s,player_id:override});setMessage('Respuesta actualizada.')})}>{statusLabels[s]}</button>)}</div></div>}
 </section>}
 {match?.status==='played'&&<section className="admin-card"><h2>EL MVP DEL PARTIDO.</h2>{!ballot?<p className="muted">La votación se abrirá cuando Samu publique el acta con los asistentes.</p>:<><p className="muted">{open?'Votación abierta hasta ':'Votación cerrada · '}{new Date(ballot.closes_at).toLocaleString('es-ES',{timeZone:'Europe/Madrid'})} (hora de Madrid).</p><p className="muted">Un voto por asistente, sin autovoto. Puedes cambiarlo hasta el cierre. Los resultados se revelan al terminar; si hay empate, el premio se comparte.</p>{open&&eligible?<div className="team-actions">{participants.filter(p=>p.id!==me?.id).map(p=><button key={p.id} className={'chip '+(ballot.my_vote===p.id?'active':'')} aria-pressed={ballot.my_vote===p.id} disabled={busy} onClick={()=>void run(async()=>{await mutate('vote',{match_key:selected,candidate_id:p.id});setMessage('Voto guardado. Tu elección es privada.')})}>#{p.number} {p.name}</button>)}</div>:open?<p className="notice">Solo pueden votar los asistentes que figuran en el acta y tienen su cuenta vinculada.</p>:<Link className="action" href={'/mvp#'+encodeURIComponent(selected)}>Ver resultados</Link>}<p className="muted">Han votado {ballot.voters.length} de {participants.length} asistentes.</p><ul className="voter-list">{participants.map(p=><li key={p.id}>#{p.number} {p.name} · {ballot.voters.includes(p.id)?'Ya ha votado':'Sin votar'}</li>)}</ul></>}</section>}
 {portal.admin&&<section className="admin-card"><h2>CUENTAS DE JUGADORES</h2><p className="muted">Cada jugador crea su cuenta y confirma el correo. Después vincula aquí ese correo con su ficha. Tu cuenta de administrador también puede vincularse a tu jugador.</p><form onSubmit={e=>{e.preventDefault();void run(async()=>{await mutate('link',{player_id:linkPlayer,email:linkEmail});setLinkEmail('');setMessage('Cuenta vinculada. El jugador ya puede entrar.')})}}><label>Jugador<select required value={linkPlayer} onChange={e=>setLinkPlayer(e.target.value)}><option value="">Selecciona un jugador</option>{activePlayers.map(p=><option key={p.id} value={p.id}>#{p.number} {p.name}</option>)}</select></label><label>Correo de su cuenta<input required type="email" value={linkEmail} onChange={e=>setLinkEmail(e.target.value)}/></label><button className="action" disabled={busy}>Vincular cuenta</button></form><div className="table-scroll"><table><thead><tr><th>Jugador</th><th>Cuenta vinculada</th><th>Acceso</th></tr></thead><tbody>{activePlayers.map(p=>{const a=portal.accounts?.find(a=>a.player_id===p.id);return <tr key={p.id}><td>#{p.number} {p.name}</td><td>{a?.email??'Pendiente'}</td><td>{a&&<button className="chip" disabled={busy} onClick={()=>void run(async()=>{if(!window.confirm('¿Desvincular el acceso de '+p.name+'?'))return;await mutate('unlink',{player_id:p.id});setMessage('Acceso desvinculado.')})}>Desvincular</button>}</td></tr>})}</tbody></table></div></section>}
 </>}</>;
}
