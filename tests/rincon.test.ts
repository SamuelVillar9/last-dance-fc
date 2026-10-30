import test from 'node:test';
import assert from 'node:assert/strict';
import {createECDH,createPublicKey,verify} from 'node:crypto';
import {encryptPush,vapidAuthorization} from '../lib/web-push';
import {mentionParts,retainedMentions,pushEndpointAllowed} from '../lib/mentions';
test('Web Push encryption matches RFC 8291 Appendix A ciphertext',()=>{
 const body=encryptPush({endpoint:'https://fcm.googleapis.com/test',p256dh:'BCVxsr7N_eNgVRqvHtD0zTZsEc6-VV-JvLexhqUzORcxaOzi6-AYWXvTBHm4bjyPjs7Vd8pZGH6SRpkNtoIAiw4',auth:'BTBZMqHH6r4Tts7J_aSIgg'},Buffer.from('V2hlbiBJIGdyb3cgdXAsIEkgd2FudCB0byBiZSBhIHdhdGVybWVsb24','base64url').toString(),Buffer.from('yfWPiYE-n46HLnH0KqZOF1fJJU3MYrct3AELtAQ-oRw','base64url'),Buffer.from('DGv6ra1nlYgDCS1FRnbzlw','base64url'));
 assert.equal(body.subarray(86).toString('base64url'),'8pfeW0KbunFT06SuDKoJH9Ql87S1QUrdirN6GcG7sFz1y1sqLgVi1VhjVkHsUoEsbI_0LpXMuGvnzQ');
 assert.equal(body.readUInt32BE(16),4096);
});
test('VAPID JWT has valid ES256 signature, origin audience and short expiry',()=>{
 const ec=createECDH('prime256v1');ec.generateKeys();const pub=ec.getPublicKey();const auth=vapidAuthorization('https://fcm.googleapis.com/fcm/send/example',pub.toString('base64url'),ec.getPrivateKey().toString('base64url'));
 const token=auth.slice(8).split(',')[0],parts=token.split('.');const claims=JSON.parse(Buffer.from(parts[1],'base64url').toString());
 assert.equal(claims.aud,'https://fcm.googleapis.com');assert.ok(claims.exp<Date.now()/1000+86400);
 const key=createPublicKey({key:{kty:'EC',crv:'P-256',x:pub.subarray(1,33).toString('base64url'),y:pub.subarray(33).toString('base64url')},format:'jwk'});
 assert.ok(verify('sha256',Buffer.from(parts[0]+'.'+parts[1]),{key,dsaEncoding:'ieee-p1363'},Buffer.from(parts[2],'base64url')));
});
test('mentions preserve text safely and bind selected players, including repeated mentions',()=>{
 const mentions=[{player_id:'one',label:'@Dani#1'},{player_id:'two',label:'@Dani#14'}];
 assert.deepEqual(mentionParts('Hola @Dani#14 😂 @Dani#1',mentions),[{text:'Hola '},{text:'@Dani#14',playerId:'two'},{text:' 😂 '},{text:'@Dani#1',playerId:'one'}]);
 assert.equal(retainedMentions('@Dani#1 @Dani#1',mentions).length,1);
 assert.deepEqual(mentionParts('<script>hola</script>'),[{text:'<script>hola</script>'}]);
});
test('push delivery rejects arbitrary hosts, credentials, ports and lookalike suffixes',()=>{
 for(const url of ['http://fcm.googleapis.com/x','https://127.0.0.1/x','https://fcm.googleapis.com.evil.test/x','https://evilpush.apple.com/x','https://user@fcm.googleapis.com/x','https://web.push.apple.com:444/x'])assert.equal(pushEndpointAllowed(url),false,url);
 for(const url of ['https://fcm.googleapis.com/fcm/send/x','https://web.push.apple.com/x','https://updates.push.services.mozilla.com/wpush/v2/x'])assert.equal(pushEndpointAllowed(url),true,url);
});
