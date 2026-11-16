import Link from 'next/link';
import {notFound} from 'next/navigation';
import {getData} from '@/lib/data';
import {playerStats} from '@/lib/player-stats';
import {PlayerTradingCard} from '@/components/player-trading-card';
import {Title} from '@/components/ui';
export const dynamic='force-dynamic';
export const metadata={title:'Carta de jugador | LAST DANCE FC'};
export default async function Page({params,searchParams}:{params:Promise<{id:string}>;searchParams:Promise<{style?:string}>}){
 const {id}=await params;const {style}=await searchParams;
 const {players,reports,leagues}=await getData();
 const p=playerStats(players,reports,leagues.flatMap(l=>l.matches)).find(p=>p.id===id);
 if(!p)notFound();
 const selected=style==='elite'?'elite':'classic';
 return <><Link className="back-link" href={'/plantilla/'+encodeURIComponent(id)}>← Volver a la ficha</Link><Title eyebrow="COLECCIÓN 26/27" title="MI" accent="CARTA." description="Tu carta de LAST DANCE FC, basada en las actas publicadas."/><div className="trading-card-page"><PlayerTradingCard player={p} style={selected} download/><div className="trading-card-side"><h2>Elige un acabado</h2><div className="card-style-options"><Link aria-current={selected==='classic'?'page':undefined} href={'?style=classic'}>Clásica</Link><Link aria-current={selected==='elite'?'page':undefined} href={'?style=elite'}>Élite</Link></div><p>Las cifras se actualizan cuando se publican o corrigen actas. Si todavía no has jugado, se muestran ceros reales y no una valoración ficticia.</p><Link className="action" href={'/comparar?a='+encodeURIComponent(id)}>Comparar con otro jugador →</Link></div></div></>;
}
