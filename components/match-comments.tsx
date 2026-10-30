'use client';
import Link from 'next/link';
import {useCallback,useEffect,useRef,useState} from 'react';
import {MessageCircle} from 'lucide-react';
import {browserDb} from '@/lib/browser-db';
import {commentLength,mergeComments,validComment,type CommentsPage,type MatchComment} from '@/lib/comments';
import {dateLabel} from '@/lib/format';
import type {Match,Player,Report} from '@/lib/types';

type Props={players:Player[];match?:Match;report?:Report;playerId?:string;matches?:Match[]};
const timestamp=(value:string)=>new Date(value).toLocaleString('es-ES',{timeZone:'Europe/Madrid',day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'});

export function MatchComments({players,match,report,playerId,matches=[]}:Props){
 const client=browserDb();
 const [uid,setUid]=useState<string|null|undefined>(undefined),[target,setTarget]=useState('');
 const [data,setData]=useState<CommentsPage|null>(null),[loadedScope,setLoadedScope]=useState('');
 const [loading,setLoading]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState('');
 const [compose,setCompose]=useState(false),[drafts,setDrafts]=useState<Record<string,string>>({});
 const requestId=useRef(0),mounted=useRef(false),textarea=useRef<HTMLTextAreaElement>(null);
 const scope=JSON.stringify([match?.key,playerId,target,uid]);
 const scopeRef=useRef(scope);scopeRef.current=scope;
 const ready=scope===loadedScope;
 const viewer=ready?data?.viewer:undefined;
 const participants=report?.entries.map(entry=>players.find(player=>player.id===entry.playerId)).filter((p):p is Player=>!!p)??[];
 const draftKey=JSON.stringify([uid,match?.key,target]);
 const body=drafts[draftKey]??(ready?data?.own_comment?.body??'':'');
 const length=commentLength(body);

 useEffect(()=>{mounted.current=true;return()=>{mounted.current=false;requestId.current++}},[]);
 useEffect(()=>{
  if(!client){setUid(null);return}
  let active=true,version=0;const initial=version;
  void client.auth.getSession().then(({data})=>{if(active&&version===initial)setUid(data.session?.user.id??null)}).catch(()=>{if(active&&version===initial)setUid(null)});
  const {data}=client.auth.onAuthStateChange((_event,session)=>{if(active){version++;setUid(session?.user.id??null)}});
  return()=>{active=false;data.subscription.unsubscribe()};
 },[client]);
 useEffect(()=>{setCompose(false)},[uid]);
 useEffect(()=>{
  if(!match||uid===undefined)return;
  const params=new URLSearchParams(window.location.search);
  const selected=params.get('comentar')||params.get('jugador');
  if(selected&&participants.some(player=>player.id===selected)){setTarget(selected);if(params.has('comentar'))setCompose(true)}
  // Apply a deep link once per match; later filtering stays local to this section.
 },[match?.key,uid]);
 const load=useCallback(async(offset=0)=>{
  if(!client||uid===undefined)return null;
  const id=++requestId.current,current=scope;
  setLoading(true);setError('');
  try{
   const {data:response,error}=await client.rpc('match_comments_page',{p_match_key:match?.key??null,p_player_id:playerId??null,p_target_id:target||null,p_offset:offset});
   if(error)throw error;
   const page=response as unknown as CommentsPage;
   if(!mounted.current||id!==requestId.current||scopeRef.current!==current)return null;
   setData(previous=>offset&&previous?{...page,items:mergeComments(previous.items,page.items)}:page);
   setLoadedScope(current);return page;
  }catch{
   if(mounted.current&&id===requestId.current&&scopeRef.current===current)setError('No se han podido cargar los comentarios. Puedes volver a intentarlo.');
   return null;
  }finally{if(mounted.current&&id===requestId.current&&scopeRef.current===current)setLoading(false)}
 },[client,uid,scope,match?.key,playerId,target]);
 useEffect(()=>{void load();return()=>{requestId.current++}},[load]);
 useEffect(()=>{if(compose&&ready&&viewer?.can_write)textarea.current?.focus({preventScroll:true})},[compose,ready,viewer?.can_write,target]);

 function choose(player:string,write=false,text?:string){
  if(busy)return;
  setNotice('');setTarget(player);setCompose(write);
  if(text!==undefined)setDrafts(current=>({...current,[JSON.stringify([uid,match?.key,player])]:text}));
  requestAnimationFrame(()=>document.getElementById('rincon')?.scrollIntoView({behavior:'smooth',block:'start'}));
 }
 async function save(event:React.FormEvent){
  event.preventDefault();if(!client||busy||loading||!match||!viewer?.can_write||!validComment(body))return;
  const current=scope,key=draftKey;setBusy(true);setError('');setNotice('');
  try{
   const {error}=await client.rpc('save_match_comment',{p_match_key:match.key,p_target_id:target,p_body:body.trim()});
   if(error)throw error;
   if(!mounted.current||scopeRef.current!==current)return;
   setDrafts(previous=>{const next={...previous};delete next[key];return next});setCompose(false);setNotice('Comentario guardado.');
   await load();
  }catch(e){if(mounted.current&&scopeRef.current===current)setError(e instanceof Error?e.message:'No se pudo guardar. Tu texto sigue aquí para que puedas reintentarlo.')}
  finally{if(mounted.current)setBusy(false)}
 }
 async function remove(comment:MatchComment){
  if(!client||busy||!window.confirm('¿Eliminar este comentario?'))return;
  const current=scope;setBusy(true);setError('');setNotice('');
  try{
   const {error}=await client.rpc('delete_match_comment',{p_id:comment.id});if(error)throw error;
   if(mounted.current&&scopeRef.current===current){setNotice('Comentario eliminado.');await load()}
  }catch(e){if(mounted.current&&scopeRef.current===current)setError(e instanceof Error?e.message:'No se ha podido eliminar el comentario.')}
  finally{if(mounted.current)setBusy(false)}
 }
 const profile=!match;
 return <>
 {match&&report&&<>
  <div className="table-scroll comment-acta"><table><thead><tr><th>JUGADOR</th><th>GOLES</th><th>ASIST.</th><th>TA</th><th>TR</th></tr></thead><tbody>{report.entries.map(entry=>{
   const player=players.find(p=>p.id===entry.playerId);
   return <tr key={entry.playerId}><td><div className="comment-player-cell"><Link href={'/plantilla/'+entry.playerId}>#{player?.number} {player?.name??'Jugador'}</Link>{match.status==='played'&&player&&<button type="button" className="comment-bubble" disabled={busy} aria-label={`${viewer?.can_write?'Comentar sobre':'Ver comentarios sobre'} ${player.name} · #${player.number}`} onClick={()=>choose(player.id,!!viewer?.can_write)}><MessageCircle size={17}/><span>{data?.counts[player.id]??0}</span></button>}</div></td><td>{entry.goals}</td><td>{entry.assists}</td><td>{entry.yellow}</td><td>{entry.red}</td></tr>;
  })}</tbody></table></div>
  {report.note&&<p className="report-note">{report.note}</p>}
 </>}
 <section id="rincon" className="match-comments" aria-labelledby="comments-title">
  <div className="comments-heading"><div><h2 id="comments-title" className="display-heading">EL RINCÓN DE RAJAR.</h2><p className="muted">{profile?'Lo que dice el equipo sobre '+(players.find(p=>p.id===playerId)?.name??'este jugador'):'Comentarios del partido · Con cariño, que somos compañeros.'}</p></div>
   {!profile&&viewer?.can_write&&participants.length>0&&<button type="button" className="action" disabled={busy||loading} onClick={()=>choose(target||participants.find(p=>p.id===viewer.player_id)?.id||participants[0].id,true)}>Comentar</button>}
  </div>
  {!profile&&participants.length>0&&<label className="comments-filter">Comentarios sobre<select value={target} disabled={busy} onChange={e=>{setTarget(e.target.value);setCompose(false);setNotice('')}}><option value="">Todos los jugadores</option>{participants.map(p=><option key={p.id} value={p.id}>#{p.number} {p.name}</option>)}</select></label>}
  {compose&&viewer?.can_write&&target&&<form className="comment-composer" onSubmit={event=>void save(event)}>
   <label htmlFor="comment-body">Tu comentario sobre {participants.find(p=>p.id===target)?.name}<textarea id="comment-body" ref={textarea} value={body} maxLength={560} disabled={busy||loading} onChange={e=>setDrafts(current=>({...current,[draftKey]:e.target.value}))} placeholder="La crónica que no saldrá en el acta…" rows={4} required/></label>
   <div className="comment-composer-bottom"><small className={length>280?'comment-limit-error':'muted'}>{length} / 280</small><div className="team-actions"><button type="button" className="action secondary" disabled={busy} onClick={()=>setCompose(false)}>Cancelar</button><button className="action" disabled={busy||loading||!validComment(body)}>{busy?'Guardando…':data?.own_comment?'Guardar cambios':'Publicar'}</button></div></div>
   <p className="muted">Un comentario por jugador y partido. Es público y puedes editarlo después.</p>
  </form>}
  {notice&&<p className="admin-message" role="status">{notice}</p>}
  {error&&<div className="comment-error" role="alert"><p>{error}</p><button className="action secondary" type="button" disabled={busy||loading} onClick={()=>void load()}>Actualizar comentarios</button></div>}
  {(!ready||loading)&&!error&&<p className="muted" role="status">Cargando comentarios…</p>}
  {ready&&data?.items.map(comment=>{
   const fixture=match??matches.find(m=>m.key===comment.match_key);
   const href='/partidos/'+encodeURIComponent(comment.match_key);
   return <article key={comment.id} className="match-comment" id={'comentario-'+comment.id}>
    <div className="comment-byline"><Link href={'/plantilla/'+comment.author_player_id}>#{comment.author_number} {comment.author_name}</Link><span aria-hidden="true">→</span><Link href={'/plantilla/'+comment.target_player_id}>#{comment.target_number} {comment.target_name}</Link></div>
    <p className="comment-text">{comment.body}</p>
    <div className="comment-meta"><time dateTime={comment.created_at}>{timestamp(comment.created_at)}{comment.updated_at!==comment.created_at?' · Editado':''}</time>{profile&&<Link href={href+'?jugador='+encodeURIComponent(comment.target_player_id)+'#rincon'}>{fixture?`J${fixture.round} · ${fixture.home} — ${fixture.away}`:'Ver partido'} →</Link>}</div>
    {(comment.can_edit||comment.can_delete)&&<div className="comment-controls">{comment.can_edit&&(profile?<Link href={href+'?comentar='+encodeURIComponent(comment.target_player_id)+'#rincon'}>Editar</Link>:<button type="button" disabled={busy} onClick={()=>choose(comment.target_player_id,true,comment.body)}>Editar</button>)}{comment.can_delete&&<button type="button" disabled={busy} onClick={()=>void remove(comment)}>{viewer?.admin&&!comment.can_edit?'Eliminar como administrador':'Eliminar'}</button>}</div>}
   </article>;
  })}
  {ready&&!data?.items.length&&!loading&&<p className="empty comment-empty">{profile?'Todavía no hay comentarios sobre este jugador.':'Todavía no hay comentarios. ¿Quién rompe el hielo?'}</p>}
  {ready&&data?.has_more&&<button className="action secondary" type="button" disabled={busy||loading} onClick={()=>void load(data.items.length)}>Ver más comentarios</button>}
  {!profile&&ready&&!viewer?.can_write&&<p className="muted">{uid?'Para escribir necesitas una cuenta vinculada a un jugador activo y un acta publicada.':<Link className="text-link" href={'/equipo?partido='+encodeURIComponent(match.key)}>Entra al vestuario para dejar tu comentario →</Link>}</p>}
  {profile&&<p className="muted">Para comentar su actuación, entra en el partido correspondiente.</p>}
 </section>
 </>;
}
