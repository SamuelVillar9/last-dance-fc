// RFC 8291 aes128gcm and RFC 8292 VAPID. Node primitives; no browser secrets.
import {createECDH,createHmac,createCipheriv,createPrivateKey,randomBytes,sign} from 'node:crypto';
import {pushEndpointAllowed} from './mentions';
export type WebSubscription={endpoint:string;p256dh:string;auth:string};
const hmac=(key:Buffer,data:Buffer)=>createHmac('sha256',key).update(data).digest();
const expand=(key:Buffer,info:Buffer,length:number)=>hmac(key,Buffer.concat([info,Buffer.from([1])])).subarray(0,length);
export function encryptPush(subscription:WebSubscription,payload:string,privateKey?:Buffer,salt=randomBytes(16)){
 const receiver=Buffer.from(subscription.p256dh,'base64url'),auth=Buffer.from(subscription.auth,'base64url');
 if(receiver.length!==65||receiver[0]!==4||auth.length!==16||Buffer.byteLength(payload)>3000)throw Error('Invalid push parameters');
 const ecdh=createECDH('prime256v1');if(privateKey)ecdh.setPrivateKey(privateKey);else ecdh.generateKeys();const sender=ecdh.getPublicKey();
 const prk=hmac(auth,ecdh.computeSecret(receiver));
 const ikm=expand(prk,Buffer.concat([Buffer.from('WebPush: info\0'),receiver,sender]),32);
 const secret=hmac(salt,ikm),key=expand(secret,Buffer.from('Content-Encoding: aes128gcm\0'),16),nonce=expand(secret,Buffer.from('Content-Encoding: nonce\0'),12);
 const cipher=createCipheriv('aes-128-gcm',key,nonce);const ciphertext=Buffer.concat([cipher.update(Buffer.concat([Buffer.from(payload),Buffer.from([2])])),cipher.final(),cipher.getAuthTag()]);
 const header=Buffer.alloc(21);salt.copy(header);header.writeUInt32BE(4096,16);header[20]=65;
 return Buffer.concat([header,sender,ciphertext]);
}
export function vapidAuthorization(endpoint:string,publicKey:string,privateKey:string){
 const pub=Buffer.from(publicKey,'base64url');if(pub.length!==65)throw Error('Invalid VAPID key');
 const key=createPrivateKey({key:{kty:'EC',crv:'P-256',x:pub.subarray(1,33).toString('base64url'),y:pub.subarray(33).toString('base64url'),d:privateKey},format:'jwk'});
 const header=Buffer.from(JSON.stringify({typ:'JWT',alg:'ES256'})).toString('base64url');
 const body=Buffer.from(JSON.stringify({aud:new URL(endpoint).origin,exp:Math.floor(Date.now()/1000)+3600,sub:'https://lastdancefc.vercel.app'})).toString('base64url');
 const token=header+'.'+body;return 'vapid t='+token+'.'+sign('sha256',Buffer.from(token),{key,dsaEncoding:'ieee-p1363'}).toString('base64url')+', k='+publicKey;
}
export async function sendPush(subscription:WebSubscription,payload:unknown){
 if(!pushEndpointAllowed(subscription.endpoint))throw Error('Invalid push endpoint');
 const publicKey=process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,privateKey=process.env.VAPID_PRIVATE_KEY;
 if(!publicKey||!privateKey)throw Error('Push not configured');
 const body=encryptPush(subscription,JSON.stringify(payload));
 const response=await fetch(subscription.endpoint,{method:'POST',redirect:'error',signal:AbortSignal.timeout(8000),headers:{Authorization:vapidAuthorization(subscription.endpoint,publicKey,privateKey),'Content-Type':'application/octet-stream','Content-Encoding':'aes128gcm',TTL:'3600',Urgency:'normal'},body:new Uint8Array(body)});
 return response.status;
}
