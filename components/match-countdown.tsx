'use client';
import {useEffect,useState} from 'react';
import {countdownParts} from '@/lib/match-time';

export function MatchCountdown({target}:{target:number|null}) {
 const [now,setNow]=useState<number|null>(null);
 useEffect(()=>{
  if(target===null)return;
  const tick=()=>setNow(Date.now());
  tick();
  const timer=setInterval(tick,1000);
  document.addEventListener('visibilitychange',tick);
  return()=>{clearInterval(timer);document.removeEventListener('visibilitychange',tick)};
 },[target]);
 if(target===null)return <div className="match-countdown countdown-pending">Horario por confirmar</div>;
 if(now===null)return <div className="match-countdown countdown-pending">Preparando cuenta atrás…</div>;
 if(now>=target)return <div className="match-countdown match-day">¡DÍA DE PARTIDO!</div>;
 const parts=countdownParts(target,now);
 return <div className="match-countdown" role="timer" aria-label="Tiempo hasta el partido" aria-live="off"><span className="countdown-label">FALTAN</span><div className="countdown-units">{([['days','DÍAS'],['hours','HORAS'],['minutes','MIN'],['seconds','SEG']] as const).map(([key,label])=><span key={key}><b>{String(parts[key]).padStart(2,'0')}</b><small>{label}</small></span>)}</div></div>;
}
