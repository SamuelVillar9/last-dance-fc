export type MatchComment={id:string;match_key:string;author_player_id:string;author_name:string;author_number:number;target_player_id:string;target_name:string;target_number:number;body:string;created_at:string;updated_at:string;can_edit:boolean;can_delete:boolean};
export type CommentsPage={items:MatchComment[];has_more:boolean;counts:Record<string,number>;own_comment:{id:string;body:string}|null;viewer:{player_id:string|null;admin:boolean;can_write:boolean}};
export function commentLength(text:string){return Array.from(text.trim()).length}
export function validComment(text:string){const length=commentLength(text);return length>=1&&length<=280}
export function mergeComments(current:MatchComment[],next:MatchComment[]){const seen=new Set(current.map(c=>c.id));return [...current,...next.filter(c=>!seen.has(c.id))]}
