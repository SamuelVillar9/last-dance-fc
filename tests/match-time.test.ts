import {test} from 'node:test';
import assert from 'node:assert/strict';
import {matchStart,countdownParts,nextClubMatch} from '../lib/match-time';
import type {Match} from '../lib/types';
const fixture=(date:string|null,time:string|null,status:Match['status']='scheduled'):Match=>({key:`${date}-${time}`,date,time,status,round:1,phase:'Fase I',group:'General',home:'LAST DANCE',away:'Rival',venue:null,homeScore:null,awayScore:null});
test('Madrid winter and summer kickoffs are independent of system zone',()=>{
 assert.equal(matchStart(fixture('2026-11-08','10:30')),Date.parse('2026-11-08T09:30:00Z'));
 assert.equal(matchStart(fixture('2027-06-06','10:30')),Date.parse('2027-06-06T08:30:00Z'));
 assert.equal(matchStart(fixture('2027-03-28','03:30')),Date.parse('2027-03-28T01:30:00Z'));
 assert.equal(matchStart(fixture('2027-03-28','02:30')),null);
});
test('pending, invalid and postponed fixtures never get an invented kickoff',()=>{
 for(const m of [fixture(null,'10:30'),fixture('2026-11-08',null),fixture('2026-11-08','10:30','postponed'),fixture('2026-02-30','10:30'),fixture('2026-11-08','25:30')]) assert.equal(matchStart(m),null);
});
test('countdown rolls over and clamps to zero at and after kickoff',()=>{
 assert.deepEqual(countdownParts(90061000,0),{days:1,hours:1,minutes:1,seconds:1});
 assert.deepEqual(countdownParts(1000,1000),{days:0,hours:0,minutes:0,seconds:0});
 assert.deepEqual(countdownParts(1000,2000),{days:0,hours:0,minutes:0,seconds:0});
});
test('next fixture retains match day, ignores stale unplayed games and prioritizes confirmed dates',()=>{
 const old=fixture('2026-10-25','10:00'),today=fixture('2026-11-08','10:30'),next=fixture('2026-11-15','10:00'),postponed=fixture('2026-10-18',null,'postponed');
 assert.equal(nextClubMatch([old,postponed,next,today],Date.parse('2026-11-08T20:00:00Z')),today);
 assert.equal(nextClubMatch([old,postponed,next,today],Date.parse('2026-11-09T00:00:00Z')),next);
 assert.equal(nextClubMatch([old,postponed],Date.parse('2026-11-09T00:00:00Z')),postponed);
 assert.equal(nextClubMatch([old],Date.parse('2026-11-09T00:00:00Z')),undefined);
});
