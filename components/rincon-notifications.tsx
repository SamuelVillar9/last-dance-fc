'use client';
import Link from 'next/link';
import {useCallback,useEffect,useRef,useState} from 'react';
import {Bell,Settings,X} from 'lucide-react';
import {browserDb} from '@/lib/browser-db';
import type {Json} from '@/lib/database.types';
type Notice={id:string;created_at:string;read_at:string|null;match_key:string;comment_id:string;target_player_id:string;author_name:string};
type Notices={items:Notice[];unread:number;tutorial_dismissed:boolean;mentions_push:boolean;device_active:boolean};
export async function detachPushDevice(){
 const db=browserDb();if(!db||!('serviceWorker' in navigator))return;
 try{const reg=await navigator.serviceWorker.getRegistration('/');const subscription=await reg?.pushManager?.getSubscription();if(subscription)await db.rpc('rincon_notices',{p_action:'unsubscribe',p_payload:{endpoint:subscription.endpoint}})}catch{}
}
function installed(){return matchMedia('(display-mode: standalone)').matches||!!(navigator as Navigator&{standalone?:boolean}).standalone}
function needsInstall(){return /iPad|iPhone|iPod/.test(navigator.userAgent)||navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1}
export function RinconNotifications(){
 const db=browserDb(),dialog=useRef<HTMLDialogElement>(null);
 const [uid,setUid]=useState<string|null>(null),[data,setData]=useState<Notices|null>(null),[panel,setPanel]=useState<'tutorial'|'settings'|'notices'|null>(null);
 const [endpoint,setEndpoint]=useState(''),[publicKey,setPublicKey]=useState(''),[configured,setConfigured]=useState(false),[busy,setBusy]=useState(false),[message,setMessage]=useState(''),[supported,setSupported]=useState(false),[permission,setPermission]=useState('default'),[installFirst,setInstallFirst]=useState(false);
 const account=useRef(uid);account.current=uid;
 useEffect(()=>{
  setInstallFirst(needsInstall()&&!installed());
  setSupported('serviceWorker' in navigator&&'PushManager' in window&&'Notification' in window);
  if('Notification' in window)setPermission(Notification.permission);
  void fetch('/api/rincon',{cache:'no-store'}).then(r=>r.json()).then(d=>{setConfigured(!!d.configured);setPublicKey(d.publicKey??'')}).catch(()=>{});
  if('serviceWorker' in navigator)void navigator.serviceWorker.register('/match-cache-sw.js',{scope:'/',updateViaCache:'none'}).then(async reg=>{const sub=await reg.pushManager?.getSubscription();setEndpoint(sub?.endpoint??'')}).catch(()=>{});
 },[]);
 useEffect(()=>{
  if(!db)return;let active=true,version=0;
  void db.auth.getSession().then(({data})=>{if(active&&version===0)setUid(data.session?.user.id??null)});
  const {data}=db.auth.onAuthStateChange((_event,session)=>{version++;if(active){const next=session?.user.id??null;if(account.current!==next){setData(null);setPanel(null)}setUid(next)}});
  return()=>{active=false;data.subscription.unsubscribe()};
 },[db]);
 const refresh=useCallback(async()=>{
  if(!db||!uid)return;const owner=uid;
  const {data,error}=await db.rpc('rincon_notices',{p_payload:{endpoint}});
  if(account.current!==owner||error||!data||typeof data!=='object'||!('items' in data)||!Array.isArray(data.items))return;
  setData(data as unknown as Notices);
 },[db,uid,endpoint]);
 useEffect(()=>{
  if(!uid){setData(null);setPanel(null);return}void refresh();
  const focus=()=>{if(document.visibilityState==='visible'){void refresh();if('Notification' in window)setPermission(Notification.permission)}};
  window.addEventListener('focus',focus);document.addEventListener('visibilitychange',focus);
  window.addEventListener('rincon-notices-updated',focus);
  const timer=setInterval(focus,60000);
  return()=>{window.removeEventListener('focus',focus);document.removeEventListener('visibilitychange',focus);window.removeEventListener('rincon-notices-updated',focus);clearInterval(timer)};
 },[refresh,uid]);
 useEffect(()=>{
  if(!uid||!data)return;
  const params=new URLSearchParams(location.search);let skipped=false;try{skipped=sessionStorage.getItem('ld-push-later-'+uid)==='1'}catch{}
  if(params.get('ajustes')==='notificaciones')setPanel('settings');else if(params.has('avisos'))setPanel('notices');
  else if(!data.tutorial_dismissed&&!data.device_active&&!skipped)setPanel(current=>current??'tutorial');
 },[uid,!!data]);
 useEffect(()=>{
  const show=()=>{setMessage('');setPanel('settings')};window.addEventListener('rincon-open-settings',show);return()=>window.removeEventListener('rincon-open-settings',show);
 },[]);
 useEffect(()=>{const modal=dialog.current;if(!modal)return;if(panel&&!modal.open)modal.showModal();else if(!panel&&modal.open)modal.close()},[panel]);
 async function action(name:string,payload:Record<string,Json>={}){
  if(!db)throw Error('Vuelve a iniciar sesión');const owner=uid;const {data,error}=await db.rpc('rincon_notices',{p_action:name,p_payload:{endpoint,...payload}});if(error)throw Error(error.message);if(account.current===owner)setData(data as unknown as Notices);
 }
 function later(){if(uid)try{sessionStorage.setItem('ld-push-later-'+uid,'1')}catch{}setPanel(null);setMessage('')}
 async function run(task:()=>Promise<void>){if(busy)return;setBusy(true);setMessage('');try{await task()}catch(e){setMessage(e instanceof Error?e.message:'No se pudo completar. Inténtalo de nuevo.')}finally{setBusy(false)}}
 async function enable(){
  if(!supported||installFirst||!publicKey||!configured)return;
  // Permission must be requested directly from the user's tap, before asynchronous work.
  const requested=Notification.requestPermission();
  await run(async()=>{
   const granted=await requested;setPermission(granted);if(granted!=='granted')throw Error('No se ha concedido el permiso. Puedes cambiarlo en los ajustes del navegador o del dispositivo.');
   const reg=await navigator.serviceWorker.ready;
   let sub=await reg.pushManager.getSubscription();
   const bytes=Uint8Array.from(atob(publicKey.replace(/-/g,'+').replace(/_/g,'/')),c=>c.charCodeAt(0));
   if(sub&&sub.options.applicationServerKey&&Array.from(new Uint8Array(sub.options.applicationServerKey)).join(',')!==Array.from(bytes).join(',')){await sub.unsubscribe();sub=null}
   sub??=await reg.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:bytes});
   const keys=sub.toJSON().keys;if(!keys)throw Error('No se pudo registrar el dispositivo');
   await action('subscribe',{endpoint:sub.endpoint,p256dh:keys.p256dh,auth:keys.auth});setEndpoint(sub.endpoint);
   await action('settings',{tutorial_dismissed:true,mentions_push:true});setMessage('¡Listo! Las menciones te avisarán en este dispositivo.');
  });
 }
 async function post(payload:unknown){const {data}=await db!.auth.getSession();if(!data.session)throw Error('Vuelve a iniciar sesión');const response=await fetch('/api/rincon',{method:'POST',headers:{Authorization:'Bearer '+data.session.access_token,'Content-Type':'application/json'},body:JSON.stringify(payload)});const result=await response.json();if(!response.ok)throw Error(result.error??'No se pudo enviar la prueba')}
 if(!uid||!data)return null;
 const active=data.device_active&&permission==='granted';
 return <><button type="button" data-private-ui="true" className="theme-toggle notices-bell" aria-label={'Notificaciones'+(data.unread?' · '+data.unread+' sin leer':'')} onClick={()=>{setMessage('');setPanel('notices')}}><Bell size={19}/>{data.unread>0&&<span className="notices-count">{data.unread>99?'99+':data.unread}</span>}</button>
 <dialog ref={dialog} data-private-ui="true" className="rincon-dialog" aria-labelledby="notices-title" onCancel={event=>{event.preventDefault();if(!busy)later()}}>
 <div className="notices-heading"><h2 id="notices-title">{panel==='tutorial'?'QUE NO SE TE ESCAPE EL SALSEO.':panel==='settings'?'NOTIFICACIONES.':'TUS AVISOS.'}</h2><button type="button" className="theme-toggle" aria-label="Cerrar" disabled={busy} onClick={later}><X size={20}/></button></div>
 {panel==='notices'?<>
  <div className="team-actions"><button type="button" className="chip" onClick={()=>{setMessage('');setPanel('settings')}}><Settings size={16}/> Ajustes</button><button type="button" className="chip" disabled={busy||!data.unread} onClick={()=>void run(()=>action('read'))}>Marcar todos como leídos</button></div>
  {!data.items.length&&<p className="muted">Cuando un compañero te mencione, aparecerá aquí.</p>}
  <ul className="notices-list">{data.items.map(n=><li key={n.id} className={n.read_at?'':'notice-unread'}><Link href={'/partidos/'+encodeURIComponent(n.match_key)+'?jugador='+encodeURIComponent(n.target_player_id)+'&aviso='+n.id+'&comentario='+n.comment_id+'#comentario-'+n.comment_id} onClick={()=>{void action('read',{id:n.id}).catch(()=>{});later()}}><b>{n.author_name} te ha mencionado</b><span>En El rincón de rajar · {new Date(n.created_at).toLocaleDateString('es-ES')}</span></Link></li>)}</ul>
 </>:<>
  <p>Cuando un compañero te mencione con @ en <strong>El rincón de rajar</strong>, podrás recibir un aviso y abrir directamente el comentario.</p>
  <ol className="push-steps"><li>{installFirst?'Añade LAST DANCE a la pantalla de inicio y ábrela desde su icono.':'Abre LAST DANCE en el dispositivo donde quieras recibir los avisos.'}</li><li>Pulsa «Activar en este dispositivo» y permite las notificaciones.</li><li>Envía una prueba para comprobar que llegan.</li></ol>
  {installFirst&&<p className="notice">En iPhone/iPad: abre la web en Safari → Compartir → Añadir a pantalla de inicio. Después abre ese icono. Requiere iOS/iPadOS 16.4 o posterior.</p>}
  {!supported&&!installFirst&&<p className="notice">Este navegador no admite notificaciones push. Tus avisos seguirán apareciendo en la campana.</p>}
  {permission==='denied'&&<p className="notice">Las notificaciones están bloqueadas. Permítelas desde los ajustes del navegador o del dispositivo y vuelve aquí.</p>}
  {!configured&&<p className="notice">La activación de notificaciones todavía no está disponible. Puedes volver desde los ajustes del vestuario.</p>}
  <p className="muted">Estado de este dispositivo: {active?'Activado':permission==='denied'?'Bloqueado':'Sin activar'}.</p>
  <div className="team-actions"><button type="button" className="action" disabled={busy||!supported||installFirst||!configured||permission==='denied'||active} onClick={()=>void enable()}>Activar en este dispositivo</button>
  {active&&<><button type="button" className="action secondary" disabled={busy} onClick={()=>void run(async()=>{await post({action:'test',endpoint});setMessage('Prueba aceptada por el servicio push. Comprueba el centro de notificaciones. Si no aparece, revisa los ajustes del dispositivo.')})}>Enviar prueba</button><button type="button" className="action secondary" disabled={busy} onClick={()=>void run(async()=>{await action('unsubscribe',{endpoint});setMessage('Avisos desactivados en este dispositivo.')})}>Desactivar este dispositivo</button></>}</div>
  <label className="push-preference"><input type="checkbox" checked={data.mentions_push} disabled={busy} onChange={event=>void run(()=>action('settings',{mentions_push:event.target.checked}))}/> Recibir push de menciones en mis dispositivos activados</label>
  <p className="muted">Por ahora solo avisamos de menciones. Las reacciones no envían push. Puedes cambiarlo en Vestuario → Ajustes de notificaciones.</p>
  {panel==='tutorial'&&<div className="team-actions"><button type="button" className="action secondary" disabled={busy} onClick={later}>Ahora no</button><button type="button" className="action secondary" disabled={busy} onClick={()=>void run(async()=>{await action('settings',{tutorial_dismissed:true});later()})}>No mostrar de nuevo</button></div>}
 </>}
 {message&&<p role="status" className="admin-message">{message}</p>}
 </dialog></>;
}
