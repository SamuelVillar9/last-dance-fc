import test from 'node:test';
import assert from 'node:assert/strict';
import {mvpRanking,availabilityText} from '../lib/team';
import {INITIAL_PLAYERS} from '../lib/types';
test('MVP awards take priority, then total votes; ties both count as awards',()=>{
 const rows=mvpRanking(INITIAL_PLAYERS,[],[
 {match_key:'a',player_id:'player-1',votes:2,winner:true},
 {match_key:'a',player_id:'player-2',votes:2,winner:true},
 {match_key:'b',player_id:'player-2',votes:1,winner:false},
 {match_key:'b',player_id:'player-3',votes:20,winner:false}]);
 assert.equal(rows[0].id,'player-2');assert.equal(rows[0].mvps,1);assert.equal(rows[1].id,'player-1');assert.equal(rows[2].id,'player-3');
});
test('WhatsApp list includes every active player exactly once including unanswered',()=>{
 const players=INITIAL_PLAYERS.slice(0,3);
 const text=availabilityText('Next match',players,[{match_key:'m',player_id:'player-1',status:'yes'},{match_key:'m',player_id:'player-2',status:'no'}]);
 assert.match(text,/Voy \(1\)/);assert.match(text,/No voy \(1\)/);assert.match(text,/Duda \(0\)/);assert.match(text,/Sin responder \(1\)/);
 for(const p of players)assert.equal(text.split('#'+p.number+' '+p.name).length-1,1);
});
