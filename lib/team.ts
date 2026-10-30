import type {Player,Report} from './types';
export type Availability={match_key:string;player_id:string;status:'yes'|'no'|'maybe'};
export type Ballot={match_key:string;opens_at:string;closes_at:string;my_vote:string|null;voters:string[]};
export type Portal={pending:boolean;admin?:boolean;playerId?:string|null;availability?:Availability[];rounds?:Ballot[];accounts?:{player_id:string;email:string}[]};
export type MvpResult={match_key:string;player_id:string;votes:number;winner:boolean};
export const statusLabels={yes:'Voy',no:'No voy',maybe:'Duda'};
export function mvpRanking(players:Player[],reports:Report[],results:MvpResult[]){
 return players.map(p=>({...p,mvps:results.filter(r=>r.player_id===p.id&&r.winner).length,votes:results.filter(r=>r.player_id===p.id).reduce((s,r)=>s+r.votes,0),played:reports.filter(r=>r.entries.some(e=>e.playerId===p.id)).length})).sort((a,b)=>b.mvps-a.mvps||b.votes-a.votes||a.number-b.number);
}
export function availabilityText(title:string,players:Player[],responses:Availability[]){
 return title+'\n\n'+(['yes','no','maybe','pending'] as const).map(status=>{
 const list=players.filter(p=>(responses.find(r=>r.player_id===p.id)?.status??'pending')===status);
 return (status==='pending'?'Sin responder':statusLabels[status])+' ('+list.length+')\n'+(list.map(p=>'#'+p.number+' '+p.name).join('\n')||'—');
 }).join('\n\n');
}
