'use client';
import {useId,useMemo,useState} from 'react';
import Link from 'next/link';
import type {EvolutionPoint,EvolutionMetric} from '@/lib/player-evolution';
import {evolutionSummary,evolutionValue} from '@/lib/player-evolution';
type Mode='cumulative'|'match';
const METRICS:{key:EvolutionMetric;label:string;color:string}[]=[
 {key:'contributions',label:'Goles + asistencias',color:'#f72441'},
 {key:'goals',label:'Goles',color:'#ff9f43'},
 {key:'assists',label:'Asistencias',color:'#28b8b4'}
];
export function PlayerEvolution({points,playerName}:{points:EvolutionPoint[];playerName:string}){
 const [metric,setMetric]=useState<EvolutionMetric>('contributions');
 const [mode,setMode]=useState<Mode>('cumulative');
 const [period,setPeriod]=useState<'all'|'last5'|'last10'>('all');
 const [selected,setSelected]=useState<number|null>(null);
 const gradientId=useId().replace(/:/g,'');
 const visible=useMemo(()=>period==='last5'?points.slice(-5):period==='last10'?points.slice(-10):points,[points,period]);
 const summary=useMemo(()=>evolutionSummary(points),[points]);
 const series=visible.map(p=>evolutionValue(p,metric,mode));
 const maximum=Math.max(1,...series);
 const W=760,H=292,L=43,R=20,T=24,B=49;
 const x=(i:number)=>L+(visible.length<2?(W-L-R)/2:i*(W-L-R)/(visible.length-1));
 const y=(v:number)=>T+(H-T-B)*(1-v/maximum);
 const coords=series.map((v,i)=>[x(i),y(v)] as const);
 const smooth=coords.length>1?coords.reduce((s,[cx,cy],i)=>{
  if(i===0)return 'M '+cx+' '+cy;
  const [px,py]=coords[i-1];const mid=(px+cx)/2;
  return s+' C '+mid+' '+py+', '+mid+' '+cy+', '+cx+' '+cy;
 },''):'';
 const baseline=H-B;
 const area=coords.length>1?smooth+' L '+coords[coords.length-1][0]+' '+baseline+' L '+coords[0][0]+' '+baseline+' Z':'';
 const active=selected===null?visible.length-1:Math.min(selected,visible.length-1);
 const point=visible[active];
 const chosen=METRICS.find(m=>m.key===metric)!;
 const format=(n:number)=>n.toLocaleString('es-ES',{maximumFractionDigits:2});
 if(!points.length)return <section className="evo-empty"><h2>EVOLUCIÓN DE TEMPORADA</h2><p>Los gráficos aparecerán cuando se publique la primera acta de {playerName}. No se muestran estadísticas inventadas.</p></section>;
 return <section className="evo" aria-label={'Evolución estadística de '+playerName}>
  <div className="evo-heading"><div><span className="evo-eyebrow">TEMPORADA 2026/27 · DATOS DE ACTAS PUBLICADAS</span><h2>EN CADA JORNADA<span>.</span></h2><p>Explora la evolución real de {playerName} partido a partido.</p></div><span className="evo-season">26/27</span></div>
  <div className="evo-kpis">
   <div><span>PARTIDOS CON ACTA</span><strong>{summary.matches}</strong></div>
   <div><span>GOLES</span><strong>{summary.goals}</strong></div>
   <div><span>ASISTENCIAS</span><strong>{summary.assists}</strong></div>
   <div><span>PARTICIPACIONES / PARTIDO</span><strong>{format(summary.average)}</strong></div>
  </div>
  <div className="evo-panel">
   <div className="evo-controls">
    <div className="evo-metrics" role="group" aria-label="Estadística">
     {METRICS.map(m=><button type="button" key={m.key} className={metric===m.key?'active':''} style={{'--metric-color':m.color} as React.CSSProperties} aria-pressed={metric===m.key} onClick={()=>{setMetric(m.key);setSelected(null)}}>{m.label}</button>)}
    </div>
    <div className="evo-options"><div className="evo-segment" role="group" aria-label="Visualización">
     <button type="button" aria-pressed={mode==='cumulative'} className={mode==='cumulative'?'active':''} onClick={()=>{setMode('cumulative');setSelected(null)}}>Acumulado</button>
     <button type="button" aria-pressed={mode==='match'} className={mode==='match'?'active':''} onClick={()=>{setMode('match');setSelected(null)}}>Por partido</button>
    </div><label className="evo-period">Periodo <select value={period} onChange={e=>{setPeriod(e.target.value as typeof period);setSelected(null)}}><option value="all">Toda la temporada</option><option value="last10">Últimos 10 partidos</option><option value="last5">Últimos 5 partidos</option></select></label></div>
   </div>
   <div className="evo-current" aria-live="polite"><span>{chosen.label} · {mode==='cumulative'?'acumulado':'por partido'}</span><strong style={{color:chosen.color}}>{point?format(evolutionValue(point,metric,mode)):'0'}</strong><small>{point?'Seleccionado: '+point.label+' · '+point.opponent:'Sin datos'}</small></div>
   <div className="evo-chart-scroll">
    <svg className="evo-chart" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`Gráfico de líneas interactivo de ${chosen.label} de ${playerName}`}>
     <defs><linearGradient id={gradientId} x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stopColor={chosen.color} stopOpacity=".30"/><stop offset="100%" stopColor={chosen.color} stopOpacity="0"/></linearGradient></defs>
     {[0,.25,.5,.75,1].map(f=><g key={f}><line x1={L} x2={W-R} y1={y(maximum*f)} y2={y(maximum*f)} stroke="currentColor" strokeOpacity=".12" strokeDasharray="3 6"/><text x={L-9} y={y(maximum*f)+4} textAnchor="end" fill="currentColor" opacity=".55" fontSize="12">{format(maximum*f)}</text></g>)}
     {area&&<path d={area} fill={`url(#${gradientId})`}/>}
     {smooth&&<path d={smooth} fill="none" stroke={chosen.color} strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" className="evo-line"/>}
     {coords.map(([cx,cy],i)=><g key={visible[i].key}>
      <circle cx={cx} cy={cy} r={active===i?10:5} fill={chosen.color} opacity={active===i?.2:1}/>
      <circle cx={cx} cy={cy} r={active===i?5.5:3.5} fill={chosen.color} stroke="var(--bg)" strokeWidth="2"/>
      <circle cx={cx} cy={cy} r="21" fill="transparent" role="button" tabIndex={0} aria-label={`${visible[i].label}, ${visible[i].opponent}: ${series[i]} ${chosen.label.toLowerCase()}`} onClick={()=>setSelected(i)} onKeyDown={e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();setSelected(i)}}}><title>{visible[i].label}: {series[i]} · {visible[i].opponent}</title></circle>
      {(visible.length<=10||i===0||i===visible.length-1||i%Math.ceil(visible.length/8)===0)&&<text x={cx} y={H-16} textAnchor="middle" fill="currentColor" opacity=".7" fontSize="12">{visible[i].label}</text>}
     </g>)}
     {point&&<line x1={x(active)} x2={x(active)} y1={T} y2={baseline} stroke={chosen.color} strokeOpacity=".35" strokeDasharray="4 5" pointerEvents="none"/>}
    </svg>
   </div>
   {point&&<div className="evo-match-detail"><div><span>JORNADA SELECCIONADA</span><strong>{point.label} · {point.opponent}</strong><small>{point.date??'Fecha sin confirmar'}</small></div><div className="evo-match-numbers"><span><b>{point.goals}</b> Goles</span><span><b>{point.assists}</b> Asist.</span><span><b>{point.goals+point.assists}</b> Participaciones</span></div><Link href={'/partidos/'+encodeURIComponent(point.key)}>Ver partido ↗</Link></div>}
   <div className="evo-scrub"><span>Explorar jornadas</span><input type="range" min={0} max={Math.max(0,visible.length-1)} value={active} onChange={e=>setSelected(Number(e.target.value))} aria-label="Seleccionar jornada del gráfico" disabled={visible.length<2}/><span>{point?.label}</span></div>
  </div>
  <div className="evo-insights">
   <div><span>ÚLTIMOS 5 PARTIDOS</span><strong>{summary.recent}</strong><small>Participaciones en gol</small></div>
   <div><span>5 PARTIDOS ANTERIORES</span><strong>{points.length>5?summary.previous:'—'}</strong><small>{points.length>5?'Para comparar tu evolución':'Todavía sin suficientes actas'}</small></div>
   <div><span>RACHA ACTUAL</span><strong>{summary.streak}</strong><small>Partidos seguidos participando en goles</small></div>
  </div>
  <p className="evo-footnote">Se muestran exclusivamente partidos con acta publicada y registro de este jugador. Los partidos sin acta no se interpretan como cero. Desliza o pulsa sobre la curva para explorar cada jornada.</p>
 </section>;
}
