'use client';
import {useEffect,useState} from 'react';
import {browserDb} from '@/lib/browser-db';
import {DEFAULT_TEAM_PHOTO,teamPhotoSource,type TeamPhoto} from '@/lib/team-photo';
async function preparePhoto(file:File){
 if(file.size>15_000_000)throw Error('La imagen supera 15 MB.');
 const bitmap=await createImageBitmap(file);try{
  if(bitmap.width<800||bitmap.width<=bitmap.height)throw Error('Elige una foto horizontal de al menos 800 píxeles de ancho.');
  const ratio=Math.min(1,2560/bitmap.width),width=Math.round(bitmap.width*ratio),height=Math.round(bitmap.height*ratio);
  const canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;
  const ctx=canvas.getContext('2d');if(!ctx)throw Error('No se pudo preparar la imagen.');ctx.drawImage(bitmap,0,0,width,height);
  const blob=await new Promise<Blob>((resolve,reject)=>canvas.toBlob(b=>b?resolve(b):reject(Error('No se pudo convertir la imagen.')),'image/webp',.9));
  if(blob.type!=='image/webp'||blob.size>5_242_880)throw Error('No se pudo preparar un WebP de menos de 5 MB.');return {blob,width,height};
 }finally{bitmap.close()}
}
export function AdminTeamPhoto(){
 const client=browserDb();const [photo,setPhoto]=useState<TeamPhoto|null>(null),[caption,setCaption]=useState(''),[alt,setAlt]=useState(''),[file,setFile]=useState<File|null>(null),[ready,setReady]=useState(false),[busy,setBusy]=useState(false),[message,setMessage]=useState(''),[preview,setPreview]=useState('');
 async function load(){if(!client)return;const {data,error}=await client.from('team_photo').select('*').eq('id',true).single();if(error)throw Error('No se pudo cargar la foto de equipo. Pulsa Reintentar.');const current=data as TeamPhoto;setPhoto(current);setCaption(current.caption);setAlt(current.alt);setReady(true)}
 useEffect(()=>{void load().catch(e=>setMessage(e.message))},[client]);
 useEffect(()=>{if(!file){setPreview('');return}const url=URL.createObjectURL(file);setPreview(url);return()=>URL.revokeObjectURL(url)},[file]);
 async function save(event:React.FormEvent){
  event.preventDefault();if(!client||!photo||busy)return;setBusy(true);setMessage('');let uploaded:string|null=null,saved=false;
  try{
   if(!file&&!photo.image_path)throw Error('Selecciona una foto de grupo antes de guardar.');
   let path=photo.image_path,width=photo.width,height=photo.height;
   if(file){const image=await preparePhoto(file);uploaded='official/'+crypto.randomUUID()+'.webp';const {error}=await client.storage.from('team-photos').upload(uploaded,image.blob,{contentType:'image/webp',upsert:false});if(error)throw Error('No se pudo subir la foto. La anterior sigue publicada.');path=uploaded;width=image.width;height=image.height}
   const {data,error}=await client.from('team_photo').update({image_path:path,width,height,caption:caption.trim(),alt:alt.trim()}).eq('id',true).eq('updated_at',photo.updated_at).select().maybeSingle();
   if(error)throw Error('No se pudo guardar la foto. Comprueba los campos y vuelve a intentarlo.');if(!data)throw Error('La foto ha cambiado desde que abriste el panel. Recarga el apartado antes de guardar.');
   saved=true;const previous=photo.image_path;setPhoto(data as TeamPhoto);setFile(null);setMessage('Foto de equipo guardada. Ya está disponible en Plantilla.');
   if(uploaded&&previous){const cleanup=await client.storage.from('team-photos').remove([previous]);if(cleanup.error)setMessage('Foto guardada. No se pudo retirar el archivo anterior; la nueva foto está publicada.')}
  }catch(e){if(uploaded&&!saved)await client.storage.from('team-photos').remove([uploaded]);setMessage(e instanceof Error?e.message:'No se pudo guardar la foto.')}finally{setBusy(false)}
 }
 return <section className="admin-card"><h2>FOTO DE EQUIPO</h2><p className="muted">Aparece al principio de Plantilla. Cambiar un retrato individual no modifica esta composición.</p>
 {!ready?<><p role="status">{message||'Cargando foto de equipo…'}</p><button type="button" className="action secondary" onClick={()=>void load().catch(e=>setMessage(e.message))}>Reintentar</button></>:<form onSubmit={event=>void save(event)}>
 {(preview||teamPhotoSource(photo,process.env.NEXT_PUBLIC_SUPABASE_URL))?<img className="admin-team-photo-preview" src={preview||teamPhotoSource(photo,process.env.NEXT_PUBLIC_SUPABASE_URL)!} alt="Vista previa de la foto de equipo" width={photo?.width??DEFAULT_TEAM_PHOTO.width} height={photo?.height??DEFAULT_TEAM_PHOTO.height}/>:<p className="notice">Todavía no hay foto de equipo. Plantilla se mostrará sin imagen hasta que subas una.</p>}
 <label>Foto de grupo<input aria-label="Foto de grupo" type="file" accept="image/jpeg,image/png,image/webp" disabled={busy} onChange={event=>setFile(event.target.files?.[0]??null)}/><small>Horizontal, al menos 800 px de ancho y hasta 15 MB. Se optimiza sin recortar jugadores.</small></label>
 <label>Pie de foto<input required maxLength={160} value={caption} disabled={busy} onChange={event=>setCaption(event.target.value)}/></label>
 <label>Descripción accesible<textarea required maxLength={400} value={alt} disabled={busy} onChange={event=>setAlt(event.target.value)}/></label>
 <button className="action" disabled={busy||(!file&&!photo?.image_path)}>{busy?'Guardando…':'Guardar foto de equipo'}</button>{message&&<p className="admin-message" role="status">{message}</p>}
 </form>}</section>;
}
