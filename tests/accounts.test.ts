import test from 'node:test';
import assert from 'node:assert/strict';
import {createAccountHandler} from '../supabase/functions/create-player-account/handler';

const accountId='00000000-0000-0000-0000-000000000099';
const payload={email:'PLAYER@Test.invalid',password:'temporary-password-123',player_id:'player-1'};
const request=(body:unknown=payload,token='admin-token')=>new Request('https://function.test',{method:'POST',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},body:JSON.stringify(body)});
function fixture(options:{admin?:boolean;validToken?:boolean;active?:boolean;pending?:boolean;linked?:boolean;linkFails?:boolean;rollbackFails?:boolean;duplicate?:boolean}={}){
 const calls:{url:string;method:string;body:Record<string,unknown>;headers:Headers}[]=[];
 const fetcher:typeof fetch=async(input,init)=>{
  const url=String(input),method=init?.method??'GET',body=JSON.parse(String(init?.body??'{}'));
  calls.push({url,method,body,headers:new Headers(init?.headers)});
  if(url.endsWith('/auth/v1/user'))return Response.json({id:'admin-id'},{status:options.validToken===false?401:200});
  if(url.endsWith('/rpc/is_admin'))return Response.json(options.admin!==false);
  if(url.includes('/players?'))return Response.json(options.active===false?[]:[{id:'player-1'}]);
  if(url.endsWith('/rpc/team_portal')){
   if(body.p_action==='dashboard')return Response.json({admin:true,accounts:options.linked?[{player_id:'player-1'}]:[]},{status:options.pending?404:200});
   return Response.json({}, {status:options.linkFails?400:200});
  }
  if(url.endsWith('/auth/v1/admin/users'))return options.duplicate?Response.json({code:'email_exists'},{status:422}):Response.json({id:accountId});
  if(url.endsWith('/auth/v1/admin/users/'+accountId)&&method==='DELETE')return Response.json({}, {status:options.rollbackFails?500:200});
  throw Error('Unexpected request');
 };
 return {calls,handler:createAccountHandler({url:'https://project.test',publicKey:'public-test',secretKey:'server-only-test',fetcher})};
}
test('account creation requires an authenticated administrator before privileged calls',async()=>{
 const missing=fixture();assert.equal((await missing.handler(new Request('https://function.test',{method:'POST'}))).status,401);assert.equal(missing.calls.length,0);
 for(const options of [{validToken:false},{admin:false}]){
  const {handler,calls}=fixture(options);const r=await handler(request());
  assert.equal(r.status,options.validToken===false?401:403);
  assert.ok(calls.every(c=>!c.url.includes('/admin/users')));
 }
});
test('invalid password, inactive player, existing link and pending activation create no accounts',async()=>{
 for(const options of [{pending:true},{linked:true},{active:false}]){
  const {handler,calls}=fixture(options);assert.ok((await handler(request())).status>=400);
  assert.ok(calls.every(c=>!c.url.includes('/admin/users')));
 }
 const {handler,calls}=fixture();assert.equal((await handler(request({...payload,password:'short'}))).status,400);
 assert.ok(calls.every(c=>!c.url.includes('/admin/users')));
});
test('administrator creates an email-confirmed account and links its player without returning credentials',async()=>{
 const {handler,calls}=fixture();const response=await handler(request());
 assert.equal(response.status,201);assert.deepEqual(await response.json(),{success:true});
 const creation=calls.find(c=>c.url.endsWith('/admin/users'))!;
 assert.deepEqual(creation.body,{email:'player@test.invalid',password:payload.password,email_confirm:true});
 assert.equal(creation.headers.get('Authorization'),'Bearer server-only-test');
 const link=calls.find(c=>c.body.p_action==='link')!;
 assert.deepEqual(link.body.p_payload,{email:'player@test.invalid',player_id:'player-1'});
 assert.equal(link.headers.get('Authorization'),'Bearer admin-token');
 assert.ok(calls.every(c=>c.method!=='DELETE'));
});
test('failed linking removes only the account created by this request',async()=>{
 const {handler,calls}=fixture({linkFails:true});const response=await handler(request());
 assert.equal(response.status,502);assert.match((await response.json()).error,/anulado el alta/);
 assert.deepEqual(calls.filter(c=>c.method==='DELETE').map(c=>c.url),['https://project.test/auth/v1/admin/users/'+accountId]);
});
test('existing Auth accounts are never deleted or silently overwritten',async()=>{
 const {handler,calls}=fixture({duplicate:true});const response=await handler(request());
 assert.equal(response.status,409);assert.match((await response.json()).error,/Vincular cuenta existente/);
 assert.ok(calls.every(c=>c.method!=='DELETE'&&c.body.p_action!=='link'));
});
test('failed rollback provides a recovery path without exposing passwords or keys',async()=>{
 const {handler}=fixture({linkFails:true,rollbackFails:true});const response=await handler(request());const body=await response.text();
 assert.equal(response.status,502);assert.match(body,/Vincular cuenta existente/);
 assert.ok(!body.includes(payload.password)&&!body.includes('server-only-test'));
});
