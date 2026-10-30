import {test} from 'node:test';
import assert from 'node:assert/strict';
import {commentLength,validComment,mergeComments,type MatchComment} from '../lib/comments';
test('comments validate trimmed Unicode characters consistently with Postgres',()=>{
 assert.equal(commentLength('  Buen partido 😂 \n'),14);
 assert.equal(validComment(' \n\t'),false);assert.equal(validComment('😂'.repeat(280)),true);assert.equal(validComment('😂'.repeat(281)),false);
});
test('comment pagination never repeats a comment already displayed',()=>{
 const row=(id:string)=>({id} as MatchComment);assert.deepEqual(mergeComments([row('a'),row('b')],[row('b'),row('c')]).map(row=>row.id),['a','b','c']);
});
