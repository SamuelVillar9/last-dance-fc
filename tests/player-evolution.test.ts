import test from 'node:test';
import assert from 'node:assert/strict';
import {playerEvolution,evolutionValue,evolutionSummary} from '../lib/player-evolution';
import type {Match,Report} from '../lib/types';
const fixture=(key:string,date:string,round:number):Match=>({key,round,phase:'I',group:'A',home:'LAST DANCE',away:'Rival '+round,date,time:'10:00',venue:'Pista',homeScore:1,awayScore:0,status:'played'});
test('evolution orders reports chronologically even if database returns unordered rows',()=>{
 const reports:Report[]=[
 {match_key:'m2',entries:[{playerId:'p',goals:2,assists:1,yellow:0,red:0}],note:'',updated_at:''},
 {match_key:'m1',entries:[{playerId:'p',goals:1,assists:0,yellow:0,red:0}],note:'',updated_at:''}
 ];
 const points=playerEvolution('p',reports,[fixture('m2','2026-11-14',2),fixture('m1','2026-11-07',1)]);
 assert.deepEqual(points.map(p=>p.key),['m1','m2']);
 assert.deepEqual(points.map(p=>p.totalContributions),[1,4]);
 assert.equal(evolutionValue(points[1],'assists','match'),1);
 assert.equal(evolutionValue(points[1],'goals','cumulative'),3);
 assert.equal(evolutionSummary(points).average,2);
});
test('only reports containing player count as appearances; no fake zero matches',()=>{
 const points=playerEvolution('p',[{match_key:'m1',entries:[{playerId:'other',goals:3,assists:0,yellow:0,red:0}],note:'',updated_at:''}],[fixture('m1','2026-11-07',1)]);
 assert.equal(points.length,0);
});
test('summary handles empty stats and consecutive contribution streaks',()=>{
 assert.deepEqual(evolutionSummary([]),{matches:0,goals:0,assists:0,contributions:0,average:0,recent:0,previous:0,streak:0});
 const points=playerEvolution('p',[
 {match_key:'m1',entries:[{playerId:'p',goals:0,assists:0,yellow:0,red:0}],note:'',updated_at:''},
 {match_key:'m2',entries:[{playerId:'p',goals:0,assists:1,yellow:0,red:0}],note:'',updated_at:''}
 ],[fixture('m1','2026-11-07',1),fixture('m2','2026-11-14',2)]);
 assert.equal(evolutionSummary(points).streak,1);
});
