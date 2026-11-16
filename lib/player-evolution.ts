import type {Match,Report} from './types';
export type EvolutionPoint={key:string;round:number;label:string;date:string|null;opponent:string;goals:number;assists:number;yellow:number;red:number;totalGoals:number;totalAssists:number;totalContributions:number;matchNumber:number};
export type EvolutionMetric='goals'|'assists'|'contributions';
export function playerEvolution(playerId:string,reports:Report[],matches:Match[]):EvolutionPoint[]{
 const byMatch=new Map(matches.map(m=>[m.key,m]));
 const rows=reports.flatMap(r=>{
  const e=r.entries.find(e=>e.playerId===playerId);
  if(!e)return [];
  const m=byMatch.get(r.match_key);
  return [{key:r.match_key,round:m?.round??0,label:m?.round?'J'+m.round:'Partido',date:m?.date??null,opponent:m?(m.home.trim().toUpperCase().startsWith('LAST DANCE')?m.away:m.home):'Rival sin confirmar',goals:e.goals,assists:e.assists,yellow:e.yellow,red:e.red}];
 });
 rows.sort((a,b)=>(a.date??'9999').localeCompare(b.date??'9999')||a.round-b.round||a.key.localeCompare(b.key));
 let goals=0,assists=0;
 return rows.map((r,i)=>{goals+=r.goals;assists+=r.assists;return {...r,totalGoals:goals,totalAssists:assists,totalContributions:goals+assists,matchNumber:i+1}});
}
export function evolutionValue(p:EvolutionPoint,metric:EvolutionMetric,mode:'cumulative'|'match'){
 if(mode==='cumulative')return metric==='goals'?p.totalGoals:metric==='assists'?p.totalAssists:p.totalContributions;
 return metric==='goals'?p.goals:metric==='assists'?p.assists:p.goals+p.assists;
}
export function evolutionSummary(points:EvolutionPoint[]){
 const n=points.length,goals=points.reduce((a,p)=>a+p.goals,0),assists=points.reduce((a,p)=>a+p.assists,0);
 const last=points.slice(-5),prev=points.slice(-10,-5);
 const contribution=(p:EvolutionPoint)=>p.goals+p.assists;
 const recent=last.reduce((a,p)=>a+contribution(p),0),previous=prev.reduce((a,p)=>a+contribution(p),0);
 let streak=0;for(let i=n-1;i>=0&&contribution(points[i])>0;i--)streak++;
 return {matches:n,goals,assists,contributions:goals+assists,average:n?(goals+assists)/n:0,recent,previous,streak};
}
