import {ImageResponse} from 'next/og';
import {getData} from '@/lib/data';
import {playerStats} from '@/lib/player-stats';
export const runtime='nodejs';
export const dynamic='force-dynamic';
export async function GET(request:Request){
 const {searchParams}=new URL(request.url);
 const id=searchParams.get('player');
 if(!id||id.length>100)return new Response('Jugador no válido',{status:400});
 const style=searchParams.get('style')==='elite'?'elite':'classic';
 const {players,reports,leagues}=await getData();
 const p=playerStats(players,reports,leagues.flatMap(l=>l.matches)).find(p=>p.id===id);
 if(!p)return new Response('Jugador no encontrado',{status:404});
 const bg=style==='elite'?'#241c0d':'#0e0e12';
 const accent=style==='elite'?'#e8b95a':'#f72441';
 const host=process.env.NEXT_PUBLIC_SUPABASE_URL;
 let photo:string|undefined;
 try{if(p.photo_url&&host&&new URL(p.photo_url).origin===new URL(host).origin)photo=p.photo_url;}catch{}
 const stats=[['PARTIDOS',p.played],['GOLES',p.goals],['ASIST.',p.assists],['G + A',p.contributions],['G/P',p.goalsPerMatch.toFixed(2)],['A/P',p.assistsPerMatch.toFixed(2)]];
 return new ImageResponse(<div style={{display:'flex',flexDirection:'column',width:'100%',height:'100%',background:bg,color:'#fff',padding:54,border:'15px solid '+accent,fontFamily:'sans-serif'}}>
  <div style={{display:'flex',justifyContent:'space-between',fontSize:28,fontWeight:800,letterSpacing:3,color:accent}}><span>LAST DANCE FC</span><span>26/27</span></div>
  <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',height:610}}>
   <div style={{display:'flex',flexDirection:'column',width:190}}><span style={{fontSize:142,fontWeight:900,color:accent}}>{p.number}</span><span style={{fontSize:29}}>{p.position||'JUGADOR'}</span></div>
   {photo?<img src={photo} width={430} height={560} style={{objectFit:'contain'}}/>:<div style={{display:'flex',width:430,height:540,alignItems:'center',justifyContent:'center',background:'#29292e',fontSize:140,color:accent}}>{p.number}</div>}
  </div>
  <div style={{display:'flex',flexDirection:'column',borderTop:'3px solid '+accent,paddingTop:28}}>
   <span style={{fontSize:26,color:accent}}>{p.nickname||'TEMPORADA 2026/27'}</span>
   <span style={{fontSize:70,fontWeight:900,textTransform:'uppercase'}}>{p.name} {p.surname||''}</span>
  </div>
  <div style={{display:'flex',flexWrap:'wrap',marginTop:34,gap:15}}>{stats.map(([label,value])=><div key={label} style={{display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',width:205,height:125,background:'#ffffff12',borderRadius:14}}><span style={{fontSize:46,fontWeight:900}}>{value}</span><span style={{fontSize:20,color:'#dddddd'}}>{label}</span></div>)}</div>
  <div style={{display:'flex',marginTop:'auto',justifyContent:'space-between',fontSize:20,color:accent}}><span>DATOS DE ACTAS PUBLICADAS</span><span>LAST DANCE FC</span></div>
 </div>,{width:800,height:1200,headers:{'Content-Disposition':'attachment; filename="last-dance-'+p.number+'.png"','Cache-Control':'no-store'}});
}
