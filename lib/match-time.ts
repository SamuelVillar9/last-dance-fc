import type {Match} from './types';

// Interpret league wall-clock times in Madrid, independently of the device zone.
export function matchStart(match: Pick<Match, 'date' | 'time' | 'status'>): number | null {
 if(match.status !== 'scheduled' || !match.date || !match.time || !/^\d{4}-\d{2}-\d{2}$/.test(match.date) || !/^([01]\d|2[0-3]):[0-5]\d$/.test(match.time)) return null;
 const wall = Date.parse(`${match.date}T${match.time}:00Z`);
 if(!Number.isFinite(wall) || new Date(wall).toISOString().slice(0,10)!==match.date) return null;
 const formatter = new Intl.DateTimeFormat('sv-SE', {timeZone:'Europe/Madrid',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'});
 let instant = wall;
 for(let i=0;i<3;i++) {
  const local = Date.parse(formatter.format(new Date(instant)).replace(' ','T')+'Z');
  const next = instant + wall - local;
  if(next === instant) return instant;
  instant = next;
 }
 return null; // A nonexistent time during the spring clock change.
}

export function countdownParts(target:number, now:number) {
 const seconds=Math.max(0, Math.ceil((target-now)/1000));
 return {days:Math.floor(seconds/86400),hours:Math.floor(seconds/3600)%24,minutes:Math.floor(seconds/60)%60,seconds:seconds%60};
}

export function nextClubMatch(matches:Match[], now=Date.now()):Match|undefined {
 const today=new Intl.DateTimeFormat('sv-SE',{timeZone:'Europe/Madrid'}).format(new Date(now));
 const candidates=matches.filter(m=>m.status==='scheduled' && (!m.date || m.date>=today));
 candidates.sort((a,b)=>(a.date??'9999').localeCompare(b.date??'9999') || (a.time??'99:99').localeCompare(b.time??'99:99') || a.key.localeCompare(b.key));
 return candidates[0] ?? matches.find(m=>m.status==='postponed');
}
