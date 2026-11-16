import {getData} from '@/lib/data';
import {playerEvolution} from '@/lib/player-evolution';
import {playerStats} from '@/lib/player-stats';
import {PlayerComparison} from '@/components/player-comparison';
import {Title} from '@/components/ui';
export const dynamic='force-dynamic';
export const metadata={title:'Cara a cara | LAST DANCE FC'};
export default async function Page({searchParams}:{searchParams:Promise<{a?:string;b?:string}>}){
 const {players,reports,leagues}=await getData();
 const data=playerStats(players,reports,leagues.flatMap(l=>l.matches)).filter(p=>p.active);
 const histories=Object.fromEntries(data.map(p=>[p.id,playerEvolution(p.id,reports,leagues.flatMap(l=>l.matches))]));
 const params=await searchParams;
 return <><Title eyebrow="TEMPORADA 2026/27" title="CARA A" accent="CARA." description="Dos compañeros. Una temporada. Estadísticas reales, sin inventar atributos."/><PlayerComparison histories={histories} players={data} initialA={params.a} initialB={params.b}/></>;
}
