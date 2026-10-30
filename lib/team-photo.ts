export type TeamPhoto={image_path:string|null;caption:string;alt:string;width:number;height:number;updated_at:string};
export const DEFAULT_TEAM_PHOTO={width:1600,height:900,caption:'LAST DANCE FC · Temporada 2026/27',alt:'Foto de grupo de LAST DANCE FC en un pabellón de fútbol sala.'};
export function teamPhotoSource(photo:TeamPhoto|null,url:string|undefined){
 if(!photo?.image_path||!url||!/^official\/[0-9a-f-]+\.webp$/.test(photo.image_path))return null;
 return url.replace(/\/$/,'')+'/storage/v1/object/public/team-photos/'+photo.image_path;
}
