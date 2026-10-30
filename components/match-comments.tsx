'use client';
import Link from 'next/link';
import {CommentReactions} from './comment-reactions';
import {mentionLabel,mentionParts,retainedMentions,type Mention} from '@/lib/mentions';
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
 const [mentionDrafts,setMentionDrafts]=useState<Record<string,Mention[]>>({}),[mentionQuery,setMentionQuery]=useState<string|null>(null);
 const requestId=useRef(0),mounted=useRef(false),textarea=useRef<HTMLTextAreaElement>(null);
 const scope=JSON.stringify([match?.key,playerId,target,uid]);
 const scopeRef=useRef(scope);scopeRef.current=scope;
 const ready=scope===loadedScope;
 const viewer=ready?data?.viewer:undefined;
 const participants=report?.entries.map(entry=>players.find(player=>player.id===entry.playerId)).filter((p):p is Player=>!!p)??[];
 const draftKey=JSON.stringify([uid,match?.key,target]);
 const body=drafts[draftKey]??(ready?data?.own_comment?.body??'':'');
 const mentions=mentionDrafts[draftKey]??(ready?data?.own_comment?.mentions??[]:[]);
 const length=commentLength(body);
 const candidates=mentionQuery===null?[]:players.filter(p=>p.active&&p.name.toLocaleLowerCase('es').includes(mentionQuery.toLocaleLowerCase('es'))).slice(0,8);

 useEffect(()=>{mounted.current=true;return()=>{mounted.current=false;requestId.current++}},[]);
 useEffect(()=>{
  if(!client){setUid(null);return}
  let active=true,version=0;const initial=version;
  void client.auth.getSession().then(({data})=>{if(active&&version===initial)setUid(data.session?.user.id??null)}).catch(()=>{if(active&&version===initial)setUid(null)});
  const {data}=client.auth.onAuthStateChange((_event,session)=>{if(active){version++;setUid(session?.user.id??null)}});
  return()=>{active=false;data.subscription.unsubscribe()};
 },[client]);
 useEffect(()=>{setCompose(false);if(uid===null&&new URLSearchParams(location.search).has('aviso'))location.assign('/equipo?volver='+encodeURIComponent(location.pathname+location.search+location.hash))},[uid]);
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
   const params=new URLSearchParams(location.search);
   const {data:response,error}=await client.rpc('rincon_comments_page',{p_match_key:match?.key??null,p_player_id:playerId??null,p_target_id:target||null,p_offset:offset,p_focus_id:offset===0?params.get('comentario'):null});
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
 useEffect(()=>{const reload=()=>void load();window.addEventListener('rincon-reload',reload);return()=>window.removeEventListener('rincon-reload',reload)},[load]);
 useEffect(()=>{if(!ready)return;const params=new URLSearchParams(location.search),id=params.get('comentario');if(id)requestAnimationFrame(()=>document.getElementById('comentario-'+id)?.scrollIntoView({block:'center'}));const notice=params.get('aviso');if(notice&&uid&&client)void client.rpc('rincon_notices',{p_action:'read',p_payload:{id:notice}}).then(()=>window.dispatchEvent(new Event('rincon-notices-updated')))},[ready,uid,client]);
 useEffect(()=>{if(compose&&ready&&viewer?.can_write)textarea.current?.focus({preventScroll:true})},[compose,ready,viewer?.can_write,target]);

 function choose(player:string,write=false,text?:string,selectedMentions?:Mention[]){
  if(busy)return;
  setNotice('');setTarget(player);setCompose(write);setMentionQuery(null);
  if(selectedMentions)setMentionDrafts(current=>({...current,[JSON.stringify([uid,match?.key,player])]:selectedMentions}));
  if(text!==undefined)setDrafts(current=>({...current,[JSON.stringify([uid,match?.key,player])]:text}));
  requestAnimationFrame(()=>document.getElementById('rincon')?.scrollIntoView({behavior:'smooth',block:'start'}));
 }
 async function save(event:React.FormEvent){
  event.preventDefault();if(!client||busy||loading||!match||!viewer?.can_write||!validComment(body))return;
  const current=scope,key=draftKey;setBusy(true);setError('');setNotice('');
  try{
   const {data:session}=await client.auth.getSession();if(!session.session)throw Error('Vuelve a iniciar sesión');
   const response=await fetch('/api/rincon',{method:'POST',headers:{Authorization:'Bearer '+session.session.access_token,'Content-Type':'application/json'},body:JSON.stringify({action:'save',match_key:match.key,target_id:target,body:body.trim(),mentions:retainedMentions(body,mentions)})});
   const result=await response.json();if(!response.ok)throw Error(result.error??'No se pudo guardar el comentario');
   if(!mounted.current||scopeRef.current!==current)return;
   setDrafts(previous=>{const next={...previous};delete next[key];return next});setMentionDrafts(previous=>{const next={...previous};delete next[key];return next});setCompose(false);setNotice('Comentario guardado.');
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
  <div className="comments-heading"><div><h2 id="comments-title" className="display-heading">EL RINCÓN DE RAJAR.</h2><p className="muted">{profile?'Lo que dice el equipo sobre '+(players.find(p=>p.id===playerId)?.name??'este jugador'):'Hayas jugado o no, puedes comentar y reaccionar. Con cariño, que somos compañeros.'}</p></div>
   {!profile&&viewer?.can_write&&participants.length>0&&<button type="button" className="action" disabled={busy||loading} onClick={()=>choose(target||participants.find(p=>p.id===viewer.player_id)?.id||participants[0].id,true)}>Comentar</button>}
  </div>
  {!profile&&participants.length>0&&<label className="comments-filter">Comentarios sobre<select value={target} disabled={busy} onChange={e=>{setTarget(e.target.value);setCompose(false);setNotice('')}}><option value="">Todos los jugadores</option>{participants.map(p=><option key={p.id} value={p.id}>#{p.number} {p.name}</option>)}</select></label>}
  {compose&&viewer?.can_write&&target&&<form className="comment-composer" onSubmit={event=>void save(event)}>
   <label htmlFor="comment-body">Tu comentario sobre {participants.find(p=>p.id===target)?.name}<textarea id="comment-body" ref={textarea} value={body} maxLength={560} disabled={busy||loading} onChange={e=>{const value=e.target.value;setDrafts(current=>({...current,[draftKey]:value}));const before=value.slice(0,e.target.selectionStart);const found=before.match(/(?:^|\s)@([^@\n#]{0,35})$/);setMentionQuery(found?found[1]:null)}} placeholder="La crónica que no saldrá en el acta…" rows={4} required/></label>
   {mentionQuery!==null&&<div className="mention-picker" role="group" aria-label="Selecciona un compañero para mencionar">{candidates.map(p=><button type="button" key={p.id} onClick={()=>{const element=textarea.current;if(!element)return;const end=element.selectionStart,start=body.lastIndexOf('@',end-1),label=mentionLabel(p);if(start<0)return;const next=body.slice(0,start)+label+' '+body.slice(end);setDrafts(current=>({...current,[draftKey]:next}));setMentionDrafts(current=>({...current,[draftKey]:[...mentions.filter(m=>m.player_id!==p.id),{player_id:p.id,label}]}));setMentionQuery(null);requestAnimationFrame(()=>{element.focus();element.setSelectionRange(start+label.length+1,start+label.length+1)})}}>{p.photo_url&&<img src={p.photo_url} alt="" width="24" height="24"/>}#{p.number} {p.name}</button>)}{!candidates.length&&<p className="muted">No hay compañeros con ese nombre.</p>}</div>}
   <div className="comment-composer-bottom"><small className={length>280?'comment-limit-error':'muted'}>{length} / 280</small><div className="team-actions"><button type="button" className="action secondary" disabled={busy} onClick={()=>setCompose(false)}>Cancelar</button><button className="action" disabled={busy||loading||!validComment(body)}>{busy?'Guardando…':data?.own_comment?'Guardar cambios':'Publicar'}</button></div></div>
   <p className="muted">Escribe @ y selecciona un compañero para mencionarlo. Un comentario por jugador y partido, público y editable. Puedes participar aunque no hayas jugado.</p>
  </form>}
  {notice&&<p className="admin-message" role="status">{notice}</p>}
  {error&&<div className="comment-error" role="alert"><p>{error}</p><button className="action secondary" type="button" disabled={busy||loading} onClick={()=>void load()}>Actualizar comentarios</button></div>}
  {(!ready||loading)&&!error&&<p className="muted" role="status">Cargando comentarios…</p>}
  {ready&&data?.items.map(comment=>{
   const fixture=match??matches.find(m=>m.key===comment.match_key);
   const href='/partidos/'+encodeURIComponent(comment.match_key);
   return <article key={comment.id} className="match-comment" id={'comentario-'+comment.id}>
    <div className="comment-byline"><Link href={'/plantilla/'+comment.author_player_id}>#{comment.author_number} {comment.author_name}</Link><span aria-hidden="true">→</span><Link href={'/plantilla/'+comment.target_player_id}>#{comment.target_number} {comment.target_name}</Link></div>
    <p className="comment-text">{mentionParts(comment.body,comment.mentions).map((part,i)=>part.playerId?<Link className="comment-mention" key={i} href={'/plantilla/'+part.playerId}>{part.text}</Link>:<span key={i}>{part.text}</span>)}</p><CommentReactions comment={comment} enabled={!!data.can_react}/>
    <div className="comment-meta"><time dateTime={comment.created_at}>{timestamp(comment.created_at)}{comment.updated_at!==comment.created_at?' · Editado':''}</time>{profile&&<Link href={href+'?jugador='+encodeURIComponent(comment.target_player_id)+'#rincon'}>{fixture?`J${fixture.round} · ${fixture.home} — ${fixture.away}`:'Ver partido'} →</Link>}</div>
    {(comment.can_edit||comment.can_delete)&&<div className="comment-controls">{comment.can_edit&&(profile?<Link href={href+'?comentar='+encodeURIComponent(comment.target_player_id)+'#rincon'}>Editar</Link>:<button type="button" disabled={busy} onClick={()=>choose(comment.target_player_id,true,comment.body,comment.mentions??[])}>Editar</button>)}{comment.can_delete&&<button type="button" disabled={busy} onClick={()=>void remove(comment)}>{viewer?.admin&&!comment.can_edit?'Eliminar como administrador':'Eliminar'}</button>}</div>}
   </article>;
  })}
  {ready&&!data?.items.length&&!loading&&<p className="empty comment-empty">{profile?'Todavía no hay comentarios sobre este jugador.':'Todavía no hay comentarios. ¿Quién rompe el hielo?'}</p>}
  {ready&&data?.has_more&&<button className="action secondary" type="button" disabled={busy||loading} onClick={()=>void load(data.next_offset??data.items.length)}>Ver más comentarios</button>}
  {!profile&&ready&&!viewer?.can_write&&<p className="muted">{uid?'Para escribir necesitas una cuenta vinculada a un jugador activo y un acta publicada.':<Link className="text-link" href={'/equipo?partido='+encodeURIComponent(match.key)}>Entra al vestuario para dejar tu comentario →</Link>}</p>}
  {profile&&<p className="muted">Para comentar su actuación, entra en el partido correspondiente.</p>}
 </section>
 </>;
}

