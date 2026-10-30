import type {Match, Player} from './types';
import {fullDate} from './format';

function loadImage(src:string):Promise<HTMLImageElement>{
 return new Promise((resolve,reject)=>{const img=new Image();img.crossOrigin='anonymous';const timer=setTimeout(()=>reject(Error('La imagen tarda demasiado en cargar. Vuelve a intentarlo.')),15000);img.onload=()=>{clearTimeout(timer);resolve(img)};img.onerror=()=>{clearTimeout(timer);reject(Error('No se pudo cargar la foto. Puedes generar la tarjeta del equipo o revisar la foto del jugador.'))};img.src=src});
}

// Canvas runs exclusively after a user gesture. No API routes, uploads or database writes.
export async function createMatchPoster(match:Match,player?:Player):Promise<Blob>{
 await Promise.all([document.fonts.load('800 100px "Barlow Condensed"'),document.fonts.load('600 32px Barlow')]);
 const [crest,photo]=await Promise.all([loadImage('/crest.png'),player?.photo_url?loadImage(player.photo_url):Promise.resolve(null)]);
 const styles=getComputedStyle(document.documentElement);
 const ink=styles.getPropertyValue('--ink').trim()||'#111';
 const bg=styles.getPropertyValue('--bg').trim()||'#fff';
 const red=styles.getPropertyValue('--red').trim()||'#F72441';
 const canvas=document.createElement('canvas');canvas.width=1080;canvas.height=1350;
 const context=canvas.getContext('2d');if(!context)throw Error('Tu navegador no permite generar imágenes.');
 const ctx:CanvasRenderingContext2D=context;
 function text(value:string,x:number,y:number,max:number,size:number,color=ink){ctx.fillStyle=color;let s=size;do{ctx.font=`800 ${s}px "Barlow Condensed", sans-serif`;if(ctx.measureText(value).width<=max)break;s-=2}while(s>18);ctx.fillText(value,x,y,max)}
 function lines(value:string,x:number,y:number,max:number,size:number){
  ctx.fillStyle=ink;ctx.font=`600 ${size}px Barlow, sans-serif`;const words=value.split(/\s+/);let line='',row=0;
  for(const word of words){const next=line?line+' '+word:word;if(ctx.measureText(next).width>max&&line){ctx.fillText(line,x,y+row*size*1.3);row++;line=word}else line=next}ctx.fillText(line,x,y+row*size*1.3);
 }
 ctx.fillStyle=bg;ctx.fillRect(0,0,1080,1350);
 ctx.fillStyle='#111113';ctx.fillRect(0,0,450,1350);
 ctx.save();ctx.globalAlpha=.18;ctx.strokeStyle=red;ctx.lineWidth=3;for(let y=-200;y<1600;y+=95){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(450,y+300);ctx.stroke()}ctx.restore();
 text(player?String(player.number).padStart(2,'0'):'LD',25,290,390,260,'#ffffff');
 if(photo){
  ctx.save();ctx.beginPath();ctx.rect(0,310,450,930);ctx.clip();
  const scale=Math.max(450/photo.naturalWidth,930/photo.naturalHeight);
  ctx.drawImage(photo,(450-photo.naturalWidth*scale)/2,310,photo.naturalWidth*scale,photo.naturalHeight*scale);
  const fade=ctx.createLinearGradient(0,950,0,1240);fade.addColorStop(0,'#11111300');fade.addColorStop(1,'#111113');ctx.fillStyle=fade;ctx.fillRect(0,950,450,290);ctx.restore();
 }else{ctx.drawImage(crest,55,430,340,340);text('LAST',50,930,350,130,'#fff');text('DANCE',50,1050,350,130,red)}
 text(player?.name.toUpperCase()??'EL EQUIPO',28,1270,390,58,'#fff');
 ctx.fillStyle=red;ctx.fillRect(450,0,12,1350);ctx.fillRect(500,140,530,142);
 text(match.status==='played'?'FINAL':'MATCH',525,250,480,124,'#fff');
 text(match.status==='played'?'DEL PARTIDO':'DAY',500,420,530,match.status==='played'?82:170);
 text('LAST DANCE FC',500,80,420,38);ctx.drawImage(crest,928,25,95,95);
 text('JORNADA '+match.round+' / '+match.phase.toUpperCase(),500,488,530,30);
 text(match.home.toUpperCase(),500,600,530,64);
 text(match.status==='played'?`${match.homeScore??'—'} : ${match.awayScore??'—'}`:'VS',500,690,530,80,red);
 text(match.away.toUpperCase(),500,780,530,64);
 ctx.fillStyle=red;ctx.fillRect(500,840,530,4);
 lines(fullDate(match.date).toUpperCase(),500,905,510,30);
 text(match.status==='postponed'?'APLAZADO':match.time?match.time+' H':'HORA POR CONFIRMAR',500,1035,530,60);
 lines(match.venue?.trim()||'Campo por confirmar',500,1100,510,28);
 text('FÚTBOL SALA / MADRID',500,1245,530,28);
 ctx.fillStyle=red;ctx.fillRect(0,1320,1080,30);
 return new Promise((resolve,reject)=>canvas.toBlob(blob=>blob?resolve(blob):reject(Error('No se pudo crear el PNG.')),'image/png'));
}
