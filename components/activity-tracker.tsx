'use client';
import {useEffect} from 'react';
import {usePathname} from 'next/navigation';
import {browserDb} from '@/lib/browser-db';

// One shared tracker across public pages, the vestuario and administration.
export function ActivityTracker() {
 const path=usePathname();
 useEffect(()=>{
  const client=browserDb();
  if(!client)return;
  let disposed=false, userId:string|null=null, lastSent=0, pending=false;
  async function record() {
   if(disposed || !userId || pending || document.visibilityState!=='visible' || Date.now()-lastSent<300000)return;
   pending=true;
   lastSent=Date.now(); // Also bound retries while the network is unavailable.
   const identity=userId;
   try {
    const {error}=await client!.rpc('record_activity');
    if(!error && identity===userId)lastSent=Date.now();
   }catch {/* Activity must never interrupt the website. */}
   finally {pending=false}
  }
  void client.auth.getSession().then(({data})=>{if(!disposed){userId=data.session?.user.id??null;void record()}}).catch(()=>{});
  const {data}=client.auth.onAuthStateChange((_event,session)=>{
   const next=session?.user.id??null;
   if(next!==userId){userId=next;lastSent=0}
   // Avoid invoking Supabase from within its auth callback lock.
   setTimeout(()=>{void record()},0);
  });
  const interacted=()=>{void record()};
  const events=['pointerdown','keydown','scroll','focus','pageshow'] as const;
  events.forEach(event=>window.addEventListener(event,interacted,{passive:true}));
  document.addEventListener('visibilitychange',interacted);
  return()=>{disposed=true;data.subscription.unsubscribe();events.forEach(event=>window.removeEventListener(event,interacted));document.removeEventListener('visibilitychange',interacted)};
 },[path]);
 return null;
}
