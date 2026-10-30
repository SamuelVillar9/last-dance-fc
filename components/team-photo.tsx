'use client';
import {useRef,useState} from 'react';
import {Expand,X,ZoomIn,ZoomOut} from 'lucide-react';
import {DEFAULT_TEAM_PHOTO} from '@/lib/team-photo';
export function TeamPhoto({src,caption,alt,width,height}:{src:string;caption:string;alt:string;width:number;height:number}){
 const dialog=useRef<HTMLDialogElement>(null),[zoomed,setZoomed]=useState(false),[failed,setFailed]=useState('');
 const fallback=failed===src,source=fallback?DEFAULT_TEAM_PHOTO.src:src;
 const imageWidth=fallback?DEFAULT_TEAM_PHOTO.width:width,imageHeight=fallback?DEFAULT_TEAM_PHOTO.height:height;
 const description=fallback?DEFAULT_TEAM_PHOTO.alt:alt,label=fallback?DEFAULT_TEAM_PHOTO.caption:caption;
 const bundled=source===DEFAULT_TEAM_PHOTO.src;
 return <figure className="team-photo"><button type="button" className="team-photo-open" aria-label="Ampliar foto del equipo" onClick={()=>{setZoomed(false);dialog.current?.showModal()}}><img src={source} srcSet={bundled?'/team-photo-v1-768.webp 768w, /team-photo-v1-1280.webp 1280w, /team-photo-v1.webp 1672w':undefined} sizes="(max-width: 1200px) 100vw, 1160px" alt={description} width={imageWidth} height={imageHeight} fetchPriority="high" decoding="async" onError={()=>{if(!fallback&&src!==DEFAULT_TEAM_PHOTO.src)setFailed(src)}}/><span className="team-photo-expand"><Expand size={16}/> Ampliar</span></button><figcaption><span>{label}</span><small>Composición a partir de los retratos de los jugadores.</small></figcaption>
 <dialog ref={dialog} className="team-photo-dialog" aria-label="Foto del equipo ampliada"><div className="team-photo-tools"><button type="button" className="chip" aria-pressed={zoomed} onClick={()=>setZoomed(value=>!value)}>{zoomed?<ZoomOut size={16}/>:<ZoomIn size={16}/>} {zoomed?'Ver completa':'Ver detalle'}</button><button type="button" className="team-photo-close" aria-label="Cerrar foto ampliada" onClick={()=>dialog.current?.close()}><X size={24}/></button></div><div className="team-photo-zoom"><img src={source} alt={description} width={imageWidth} height={imageHeight} style={zoomed?{width:imageWidth,maxWidth:'none'}:undefined}/></div><p>{label}</p><small>Amplía para ver las caras y desplázate por la imagen.</small></dialog></figure>;
}
