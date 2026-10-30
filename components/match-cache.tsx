'use client';
import {useEffect} from 'react';
import {useRouter} from 'next/navigation';

// Copy only the explicitly selected public presentation. Never cache the app shell's scripts or private routes.
export function MatchCache({valid,revision}:{valid:boolean;revision:string}){
 const router=useRouter();
 useEffect(()=>{
  if(!('serviceWorker' in navigator))return;
  let disposed=false,lastAttempt=-Infinity,reconnectPending=false;
  let refreshTimer:ReturnType<typeof setTimeout>|null=null;
  async function save(){
   if(!valid||disposed)return;
   try{
    const registration=await navigator.serviceWorker.ready;
    if(disposed||!registration.active)return;
    const section=document.querySelector('[data-match-summary]'),hero=document.querySelector('.hero'),source=document.querySelector('[data-match-source]');
    if(!section||!source)return;
    const page=document.implementation.createHTMLDocument('LAST DANCE FC · Fútbol sala');
    page.documentElement.lang='es';page.documentElement.dataset.theme=document.documentElement.dataset.theme||'system';
    const viewport=document.createElement('meta');viewport.name='viewport';viewport.content='width=device-width,initial-scale=1,viewport-fit=cover';page.head.append(viewport);
    const assets=['/crest.png','/match-cache-runtime.js?v=2'];
    document.querySelectorAll<HTMLLinkElement>('link[rel="stylesheet"]').forEach(link=>{if(new URL(link.href).origin===location.origin){page.head.append(link.cloneNode(true));assets.push(link.href)}});
    // Development embeds styles; production always uses the hashed CSS files above.
    if(process.env.NODE_ENV==='development')document.querySelectorAll('style').forEach(style=>page.head.append(style.cloneNode(true)));
    const main=document.createElement('main');main.id='contenido';main.className='main';
    if(hero)main.append(hero.cloneNode(true));
    main.append(section.cloneNode(true),source.cloneNode(true));
    const header=document.querySelector('.header'),footer=document.querySelector('.footer'),nav=document.querySelector('.bottom-nav');
    if(header)page.body.append(header.cloneNode(true));page.body.append(main);
    if(footer)page.body.append(footer.cloneNode(true));if(nav)page.body.append(nav.cloneNode(true));
    page.body.dataset.matchDocument='1';
    page.querySelectorAll('script').forEach(script=>script.remove());
    const script=document.createElement('script');script.src='/match-cache-runtime.js?v=2';script.defer=true;page.head.append(script);
    registration.active.postMessage({type:'SAVE_PUBLIC_MATCH',revision,html:'<!doctype html>'+page.documentElement.outerHTML,assets});
   }catch{/* Local persistence must never affect the normal website. */}
  }
  void navigator.serviceWorker.register('/match-cache-sw.js',{scope:'/',updateViaCache:'none'}).then(async()=>{
   if(valid){await save();return}
   // A soft refresh may receive a server fallback. Recover the last real fixture silently.
   for(const name of await caches.keys()){
    if(!name.startsWith('ld-match-v1-'))continue;
    const cache=await caches.open(name);
    if(await cache.match('/__ld_saved_match__')){if(!disposed)location.replace('/');break}
   }
  }).catch(()=>{});
  function refresh(){
   if(disposed||!reconnectPending||document.visibilityState!=='visible'||navigator.onLine===false)return;
   const remaining=15000-(Date.now()-lastAttempt);
   if(remaining>0){
    if(refreshTimer===null)refreshTimer=setTimeout(()=>{refreshTimer=null;refresh()},remaining);
    return;
   }
   if(refreshTimer!==null){clearTimeout(refreshTimer);refreshTimer=null}
   lastAttempt=Date.now();reconnectPending=false;router.refresh();
  }
  function online(){reconnectPending=true;refresh()}
  function visible(){if(reconnectPending)refresh()}
  window.addEventListener('online',online);document.addEventListener('visibilitychange',visible);
  return()=>{disposed=true;if(refreshTimer!==null)clearTimeout(refreshTimer);window.removeEventListener('online',online);document.removeEventListener('visibilitychange',visible)};
 },[valid,revision,router]);
 return null;
}
