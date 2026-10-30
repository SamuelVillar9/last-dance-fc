export type TeamPhoto={image_path:string|null;caption:string;alt:string;width:number;height:number;updated_at:string};
export const DEFAULT_TEAM_PHOTO={src:'/team-photo-v1.webp',width:1672,height:941,caption:'LAST DANCE FC · Temporada 2026/27',alt:'Composición de diez jugadores de LAST DANCE FC en dos filas sobre una pista de fútbol sala.'};
export function teamPhotoSource(photo:TeamPhoto|null,url:string|undefined){
 if(!photo?.image_path||!url||!/^official\/[0-9a-f-]+\.webp$/.test(photo.image_path))return DEFAULT_TEAM_PHOTO.src;
 return url.replace(/\/$/,'')+'/storage/v1/object/public/team-photos/'+photo.image_path;
}
