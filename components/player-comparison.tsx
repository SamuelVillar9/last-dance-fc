'use client';
import {useMemo,useState} from 'react';
import Link from 'next/link';
import {Avatar} from './ui';
import {compareMetrics,comparisonValue,formatStat,radarValues,type PlayerStats,type CompareMetric} from '@/lib/player-stats';
type Period='all'|'last5'|'last10';
type Point={goals:number;assists:number;matchNumber:number;totalContributions:number};
function Polygon({values,color}:{values:number[];color:string}){
 const cx=180,cy=158,r=115,n=values.length;
 const points=values.map((v,i)=>{const angle=-Math.PI/2+2*Math.PI*i/n;return (cx+Math.cos(angle)*r*v)+','+(cy+Math.sin(angle)*r*v)}).join(' ');
 return <polygon points={points} fill={color} fillOpacity=".16" stroke={color} strokeWidth="3" strokeLinejoin="round"/>;
}
export function PlayerComparison({players,initialA,initialB}:{players:PlayerStats[];initialA?:string;initialB?:string}){
 const first=players.find(p=>p.id===initialA)?.id??players[0]?.id??'';
 const second=players.find(p=>p.id===initialB&&p.id!==first)?.id??players.find(p=>p.id!==first)?.id??'';
 const [aId,setA]=useState(first),[bId,setB]=useState(second);
 const [period,setPeriod]=useState<Period>('all');
 const [metric,setMetric]=useState<'goals'|'assists'|'contributions'>('contributions');
 const a=players.find(p=>p.id===aId),b=players.find(p=>p.id===bId);
 const radar=useMemo(()=>a&&b?radarValues(a,b):[],[a,b]);
 if(players.length<2)return <p className="notice">Necesitamos al menos dos jugadores en la plantilla para comparar.</p>;
 if(!a||!b)return null;
 const switchPlayers=()=>{setA(bId);setB(aId)};
 const link='/comparar?a='+encodeURIComponent(aId)+'&b='+encodeURIComponent(bId);
 const radarLabels=radar.map((m,i)=>{const angle=-Math.PI/2+2*Math.PI*i/radar.length;return {label:m.label,x:180+Math.cos(angle)*146,y:158+Math.sin(angle)*146}});
 return <section className="versus" aria-label="Comparador de jugadores">
  <div className="versus-pickers"><div><label htmlFor="compare-a">Jugador A</label><select id="compare-a" value={aId} onChange={e=>{setA(e.target.value);if(e.target.value===bId)setB(aId)}}>{players.map(p=><option key={p.id} value={p.id}>#{p.number} · {p.nickname||p.name}</option>)}</select></div><button className="versus-swap" type="button" onClick={switchPlayers} aria-label="Intercambiar jugadores">⇄</button><div><label htmlFor="compare-b">Jugador B</label><select id="compare-b" value={bId} onChange={e=>{setB(e.target.value);if(e.target.value===aId)setA(bId)}}>{players.map(p=><option key={p.id} value={p.id}>#{p.number} · {p.nickname||p.name}</option>)}</select></div></div>
  <div className="versus-heroes"><div className="versus-player"><Avatar player={a} large/><strong>{a.nickname||a.name}</strong><span>#{a.number}</span><Link href={'/plantilla/'+a.id}>Ver ficha ↗</Link></div><div className="versus-mark">VS</div><div className="versus-player"><Avatar player={b} large/><strong>{b.nickname||b.name}</strong><span>#{b.number}</span><Link href={'/plantilla/'+b.id}>Ver ficha ↗</Link></div></div>
  <div className="versus-actions"><Link href={link}>Enlace a esta comparación ↗</Link><Link href={'/plantilla/'+a.id+'/carta'}>Carta de {a.nickname||a.name} ↗</Link><Link href={'/plantilla/'+b.id+'/carta'}>Carta de {b.nickname||b.name} ↗</Link></div>
  <div className="versus-data"><h2>LOS NÚMEROS NO MIENTEN.</h2>{compareMetrics.map(m=>{const x=comparisonValue(a,m.key),y=comparisonValue(b,m.key),max=Math.max(x,y,1);return <div className="versus-stat" key={m.key}><div className="versus-stat-line"><strong className={x>y?'winner':''}>{formatStat(x)}</strong><span>{m.label}</span><strong className={y>x?'winner':''}>{formatStat(y)}</strong></div><div className="versus-stat-bars"><div><span style={{width:(x/max*100)+'%'}}/></div><div><span style={{width:(y/max*100)+'%'}}/></div></div></div>})}</div>
  <div className="versus-radar"><h2>RADAR DE RENDIMIENTO</h2><p>Escala relativa: el mejor valor entre ambos es el 100% de cada eje. No es una valoración de habilidad. Los porteros pueden tener perfiles distintos.</p><svg viewBox="0 0 360 330" role="img" aria-label="Radar comparativo de partidos y producción ofensiva"><g fill="none" stroke="currentColor" strokeOpacity=".18">{[.25,.5,.75,1].map(scale=><polygon key={scale} points={radar.map((_,i)=>{const angle=-Math.PI/2+2*Math.PI*i/radar.length;return (180+Math.cos(angle)*115*scale)+','+(158+Math.sin(angle)*115*scale)}).join(' ')}/>)}</g><Polygon values={radar.map(m=>m.a)} color="#f72441"/><Polygon values={radar.map(m=>m.b)} color="#e8a23b"/>{radarLabels.map((p,i)=><text key={i} x={p.x} y={p.y} fill="currentColor" textAnchor="middle" fontSize="11">{p.label}</text>)}</svg><div className="versus-legend"><span><i style={{background:'#f72441'}}/>{a.nickname||a.name}</span><span><i style={{background:'#e8a23b'}}/>{b.nickname||b.name}</span></div></div>
  <p className="versus-note">Estadísticas de actas publicadas. Las medias se calculan únicamente con partidos registrados; los partidos sin acta no se cuentan como cero.</p>
 </section>;
}
