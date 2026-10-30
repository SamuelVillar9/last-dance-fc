import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

function harness(){
 const origin='https://lastdance.test',handlers:Record<string,(event:any)=>void>={};
 const stores=new Map<string,Map<string,Response>>();
 const key=(value:string|Request)=>new URL(typeof value==='string'?value:value.url,origin).href;
 let fail=false,network='<div data-match-source="valid">Updated match</div>';
 const sandbox:any={URL,Response,AbortController,setTimeout,clearTimeout,Math,Date,Promise,Set,
  self:{location:{origin},clients:{claim:async()=>{}},skipWaiting:async()=>{},addEventListener:(type:string,callback:any)=>{handlers[type]=callback}},
  caches:{keys:async()=>[...stores.keys()],delete:async(name:string)=>stores.delete(name),open:async(name:string)=>{
   if(!stores.has(name))stores.set(name,new Map());const store=stores.get(name)!;
   return {match:async(value:string|Request)=>store.get(key(value))?.clone(),put:async(value:string|Request,response:Response)=>{store.set(key(value),response.clone())}};
  }},
  fetch:async(value:string|Request)=>{if(fail)throw Error('Network failed');const url=key(value);return new Response(url.endsWith('.css')?'@font-face{src:url(/_next/static/media/font.woff2)}':url.includes('/_next/')?'asset':network)}
 };
 vm.createContext(sandbox);vm.runInContext(readFileSync('public/match-cache-sw.js','utf8'),sandbox);
 const snapshot={html:'<!doctype html><body data-match-document="1">Saved match</body>',assets:['/_next/static/css/site.css','/crest.png','/match-cache-runtime.js?v=1']};
 return {sandbox,handlers,stores,snapshot,setFail:(value:boolean)=>{fail=value},setNetwork:(value:string)=>{network=value},origin};
}

test('match snapshot commits its presentation and fonts together, retaining the last good copy after failed downloads',async()=>{
 const h=harness();await h.sandbox.saveSnapshot(h.snapshot);
 assert.match(await(await h.sandbox.savedDocument()).text(),/Saved match/);
 const entries=[...h.stores.values()][0];assert.ok([...entries.keys()].some(url=>url.endsWith('font.woff2')));
 h.setFail(true);await assert.rejects(h.sandbox.saveSnapshot({...h.snapshot,revision:'new',html:h.snapshot.html.replace('Saved match','Broken match')}));
 assert.match(await(await h.sandbox.savedDocument()).text(),/Saved match/);assert.equal(h.stores.size,1);
});

test('match cache rejects private and external assets and bounds snapshot history',async()=>{
 const h=harness();
 for(const asset of ['/admin','/equipo','https://other.test/image','/api/sync'])await assert.rejects(h.sandbox.saveSnapshot({...h.snapshot,assets:[asset]}));
 for(let i=0;i<4;i++){await new Promise(resolve=>setTimeout(resolve,2));await h.sandbox.saveSnapshot({...h.snapshot,revision:String(i)})}
 assert.equal(h.stores.size,2);
});

test('failed or invalid home responses silently use saved data; successful fresh data wins',async()=>{
 const h=harness();await h.sandbox.saveSnapshot(h.snapshot);
 async function navigate(){let response:Promise<Response>|undefined;h.handlers.fetch({request:{url:h.origin+'/',method:'GET',mode:'navigate'},respondWith:(value:Promise<Response>)=>{response=value}});return (await response!)!.text()}
 h.setFail(true);assert.match(await navigate(),/Saved match/);
 h.setFail(false);h.setNetwork('<div data-match-source="invalid">Bundled fallback</div>');assert.match(await navigate(),/Saved match/);
 h.setNetwork('<div data-match-source="valid">New fixture</div>');assert.match(await navigate(),/New fixture/);
});

test('worker never intercepts private routes, API requests, RSC requests or writes',()=>{
 const h=harness();
 for(const [url,method,mode] of [[h.origin+'/admin','GET','navigate'],[h.origin+'/equipo','GET','navigate'],[h.origin+'/api/sync','POST','cors'],[h.origin+'/?_rsc=abc','GET','cors'],['https://database.test/rest/v1/players','GET','cors']]){
  let intercepted=false;h.handlers.fetch({request:{url,method,mode},respondWith:()=>{intercepted=true}});assert.equal(intercepted,false,url);
 }
});

test('unavailable browser storage never blocks the online home or its styles',async()=>{
 const h=harness();h.sandbox.caches.keys=async()=>{throw Error('Storage unavailable')};
 for(const [url,mode] of [[h.origin+'/','navigate'],[h.origin+'/_next/static/css/site.css','cors']]){
  let response:Promise<Response>|undefined;h.handlers.fetch({request:{url,method:'GET',mode},respondWith:(value:Promise<Response>)=>{response=value}});
  assert.equal((await response!)!.status,200);
 }
});

test('asset requests never expose an unfinished snapshot',async()=>{
 const h=harness();await h.sandbox.saveSnapshot(h.snapshot);
 const old=await h.sandbox.caches.open([...h.stores.keys()][0]);await old.put('/match-cache-runtime.js?v=2',new Response('committed runtime'));
 const pending=await h.sandbox.caches.open('ld-match-v1-9999999999999-pending');await pending.put('/match-cache-runtime.js?v=2',new Response('unfinished runtime'));
 let response:Promise<Response>|undefined;
 h.handlers.fetch({request:{url:h.origin+'/match-cache-runtime.js?v=2',method:'GET',mode:'cors'},respondWith:(value:Promise<Response>)=>{response=value}});
 assert.equal(await(await response!)!.text(),'committed runtime');
});
