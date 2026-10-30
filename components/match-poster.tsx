'use client';
import {useEffect,useRef,useState} from 'react';
import type {Match,Player} from '@/lib/types';

export function MatchPoster({match,player}:{match:Match;player?:Player}){
 const [busy,setBusy]=useState(false),[error,setError]=useState(''),[preview,setPreview]=useState('');
 const url=useRef('');const generation=useRef(0);
 useEffect(()=>{generation.current++;setPreview('');setError('');setBusy(false);if(url.current){URL.revokeObjectURL(url.current);url.current=''};return()=>{generation.current++;if(url.current)URL.revokeObjectURL(url.current)}},[match.key,player?.id,player?.photo_url]);
 async function generate(){
  const current=++generation.current;setBusy(true);setError('');
  try{const {createMatchPoster}=await import('@/lib/match-poster');const blob=await createMatchPoster(match,player);if(current!==generation.current)return;if(url.current)URL.revokeObjectURL(url.current);url.current=URL.createObjectURL(blob);setPreview(url.current)}catch(e){if(current===generation.current)setError(e instanceof Error?e.message:'No se pudo generar la tarjeta.')}finally{if(current===generation.current)setBusy(false)}
 }
 const filename=`last-dance-j${match.round}${player?'-'+player.number:''}.png`;
 return <section className="admin-card match-poster"><h2>{player?'TU TARJETA DEL PARTIDO':'TARJETA DEL PARTIDO'}</h2><p className="muted">{player?`Personalizada para ${player.name} · #${player.number}. `:''}PNG de 1080 × 1350 con el tema claro u oscuro que tengas activo al generar. Puedes guardarlo y compartirlo en WhatsApp o redes.</p>{player&&!player.photo_url&&<p className="muted">Tu ficha aún no tiene foto. Usaremos el escudo con tu nombre y dorsal.</p>}<button className="action" onClick={()=>void generate()} disabled={busy}>{busy?'Generando imagen…':preview?'Volver a generar':'Generar imagen'}</button>{error&&<p role="alert" className="admin-message">{error}</p>}{preview&&<div className="poster-preview"><img src={preview} width={1080} height={1350} alt={`Tarjeta de ${match.home} contra ${match.away}${player?' con '+player.name:''}`}/><a className="action" download={filename} href={preview}>Descargar PNG</a><p className="muted">Si el móvil abre la imagen, mantenla pulsada para guardarla en Fotos.</p></div>}</section>;
}
