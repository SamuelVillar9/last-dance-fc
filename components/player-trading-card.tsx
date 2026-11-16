import Link from 'next/link';
import {Avatar} from './ui';
import type {PlayerStats} from '@/lib/player-stats';
import {formatStat} from '@/lib/player-stats';
export type CardStyle='classic'|'elite';
export function PlayerTradingCard({player,style='classic',download=false}:{player:PlayerStats;style?:CardStyle;download?:boolean}){
 return <div className={'trading-card trading-card-'+style} aria-label={'Carta de '+player.name}>
  <div className="trading-card-top"><span>LAST DANCE FC</span><span>26/27</span></div>
  <div className="trading-card-identity"><div><strong>{String(player.number).padStart(2,'0')}</strong><span>{player.position||'JUGADOR'}</span></div><div className="trading-card-avatar"><Avatar player={player} large/></div></div>
  <div className="trading-card-name"><small>{player.nickname?'“'+player.nickname+'”':'TEMPORADA 2026/27'}</small><strong>{player.name} {player.surname||''}</strong></div>
  <div className="trading-card-stats">{[['PJ',player.played],['GOL',player.goals],['ASI',player.assists],['G+A',player.contributions],['G/P',player.goalsPerMatch],['A/P',player.assistsPerMatch]].map(([k,v])=><div key={k}><strong>{formatStat(Number(v))}</strong><span>{k}</span></div>)}</div>
  <div className="trading-card-bottom"><img src="/crest.png" alt="" width={30} height={30}/><span>ESTADÍSTICAS DE ACTAS PUBLICADAS</span></div>
  {download&&<Link className="trading-card-download" href={'/api/player-card?player='+encodeURIComponent(player.id)+'&style='+style} target="_blank" download={'last-dance-'+player.number+'.png'}>Descargar carta PNG ↗</Link>}
 </div>;
}
