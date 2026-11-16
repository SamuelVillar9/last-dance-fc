import {playerEvolution,evolutionSummary} from './player-evolution';
import {totals,type Player,type Report,type Match} from './types';
export type PlayerStats=ReturnType<typeof totals>[number]&{contributions:number;goalsPerMatch:number;assistsPerMatch:number;contributionsPerMatch:number;yellowPerMatch:number;redPerMatch:number;recentContributions:number;streak:number};
export function playerStats(players:Player[],reports:Report[],matches:Match[]):PlayerStats[]{
 return totals(players,reports).map(p=>{
  const points=playerEvolution(p.id,reports,matches);
  const summary=evolutionSummary(points);
  return {...p,contributions:p.goals+p.assists,goalsPerMatch:p.played?p.goals/p.played:0,assistsPerMatch:p.played?p.assists/p.played:0,contributionsPerMatch:p.played?(p.goals+p.assists)/p.played:0,yellowPerMatch:p.played?p.yellow/p.played:0,redPerMatch:p.played?p.red/p.played:0,recentContributions:summary.recent,streak:summary.streak};
 });
}
export type CompareMetric='played'|'goals'|'assists'|'contributions'|'goalsPerMatch'|'assistsPerMatch'|'contributionsPerMatch'|'yellow'|'red';
export const compareMetrics:{key:CompareMetric;label:string;unit:'count'|'rate'}[]=[
 {key:'played',label:'Partidos',unit:'count'},{key:'goals',label:'Goles',unit:'count'},{key:'assists',label:'Asistencias',unit:'count'},{key:'contributions',label:'Participaciones',unit:'count'},
 {key:'goalsPerMatch',label:'Goles / partido',unit:'rate'},{key:'assistsPerMatch',label:'Asist. / partido',unit:'rate'},{key:'contributionsPerMatch',label:'Particip. / partido',unit:'rate'},
 {key:'yellow',label:'Amarillas',unit:'count'},{key:'red',label:'Rojas',unit:'count'}
];
export function comparisonValue(p:PlayerStats,key:CompareMetric){return p[key];}
export function formatStat(n:number){return Number.isInteger(n)?String(n):n.toLocaleString('es-ES',{maximumFractionDigits:2});}
export function radarValues(a:PlayerStats,b:PlayerStats){
 const keys:CompareMetric[]=['goalsPerMatch','assistsPerMatch','contributionsPerMatch','played'];
 return keys.map(key=>{const max=Math.max(a[key],b[key],0.001);return {key,label:compareMetrics.find(m=>m.key===key)!.label,a:a[key]/max,b:b[key]/max};});
}
