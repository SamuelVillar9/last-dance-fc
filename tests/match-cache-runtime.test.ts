import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

function runtime(){
 let now=1000000,id=0,calls=0,reloads=0,healthy=false;
 const timers=new Map<number,{at:number;callback:()=>void}>(),events:Record<string,()=>unknown>={};
 class Clock extends Date{static now(){return now}}
 const document={visibilityState:'visible',documentElement:{dataset:{}},querySelector:()=>null,addEventListener:(event:string,callback:()=>unknown)=>{events[event]=callback}};
 const navigator={onLine:true};
 const context={document,navigator,window:{addEventListener:(event:string,callback:()=>unknown)=>{events[event]=callback}},localStorage:{getItem:()=>null},Date:Clock,Intl,AbortController,
  setInterval:()=>0,setTimeout:(callback:()=>void,delay:number)=>{timers.set(++id,{at:now+delay,callback});return id},clearTimeout:(timer:number)=>timers.delete(timer),
  fetch:async()=>{calls++;return new Response(healthy?'<div data-match-source="valid">Updated</div>':'Unavailable',{status:healthy?200:503})},location:{replace:()=>{reloads++}}
 };
 vm.createContext(context);vm.runInContext(readFileSync('public/match-cache-runtime.js','utf8'),context);
 const flush=()=>new Promise<void>(resolve=>setImmediate(resolve));
 async function advance(ms:number){await flush();const until=now+ms;while(true){const next=[...timers].sort((a,b)=>a[1].at-b[1].at).find(([,timer])=>timer.at<=until);if(!next)break;now=next[1].at;timers.delete(next[0]);next[1].callback();await flush()}now=until;await flush()}
 return {advance,flush,events,document,navigator,setHealthy:()=>{healthy=true},calls:()=>calls,reloads:()=>reloads};
}

test('saved page recovers from server failure without another online event, then stops retrying',async()=>{
 const h=runtime();await h.flush();assert.equal(h.calls(),1);h.setHealthy();await h.advance(15000);assert.equal(h.reloads(),1);assert.equal(h.calls(),2);
 await h.advance(600000);assert.equal(h.calls(),2);
});

test('cooldown events retain a pending recovery; hidden and disconnected pages pause requests',async()=>{
 const h=runtime();await h.flush();await h.advance(2000);h.events.online();await h.flush();assert.equal(h.calls(),1);
 h.document.visibilityState='hidden';await h.advance(15000);assert.equal(h.calls(),1);
 h.document.visibilityState='visible';h.navigator.onLine=false;h.events.visibilitychange();await h.advance(30000);assert.equal(h.calls(),1);
 h.navigator.onLine=true;h.setHealthy();h.events.online();await h.flush();assert.equal(h.reloads(),1);assert.equal(h.calls(),2);
});
