export type Mention={player_id:string;label:string};
export const mentionLabel=(p:{name:string;number:number})=>'@'+p.name+'#'+p.number;
export const REACTIONS=[{emoji:'😂',label:'Me parto'},{emoji:'🔥',label:'Tremendo'},{emoji:'👏',label:'Bien dicho'},{emoji:'🤦',label:'Vaya tela'}] as const;
export function retainedMentions(body:string,mentions:Mention[]){return mentions.filter((m,i)=>body.includes(m.label)&&mentions.findIndex(n=>n.player_id===m.player_id)===i)}
export function mentionParts(body:string,mentions:Mention[]=[]){
 const labels=[...mentions].filter(m=>m.label).sort((a,b)=>b.label.length-a.label.length);const parts:{text:string;playerId?:string}[]=[];
 let start=0;while(start<body.length){let at=body.length,found:Mention|undefined;for(const m of labels){const i=body.indexOf(m.label,start);if(i>=0&&i<at){at=i;found=m}}if(at>start)parts.push({text:body.slice(start,at)});if(!found)break;parts.push({text:found.label,playerId:found.player_id});start=at+found.label.length}return parts;
}
export function pushEndpointAllowed(value:string){try{const u=new URL(value);return u.protocol==='https:'&&!u.username&&!u.password&&!u.port&&u.pathname!=='/'&&(u.hostname==='fcm.googleapis.com'||u.hostname==='updates.push.services.mozilla.com'||u.hostname.endsWith('.push.services.mozilla.com')||u.hostname==='web.push.apple.com'||u.hostname.endsWith('.push.apple.com')||u.hostname==='notify.windows.com'||u.hostname.endsWith('.notify.windows.com'))}catch{return false}}
