import test from 'node:test';
import assert from 'node:assert/strict';
import {playerStats,radarValues,comparisonValue,formatStat} from '../lib/player-stats';
import {INITIAL_PLAYERS,type Report} from '../lib/types';
const reports:Report[]=[{match_key:'m1',entries:[{playerId:'player-7',goals:2,assists:1,yellow:0,red:0},{playerId:'player-10',goals:0,assists:2,yellow:1,red:0}],note:'',updated_at:'2026-11-01'},{match_key:'m2',entries:[{playerId:'player-7',goals:0,assists:1,yellow:0,red:0}],note:'',updated_at:'2026-11-08'}];
test('comparison reuses published reports and never counts unreported appearances',()=>{
 const stats=playerStats(INITIAL_PLAYERS,reports,[]);
 const a=stats.find(p=>p.id==='player-7')!;
 const b=stats.find(p=>p.id==='player-10')!;
 assert.equal(a.played,2);assert.equal(a.goals,2);assert.equal(a.assists,2);assert.equal(a.contributions,4);assert.equal(a.contributionsPerMatch,2);
 assert.equal(b.played,1);assert.equal(b.assistsPerMatch,2);
 assert.equal(comparisonValue(a,'yellow'),0);
});
test('players without reports have zero actual stats and finite normalized radar',()=>{
 const stats=playerStats(INITIAL_PLAYERS,[],[]);
 const radar=radarValues(stats[0],stats[1]);
 assert.ok(radar.every(row=>Number.isFinite(row.a)&&Number.isFinite(row.b)));
 assert.equal(stats[0].played,0);assert.equal(stats[0].contributionsPerMatch,0);
 assert.equal(formatStat(1.25),'1,25');
});
test('correcting an acta immediately changes totals',()=>{
 const first=playerStats(INITIAL_PLAYERS,reports,[]).find(p=>p.id==='player-7')!;
 const corrected=reports.map(r=>r.match_key==='m1'?{...r,entries:r.entries.map(e=>e.playerId==='player-7'?{...e,goals:3}:e)}:r);
 const after=playerStats(INITIAL_PLAYERS,corrected,[]).find(p=>p.id==='player-7')!;
 assert.equal(after.goals,first.goals+1);
});
