import test from 'node:test';
import assert from 'node:assert/strict';
import {concededTotal,isGoalkeeper,INITIAL_PLAYERS,type Report} from '../lib/types';
import {reportSchema} from '../lib/validation';
const base={playerId:'player-1',goals:1,assists:0,yellow:0,red:0};
const report=(key:string,goalsConceded?:number|null):Report=>({match_key:key,entries:[{...base,...(goalsConceded===undefined?{}:{goalsConceded})}],note:'',updated_at:'2026-11-01'});
test('goals conceded only sum manually recorded published entries, including zero',()=>{
 assert.equal(concededTotal([report('a',2),report('b',0),report('c',3)],'player-1'),5);
 assert.equal(concededTotal([report('a'),report('b',null)],'player-1'),null);
 assert.equal(concededTotal([report('a',0)],'player-1'),0);
 assert.equal(concededTotal([report('a',2)],'player-7'),null);
});
test('republication replaces a match instead of double-counting it',()=>{
 const before=[report('a',2),report('b',1)];
 const corrected=before.map(r=>r.match_key==='a'?report('a',4):r);
 assert.equal(concededTotal(before,'player-1'),3);
 assert.equal(concededTotal(corrected,'player-1'),5);
});
test('old actas remain valid and manual input must be nonnegative integer',()=>{
 const payload={match_key:'a',entries:[base],note:''};
 assert.equal(reportSchema.safeParse(payload).success,true);
 assert.equal(reportSchema.safeParse({...payload,entries:[{...base,goalsConceded:null}]}).success,true);
 assert.equal(reportSchema.safeParse({...payload,entries:[{...base,goalsConceded:0}]}).success,true);
 for(const bad of [-1,1.5,101])assert.equal(reportSchema.safeParse({...payload,entries:[{...base,goalsConceded:bad}]}).success,false);
 assert.equal(isGoalkeeper({...INITIAL_PLAYERS[0],position:'Portero'}),true);
 assert.equal(isGoalkeeper({...INITIAL_PLAYERS[0],position:'Ala'}),false);
});
