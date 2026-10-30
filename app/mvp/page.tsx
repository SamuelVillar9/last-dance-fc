import Link from 'next/link';
import {getData} from '@/lib/data';
import {db} from '@/lib/supabase';
import {mvpRanking,type MvpResult} from '@/lib/team';
import {Title,Empty} from '@/components/ui';
export const dynamic='force-dynamic';
export const metadata={title:'Ranking MVP | LAST DANCE FC'};
export default async function Page(){
 const {players,reports,leagues}=await getData();
 const client=db();const response=client?await client.rpc('mvp_results'):null;
 const results=(response?.data??[]) as unknown as MvpResult[];
 const ranking=mvpRanking(players,reports,results);
 const matches=leagues.flatMap(l=>l.matches);
 const keys=[...new Set(results.map(r=>r.match_key))];
 return <><Title eyebrow="TEMPORADA 2026/27" title="LOS" accent="MVP."/><p className="muted">Elegidos por los compañeros que figuran en el acta. Primero cuentan los MVP ganados; después, los votos recibidos. Los empates comparten premio.</p><Link href="/equipo" className="action">Entrar al vestuario y votar</Link>{response?.error?<Empty>El ranking está preparado. Los resultados estarán disponibles al activar las votaciones.</Empty>:<>{!results.length&&<Empty>El pique empieza pronto. Los resultados aparecerán cuando cierre la primera votación con votos.</Empty>}<div className="table-scroll team-ranking"><table><thead><tr><th>POS.</th><th>JUGADOR</th><th>MVP</th><th>VOTOS</th><th>PARTIDOS</th></tr></thead><tbody>{ranking.map((p,i)=><tr key={p.id}><td>{i+1}</td><td><Link href={'/plantilla/'+p.id}>#{p.number} {p.name}</Link></td><td className="points">{p.mvps}</td><td>{p.votes}</td><td>{p.played}</td></tr>)}</tbody></table></div>{keys.map(key=>{const m=matches.find(m=>m.key===key);const rows=results.filter(r=>r.match_key===key).sort((a,b)=>b.votes-a.votes);return <section className="admin-card" key={key} id={encodeURIComponent(key)}><h2>{m?'J'+m.round+' · '+m.home+' — '+m.away:'MVP del partido'}</h2><p>{rows.filter(r=>r.winner).map(r=>{const p=players.find(p=>p.id===r.player_id);return '#'+p?.number+' '+p?.name}).join(' y ')} · {rows.filter(r=>r.winner).length>1?'MVP compartido':'MVP'}</p><ul>{rows.map(r=>{const p=players.find(p=>p.id===r.player_id);return <li key={r.player_id}>#{p?.number} {p?.name}: {r.votes} {r.votes===1?'voto':'votos'}</li>})}</ul><Link className="muted" href={'/partidos/'+encodeURIComponent(key)}>Ver acta del partido →</Link></section>})}</>}</>;
}
