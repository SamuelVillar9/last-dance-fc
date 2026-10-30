export type Player={id:string;name:string;number:number;position:string|null;photo_url:string|null;active:boolean};
export type Match={key:string;round:number;phase:string;group:string;home:string;away:string;date:string|null;time:string|null;venue:string|null;homeScore:number|null;awayScore:number|null;status:'scheduled'|'played'|'postponed'|'bye'};
export type Standing={position:number;team:string;points:number;played:number;won:number;drawn:number;lost:number;gf:number;ga:number;gd:number};
export type FairPlay={team:string;points:number;yellow:number;red:number};
export type League={matches:Match[];standings:Standing[];fairPlay:FairPlay[];updatedAt:string;phase:string;group:string};
export type Entry={playerId:string;goals:number;assists:number;yellow:number;red:number};
export type Report={match_key:string;entries:Entry[];note:string;updated_at:string};
export const CLUB='LAST DANCE';
export const isClub=(name:string)=>name.trim().toUpperCase().replace(/\s+FC$/,'')===CLUB;
export function clubMatch(m:Match){return isClub(m.home)||isClub(m.away)}
export const INITIAL_PLAYERS:Player[]=[[1,'Dani'],[2,'Álvaro'],[3,'Joaquín'],[4,'Miguel'],[6,'Fdez'],[7,'Samu'],[10,'Jony'],[11,'Kevin'],[14,'Dani'],[19,'Rafa Jarillo'],[20,'Rafa Rodríguez']].map(([number,name])=>({id:`player-${number}`,name:String(name),number:Number(number),position:null,photo_url:null,active:true}));
export function totals(players:Player[],reports:Report[]){return players.map(p=>({...p,played:reports.filter(r=>r.entries.some(e=>e.playerId===p.id)).length,...reports.flatMap(r=>r.entries).filter(e=>e.playerId===p.id).reduce((a,e)=>({goals:a.goals+e.goals,assists:a.assists+e.assists,yellow:a.yellow+e.yellow,red:a.red+e.red}),{goals:0,assists:0,yellow:0,red:0})}));}
