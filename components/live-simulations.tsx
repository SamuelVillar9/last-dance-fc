'use client';
import {useCallback,useEffect,useState} from 'react';
import {browserDb} from '@/lib/browser-db';
type Sim={id:string;opponent:string;status:string;home_goals:number;away_goals:number;elapsed_seconds:number;period_started_at:string|null;created_at:string};
type Event={id:string;kind:string;side:string;player_id:string|null;assist_player_id:string|null;minute:number;period:number;voided_at:string|null};
type Player={id:string;name:string;number:number;active:boolean};
const status:Record<string,string>={scheduled:'Preparado',first_half:'Primera parte',halftime:'Descanso',second_half:'Segunda parte',finished:'Finalizado'};
const eventName:Record<string,string>={goal:'⚽ Gol',yellow:'🟨 Amarilla',red:'🟥 Roja',second_yellow:'🟥 Segunda amarilla',kickoff:'🏁 Inicio',halftime:'⏸️ Descanso',resume:'▶️ Segunda parte',final:'🏁 Final'};
export function LiveSimulations(){
 const db=browserDb();
 const [items,setItems]=useState<Sim[]>([]),[selected,setSelected]=useState<string|null>(null),[sim,setSim]=useState<Sim|null>(null),[events,setEvents]=useState<Event[]>([]),[players,setPlayers]=useState<Player[]>([]),[opponent,setOpponent]=useState('Rival de prueba'),[kind,setKind]=useState('goal'),[side,setSide]=useState('home'),[player,setPlayer]=useState(''),[assist,setAssist]=useState(''),[minute,setMinute]=useState(1),[busy,setBusy]=useState(false),[error,setError]=useState(''),[now,setNow]=useState(Date.now());
 const call=useCallback(async(action:string,id:string|null=null,payload:Record<string,unknown>={})=>{if(!db)throw Error('No hay conexión con Supabase');const {data,error}=await db.rpc('live_simulation' as never,{p_action:action,p_id:id,p_payload:payload} as never);if(error)throw Error(error.message);return data as unknown},[db]);
 const refresh=useCallback(async()=>{try{const list=await call('list') as Sim[];setItems(list);if(selected){const detail=await call('get',selected) as {match:Sim;events:Event[]};setSim(detail.match);setEvents(detail.events)}else{setSim(null);setEvents([])}}catch(e){setError(e instanceof Error?e.message:'No se pudieron cargar las simulaciones')}},[call,selected]);
 useEffect(()=>{if(!db)return;void db.from('players').select('id,name,number,active').eq('active',true).order('number').then(({data})=>setPlayers((data??[]) as Player[]))},[db]);
 useEffect(()=>{void refresh();const timer=setInterval(()=>{setNow(Date.now());void refresh()},5000);return()=>clearInterval(timer)},[refresh]);
 async function run(action:string,payload:Record<string,unknown>={},confirmText?:string){if(confirmText&&!window.confirm(confirmText))return;setBusy(true);setError('');try{const result=await call(action,selected,payload);if(action==='create')setSelected((result as {id:string}).id);if(action==='delete')setSelected(null);await refresh()}catch(e){setError(e instanceof Error?e.message:'Operación fallida')}finally{setBusy(false)}}
 const running=sim?.status==='first_half'||sim?.status==='second_half';
 const seconds=(sim?.elapsed_seconds??0)+(running&&sim?.period_started_at?Math.max(0,Math.floor((now-Date.parse(sim.period_started_at))/1000)):0);
 const clock=Math.floor(seconds/60)+':'+String(seconds%60).padStart(2,'0');
 const playerName=(id:string|null)=>players.find(p=>p.id===id)?.name??'Sin identificar';
 return <section className="admin-card" aria-label="Simulador de partidos"><h2>PARTIDOS DE PRUEBA</h2><p className="muted">Zona privada exclusiva del administrador. Los jugadores, incluso con permiso para anotar partidos reales, no pueden ver ni modificar estas simulaciones. No afectan a calendario, estadísticas, actas ni clasificación. No se envían notificaciones push reales.</p>
 <div className="team-actions"><label>Rival ficticio<input maxLength={80} minLength={2} value={opponent} onChange={e=>setOpponent(e.target.value)}/></label><button className="action" disabled={busy||opponent.trim().length<2} onClick={()=>void run('create',{opponent:opponent.trim()})}>Crear partido de prueba</button></div>
 <label>Seleccionar simulación<select value={selected??''} onChange={e=>setSelected(e.target.value||null)}><option value="">Selecciona un partido</option>{items.map(x=><option key={x.id} value={x.id}>{x.opponent} · {status[x.status]}</option>)}</select></label>
 {sim&&<><div className="admin-card"><strong>SIMULACIÓN · SOLO ADMINISTRADOR</strong><p className="muted">{status[sim.status]} · {clock}</p><div className="activity-summary"><div><strong>{sim.home_goals}</strong><span>LAST DANCE</span></div><div><strong>—</strong><span>PRUEBA</span></div><div><strong>{sim.away_goals}</strong><span>{sim.opponent}</span></div></div></div>
 <div className="team-actions">{[['scheduled','start','Iniciar'],['first_half','halftime','Descanso'],['halftime','resume','Segunda parte'],['first_half','finish','Finalizar'],['second_half','finish','Finalizar']].filter(([s])=>sim.status===s).map(([s,transition,label])=><button key={s+transition} className="action" disabled={busy} onClick={()=>void run('control',{transition})}>{label}</button>)}{running&&[60,300,600].map(s=><button key={s} className="action secondary" disabled={busy} onClick={()=>void run('advance',{seconds:s})}>+{s/60} min</button>)}</div>
 {running&&<form className="admin-card" onSubmit={e=>{e.preventDefault();void run('record',{kind,side,player_id:side==='home'?player:null,assist_player_id:side==='home'&&kind==='goal'?assist:null,minute})}}><h3>ANOTAR EVENTO DE PRUEBA</h3><div className="filters"><label>Tipo<select value={kind} onChange={e=>setKind(e.target.value)}>{['goal','yellow','red','second_yellow'].map(x=><option key={x} value={x}>{eventName[x]}</option>)}</select></label><label>Equipo<select value={side} onChange={e=>setSide(e.target.value)}><option value="home">Last Dance</option><option value="away">{sim.opponent}</option></select></label><label>Minuto<input type="number" min={0} max={120} value={minute} onChange={e=>setMinute(Number(e.target.value))}/></label></div>{side==='home'&&<><label>Jugador<select value={player} onChange={e=>{setPlayer(e.target.value);setAssist('')}}><option value="">Sin identificar</option>{players.map(p=><option key={p.id} value={p.id}>#{p.number} {p.name}</option>)}</select></label>{kind==='goal'&&<label>Asistencia<select value={assist} onChange={e=>setAssist(e.target.value)}><option value="">Sin asistencia</option>{players.filter(p=>p.id!==player).map(p=><option key={p.id} value={p.id}>#{p.number} {p.name}</option>)}</select></label>}</>}<button className="action" disabled={busy}>Registrar evento</button></form>}
 <h3>CRONOLOGÍA DE PRUEBA</h3><ol className="live-timeline">
   {events.filter(e=>!e.voided_at).map(e=>(
    <li key={e.id} className="live-timeline-entry">
     <div className="live-timeline-copy">
      <strong>{e.minute}' · {eventName[e.kind]??e.kind}</strong>
      <span className="muted">{['kickoff','halftime','resume','final'].includes(e.kind)?'Cambio de estado':e.side==='away'?sim.opponent:playerName(e.player_id)}{e.assist_player_id?' · Asistencia: '+playerName(e.assist_player_id):''}</span>
     </div>
     {['goal','yellow','red','second_yellow'].includes(e.kind)&&<button type="button" className="chip" disabled={busy} onClick={()=>void run('void',{event_id:e.id})}>Anular</button>}
    </li>
   ))}
 </ol>
 <div className="team-actions"><button className="action secondary" disabled={busy} onClick={()=>void run('reset',{},'¿Reiniciar la simulación y borrar todos sus eventos?')}>Reiniciar</button><button className="action secondary" disabled={busy} onClick={()=>void run('delete',{},'¿Eliminar definitivamente este partido de prueba?')}>Eliminar prueba</button></div></>}
 {error&&<p role="alert" className="notice">{error}</p>}
 </section>;
}
