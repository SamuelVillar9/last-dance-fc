'use client';
import {useEffect,useState} from 'react';
import {browserDb} from '@/lib/browser-db';
import type {MatchComment} from '@/lib/comments';
import {REACTIONS} from '@/lib/mentions';
export function CommentReactions({comment,enabled}:{comment:MatchComment;enabled:boolean}){
 const [reactions,setReactions]=useState(comment.reactions??[]),[busy,setBusy]=useState(false),[error,setError]=useState('');
 useEffect(()=>{setReactions(comment.reactions??[])},[comment]);
 async function react(emoji:string){const db=browserDb();if(!db||busy||!enabled)return;setBusy(true);setError('');const old=reactions.find(r=>r.mine)?.emoji;
 try{const {error}=await db.rpc('react_rincon_comment',{p_id:comment.id,p_emoji:old===emoji?null:emoji});if(error)throw error;
 // Reload the same shared record so names, totals and own selection stay consistent.
 const {data,error:readError}=await db.rpc('rincon_comments_page',{p_match_key:comment.match_key,p_target_id:comment.target_player_id,p_focus_id:comment.id});if(readError)throw readError;
 const updated=(data as unknown as {items:MatchComment[]}).items.find(c=>c.id===comment.id);if(updated)setReactions(updated.reactions??[]);else window.dispatchEvent(new Event('rincon-reload'));
 }catch{setError('No se pudo actualizar la reacción. Inténtalo de nuevo.')}finally{setBusy(false)}}
 return <div className="comment-reactions"><div className="reaction-buttons" role="group" aria-label="Reacciones al comentario">{REACTIONS.map(({emoji,label})=>{const r=reactions.find(r=>r.emoji===emoji);return (enabled||r)&&<button type="button" key={emoji} className={'chip '+(r?.mine?'active':'')} aria-label={label+' · '+(r?.count??0)} aria-pressed={!!r?.mine} disabled={!enabled||busy} onClick={()=>void react(emoji)}>{emoji} <span>{r?.count??0}</span></button>})}</div>
 {reactions.length>0&&<details><summary>Quién ha reaccionado</summary>{reactions.map(r=><p key={r.emoji}>{r.emoji} {r.players.map(p=>'#'+p.number+' '+p.name).join(', ')}</p>)}</details>}{error&&<p role="alert">{error}</p>}</div>;
}
