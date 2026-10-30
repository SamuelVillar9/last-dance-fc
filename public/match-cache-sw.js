/* Only the public home summary and its static presentation resources are stored. */
const PREFIX='ld-match-v1-';
const DOCUMENT='/__ld_saved_match__';
let saving=Promise.resolve();
self.addEventListener('install',()=>self.skipWaiting());
self.addEventListener('activate',event=>event.waitUntil(self.clients.claim()));
function assetAllowed(value){
 const url=new URL(value,self.location.origin);
 return url.origin===self.location.origin&&(/^\/_next\/static\/.*\.(?:css|woff2?|ttf|otf)$/.test(url.pathname)||['/crest.png','/match-cache-runtime.js'].includes(url.pathname));
}
async function savedDocument(){
 try{
  const names=(await caches.keys()).filter(name=>name.startsWith(PREFIX)).sort().reverse();
  for(const name of names){const cache=await caches.open(name);const response=await cache.match(DOCUMENT);if(response)return response}
 }catch{/* Storage may be unavailable; preserve normal online navigation. */}
 return null;
}
async function saveSnapshot(data){
 if(typeof data.html!=='string'||data.html.length>250000||!data.html.includes('data-match-document="1"')||!Array.isArray(data.assets)||!data.assets.length||data.assets.length>30)throw Error('Invalid snapshot');
 if(data.assets.some(value=>typeof value!=='string'||!assetAllowed(value)))throw Error('Invalid resources');
 const revision=encodeURIComponent(JSON.stringify([data.revision,data.assets]));
 if((await savedDocument())?.headers.get('X-LD-Revision')===revision)return;
 const name=PREFIX+Date.now()+'-'+Math.random().toString(36).slice(2);
 const cache=await caches.open(name);
 try{
  const resources=new Set(data.assets.map(value=>new URL(value,self.location.origin).href));
  // Stylesheets may reference local fonts. Keep them with the same snapshot.
  for(const url of resources){
   let response;
   if(new URL(url).pathname.startsWith('/_next/static/')){
    for(const old of (await caches.keys()).filter(key=>key.startsWith(PREFIX)&&key!==name).sort().reverse()){
     const previous=await caches.open(old);
     if(!await previous.match(DOCUMENT))continue;
     response=await previous.match(url);if(response)break;
    }
   }
   response=response||await fetch(url,{cache:'no-cache',credentials:'omit'});
   if(!response.ok||response.type==='opaque')throw Error('Resource unavailable');
   if(new URL(url).pathname.endsWith('.css')){
    const css=await response.clone().text();
    for(const item of css.matchAll(/url\(\s*['"]?([^'"\s)]+)['"]?\s*\)/g)){
     const font=new URL(item[1],url).href;
     if(assetAllowed(font))resources.add(font);
    }
   }
   if(resources.size>60)throw Error('Too many resources');
   await cache.put(url,response);
  }
  // Commit last: an incomplete resource download must never replace good data.
  await cache.put(DOCUMENT,new Response(data.html,{headers:{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store','X-LD-Revision':revision}}));
  const complete=[];
  for(const old of (await caches.keys()).filter(key=>key.startsWith(PREFIX)).sort().reverse()){
   if(await(await caches.open(old)).match(DOCUMENT))complete.push(old);
  }
  await Promise.all(complete.slice(2).map(old=>caches.delete(old)));
 }catch(error){await caches.delete(name);throw error}
}
self.addEventListener('message',event=>{
 if(event.data?.type!=='SAVE_PUBLIC_MATCH'||!event.source?.url||new URL(event.source.url).origin!==self.location.origin)return;
 const source=new URL(event.source.url);
 if(source.pathname!=='/')return;
 saving=saving.catch(()=>{}).then(()=>saveSnapshot(event.data));
 event.waitUntil(saving.then(()=>event.ports[0]?.postMessage({ok:true})).catch(()=>event.ports[0]?.postMessage({ok:false})));
});
self.addEventListener('fetch',event=>{
 const request=event.request,url=new URL(request.url);
 if(request.method!=='GET'||url.origin!==self.location.origin)return;
 if(request.mode==='navigate'&&url.pathname==='/'){
  event.respondWith((async()=>{
   const cached=await savedDocument();
   const controller=new AbortController();
   const timer=cached?setTimeout(()=>controller.abort(),4500):null;
   try{
    const response=await fetch(request,{signal:controller.signal});
    if(!cached)return response;
    const html=response.ok?await response.clone().text():'';
    return html.includes('data-match-source="valid"')?response:cached;
   }catch(error){if(cached)return cached;throw error}finally{if(timer)clearTimeout(timer)}
  })());
 }else if(assetAllowed(request.url)){
  event.respondWith((async()=>{
   try{
    for(const name of (await caches.keys()).filter(key=>key.startsWith(PREFIX)).sort().reverse()){
     const cache=await caches.open(name);
     if(!await cache.match(DOCUMENT))continue;
     const response=await cache.match(request);if(response)return response;
    }
   }catch{/* A storage failure must not block static resources from the network. */}
   return fetch(request);
  })());
 }
});
