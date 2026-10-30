/* Minimal standalone behavior; no React, auth, analytics or database requests. */
(()=>{
 function theme(){try{document.documentElement.dataset.theme=localStorage.getItem('ld-theme')||'system'}catch{}}
 theme();
 document.querySelector('.theme-toggle')?.addEventListener('click',()=>{
  const current=document.documentElement.dataset.theme||'system';
  const next=current==='system'?'dark':current==='dark'?'light':'system';
  document.documentElement.dataset.theme=next;
  document.querySelector('.theme-toggle')?.setAttribute('aria-label','Tema '+(next==='system'?'del dispositivo':next==='dark'?'oscuro':'claro')+'. Cambiar tema');
  try{localStorage.setItem('ld-theme',next)}catch{}
 });
 function tick(){
  const element=document.querySelector('[data-match-target]');if(!element)return;
  const target=Number(element.dataset.matchTarget),now=Date.now();if(!Number.isFinite(target))return;
  if(now>=target){
   const date=new Intl.DateTimeFormat('sv-SE',{timeZone:'Europe/Madrid'});
   element.className='match-countdown match-day';element.removeAttribute('role');
   element.textContent=date.format(now)===date.format(target)?'¡DÍA DE PARTIDO!':'El partido ya ha pasado';return;
  }
  const seconds=Math.ceil((target-now)/1000);
  const values=[Math.floor(seconds/86400),Math.floor(seconds/3600)%24,Math.floor(seconds/60)%60,seconds%60];
  element.className='match-countdown';element.setAttribute('role','timer');element.setAttribute('aria-live','off');element.setAttribute('aria-label','Tiempo hasta el partido');
  element.replaceChildren();const title=document.createElement('span');title.className='countdown-label';title.textContent='FALTAN';element.append(title);
  const units=document.createElement('div');units.className='countdown-units';
  values.forEach((value,index)=>{const span=document.createElement('span'),b=document.createElement('b'),small=document.createElement('small');b.textContent=String(value).padStart(2,'0');small.textContent=['DÍAS','HORAS','MIN','SEG'][index];span.append(b,small);units.append(span)});element.append(units);
 }
 tick();setInterval(tick,1000);document.addEventListener('visibilitychange',tick);
 let busy=false,lastAttempt=0;
 async function restore(){
  if(busy||document.visibilityState!=='visible'||Date.now()-lastAttempt<15000||navigator.onLine===false)return;
  busy=true;lastAttempt=Date.now();const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),5000);
  try{
   const response=await fetch('/',{cache:'no-store',credentials:'omit',signal:controller.signal});
   if(response.ok&&(await response.text()).includes('data-match-source="valid"'))location.replace('/');
  }catch{}finally{clearTimeout(timer);busy=false}
 }
 window.addEventListener('online',restore);document.addEventListener('visibilitychange',restore);
 void restore();
})();
