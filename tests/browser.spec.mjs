import {test,expect} from '@playwright/test';

test('mobile vestuario only allows login and recovery, with no public registration',async({page})=>{
 await page.setViewportSize({width:375,height:812});
 await page.goto('/equipo');
 await expect(page.getByRole('button',{name:'Entrar',exact:true})).toBeVisible();
 await expect(page.getByRole('button',{name:/Crear.*cuenta/})).toHaveCount(0);
 await expect(page.getByText('No hay registro público.',{exact:false})).toBeVisible();
 await expect(page.getByRole('button',{name:'Recuperar contraseña'})).toBeDisabled();
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);
});

test('linked player can save availability and copy the convocatoria; no admin accounts exposed',async({page})=>{
 let availability=[];
 let payload=null;
 const user={id:'00000000-0000-0000-0000-000000000002',aud:'authenticated',role:'authenticated',email:'player@test.invalid',app_metadata:{provider:'email'},user_metadata:{},created_at:'2026-01-01T00:00:00Z'};
 const token='eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.'+Buffer.from(JSON.stringify({sub:user.id,exp:Math.floor(Date.now()/1000)+3600})).toString('base64url')+'.fake-test-signature';
 await page.route('http://127.0.0.1:55555/**',async route=>{
  if(route.request().method()==='OPTIONS'){await route.fulfill({status:204,headers:{'access-control-allow-origin':'*','access-control-allow-methods':'*','access-control-allow-headers':'*'}});return;}
  const url=route.request().url();
  let body={};
  if(url.includes('/auth/v1/token'))body={access_token:token,refresh_token:'test-refresh',token_type:'bearer',expires_in:3600,user};
  else if(url.includes('/auth/v1/user'))body=user;
  else if(url.includes('/rpc/team_portal')){
   const request=route.request().postDataJSON();
   if(request.p_action==='availability'){
    payload=request.p_payload;
    availability=[{match_key:request.p_payload.match_key,player_id:'player-1',status:request.p_payload.status}];
   }
   body={pending:false,admin:false,playerId:'player-1',availability,rounds:[],accounts:[]};
  }else body=[];
  await route.fulfill({status:200,contentType:'application/json',headers:{'access-control-allow-origin':'*'},body:JSON.stringify(body)});
 });
 await page.goto('/equipo');
 await page.getByLabel('Correo electrónico',{exact:true}).fill('player@test.invalid');
 await page.getByLabel('Contraseña',{exact:true}).fill('test-password-123');
 await page.getByRole('button',{name:'Entrar',exact:true}).click();
 await expect(page.getByText('Hola, Dani · #1')).toBeVisible();
 await expect(page.getByRole('heading',{name:'CUENTAS DE JUGADORES'})).toHaveCount(0);
 const yes=page.getByRole('button',{name:'Voy',exact:true});
 await yes.click();
 await expect(yes).toHaveAttribute('aria-pressed','true');
 expect(payload).toMatchObject({status:'yes'});
 expect(payload).not.toHaveProperty('player_id');
 await page.getByRole('button',{name:'Duda',exact:true}).click();
 await expect(page.getByRole('button',{name:'Duda',exact:true})).toHaveAttribute('aria-pressed','true');
 await expect(page.getByRole('button',{name:'Copiar lista para WhatsApp'})).toBeVisible();
});

test('only the administrator sees account creation and creates and links in one step',async({page})=>{
 const user={id:'00000000-0000-0000-0000-000000000001',aud:'authenticated',role:'authenticated',email:'admin@test.invalid',app_metadata:{provider:'email'},user_metadata:{},created_at:'2026-01-01T00:00:00Z'};
 const token='eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.'+Buffer.from(JSON.stringify({sub:user.id,exp:Math.floor(Date.now()/1000)+3600})).toString('base64url')+'.fake-test-signature';
 let created=null,accounts=[];
 await page.route('http://127.0.0.1:55555/**',async route=>{
  if(route.request().method()==='OPTIONS'){await route.fulfill({status:204,headers:{'access-control-allow-origin':'*','access-control-allow-methods':'*','access-control-allow-headers':'*'}});return;}
  const url=route.request().url();let body={};
  if(url.includes('/auth/v1/token'))body={access_token:token,refresh_token:'test-refresh',token_type:'bearer',expires_in:3600,user};
  else if(url.includes('/auth/v1/user'))body=user;
  else if(url.includes('/rpc/team_portal'))body={pending:false,admin:true,playerId:null,availability:[],rounds:[],accounts};
  else if(url.includes('/functions/v1/create-player-account')){
   created=route.request().postDataJSON();
   expect(route.request().headers().authorization).toBe('Bearer '+token);
   accounts=[{player_id:created.player_id,email:created.email}];body={success:true};
  }
  await route.fulfill({status:200,contentType:'application/json',headers:{'access-control-allow-origin':'*'},body:JSON.stringify(body)});
 });
 await page.goto('/equipo');
 await page.getByLabel('Correo electrónico',{exact:true}).fill('admin@test.invalid');
 await page.getByLabel('Contraseña',{exact:true}).fill('test-password-123');
 await page.getByRole('button',{name:'Entrar',exact:true}).click();
 await expect(page.getByRole('heading',{name:'CUENTAS DE JUGADORES'})).toBeVisible();
 await page.getByLabel('Jugador',{exact:true}).selectOption('player-1');
 await page.getByLabel('Correo de la cuenta',{exact:true}).fill('dani@test.invalid');
 await page.getByLabel('Contraseña temporal',{exact:true}).fill('temporary-password-123');
 await page.getByRole('button',{name:'Crear y vincular cuenta',exact:true}).click();
 await expect(page.getByText('Cuenta creada y vinculada.',{exact:false})).toBeVisible();
 expect(created).toEqual({player_id:'player-1',email:'dani@test.invalid',password:'temporary-password-123'});
 await expect(page.getByLabel('Contraseña temporal',{exact:true})).toHaveValue('');
 await expect(page.getByRole('cell',{name:'dani@test.invalid',exact:true})).toBeVisible();
});

async function mockActivityAccount(page,admin){
 const user={id:'00000000-0000-0000-0000-00000000000'+(admin?'1':'2'),aud:'authenticated',role:'authenticated',email:admin?'admin@test.invalid':'player@test.invalid',app_metadata:{provider:'email'},user_metadata:{},created_at:'2026-01-01T00:00:00Z'};
 const token='eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.'+Buffer.from(JSON.stringify({sub:user.id,exp:Math.floor(Date.now()/1000)+3600})).toString('base64url')+'.fake-test-signature';
 const calls={records:[],lists:0};
 const now=new Date().toISOString();
 await page.route('http://127.0.0.1:55555/**',async route=>{
  const request=route.request();
  if(request.method()==='OPTIONS'){await route.fulfill({status:204,headers:{'access-control-allow-origin':'*','access-control-allow-methods':'*','access-control-allow-headers':'*'}});return;}
  const url=request.url();let body=[];
  if(url.includes('/auth/v1/token'))body={access_token:token,refresh_token:'test-refresh',token_type:'bearer',expires_in:3600,user};
  else if(url.includes('/auth/v1/user'))body=user;
  else if(url.includes('/rest/v1/admins'))body=admin?[{user_id:user.id}]:null;
  else if(url.includes('/rpc/record_activity')){calls.records.push(request.postDataJSON());body=null;}
  else if(url.includes('/rpc/admin_user_activity')){
   calls.lists++;
   body=[{id:user.id,email:user.email,name:'Samu',number:7,player_id:'player-7',is_admin:true,created_at:now,last_sign_in_at:now,last_seen_at:now},{id:'unlinked',email:'pendiente@test.invalid',name:null,number:null,player_id:null,is_admin:false,created_at:now,last_sign_in_at:null,last_seen_at:null}];
  }
  await route.fulfill({status:200,contentType:'application/json',headers:{'access-control-allow-origin':'*'},body:JSON.stringify(body)});
 });
 return calls;
}
async function adminLogin(page,email){
 await page.goto('/admin');
 await page.getByLabel('Correo electrónico',{exact:true}).fill(email);
 await page.getByLabel('Contraseña',{exact:true}).fill('test-password-123');
 await page.getByRole('button',{name:'Iniciar sesión',exact:true}).click();
}
test('activity panel is restricted to the administrator, with unlinked accounts and filters on mobile',async({page})=>{
 await page.setViewportSize({width:375,height:812});
 const calls=await mockActivityAccount(page,true);
 await adminLogin(page,'admin@test.invalid');
 await page.getByRole('button',{name:'Usuarios y actividad',exact:true}).click();
 await expect(page.getByRole('heading',{name:'USUARIOS Y ACTIVIDAD'})).toBeVisible();
 await expect(page.getByRole('cell',{name:'pendiente@test.invalid',exact:true})).toBeVisible();
 await page.getByRole('combobox',{name:'Actividad',exact:true}).selectOption('never');
 await expect(page.getByRole('cell',{name:'Nunca ha iniciado sesión',exact:true})).toBeVisible();
 await expect(page.getByRole('cell',{name:'Administrador',exact:true})).toHaveCount(0);
 await page.getByRole('combobox',{name:'Actividad',exact:true}).selectOption('all');
 await page.getByLabel('Buscar usuario',{exact:true}).fill('Samu');
 await expect(page.getByRole('cell',{name:'Administrador',exact:true})).toBeVisible();
 await expect(page.getByRole('cell',{name:'pendiente@test.invalid',exact:true})).toHaveCount(0);
 await page.screenshot({path:'/tmp/lastdance-admin-mobile.png',fullPage:true});
 expect(calls.lists).toBe(1);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);
});
test('player cannot see the activity panel, and session activity is recorded without caller-supplied identity',async({page})=>{
 const calls=await mockActivityAccount(page,false);
 await adminLogin(page,'player@test.invalid');
 await expect(page.getByRole('heading',{name:'ACCESO PENDIENTE'})).toBeVisible();
 await expect(page.getByRole('button',{name:'Usuarios y actividad',exact:true})).toHaveCount(0);
 await expect.poll(()=>calls.records.length).toBeGreaterThan(0);
 expect(calls.records[0]).toEqual({});
 expect(calls.lists).toBe(0);
 await page.goto('/');
 await expect.poll(()=>calls.records.length).toBeGreaterThan(1);
 expect(calls.lists).toBe(0);
});
test('home countdown updates to the requested match-day message at Madrid kickoff',async({page})=>{
 await page.setViewportSize({width:375,height:812});
 await page.clock.setFixedTime(new Date('2026-11-08T13:59:58Z'));
 await page.goto('/');
 await expect(page.getByRole('timer',{name:'Tiempo hasta el partido'})).toBeVisible();
 await page.screenshot({path:'/tmp/lastdance-countdown-mobile.png',fullPage:true});
 await page.clock.setFixedTime(new Date('2026-11-08T14:00:01Z'));
 await expect(page.getByText('¡DÍA DE PARTIDO!',{exact:true})).toBeVisible();
 await expect(page.getByRole('timer')).toHaveCount(0);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);
});

test('match card exports a local PNG in the active theme without writes',async({page})=>{
 await page.setViewportSize({width:390,height:844});
 await page.goto('/');
 await page.locator('.match-card.featured').first().click();
 let writes=0;
 page.on('request',request=>{if(['POST','PUT','PATCH','DELETE'].includes(request.method())&&!request.url().includes('__nextjs'))writes++});
 for(const theme of ['light','dark']){
  await page.evaluate(value=>{document.documentElement.dataset.theme=value},theme);
  await page.getByRole('button',{name:/Generar imagen|Volver a generar/}).click();
  await expect(page.getByRole('button',{name:'Volver a generar'})).toBeEnabled();
  const preview=page.locator('.poster-preview img');
  await expect(preview).toBeVisible();
  const result=await preview.evaluate(async image=>{
   const bitmap=await createImageBitmap(await(await fetch(image.src)).blob());
   const canvas=document.createElement('canvas');canvas.width=1080;canvas.height=1350;
   const ctx=canvas.getContext('2d');ctx.drawImage(bitmap,0,0);
   return {width:bitmap.width,height:bitmap.height,pixel:Array.from(ctx.getImageData(1070,500,1,1).data)};
  });
  expect(result.width).toBe(1080);expect(result.height).toBe(1350);
  expect(result.pixel.slice(0,3)).toEqual(theme==='light'?[255,255,255]:[9,9,9]);
  await expect(page.getByRole('link',{name:'Descargar PNG'})).toHaveAttribute('href',/^blob:/);
 }
 expect(writes).toBe(0);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});

test('saved next match reopens silently without a network and refreshes after reconnection',async({page,context})=>{
 const {createServer}=await import('node:http');
 const league={phase:'Fase I',group:'A',updatedAt:'2026-10-30T10:00:00Z',standings:[],fairPlay:[],matches:[{key:'cache-test',round:3,phase:'Fase I',group:'A',home:'LAST DANCE',away:'RIVAL CACHE',date:'2099-11-08',time:'12:30',venue:'Pista de prueba',status:'scheduled',homeScore:null,awayScore:null}]};
 let failing=false;
 const server=createServer((request,response)=>{
  response.setHeader('Content-Type','application/json');
  if(failing){response.statusCode=503;response.end('{"message":"temporary failure"}');return}
  response.end(JSON.stringify(request.url.startsWith('/rest/v1/league_snapshots')?[{data:league}]:[]));
 });
 await new Promise(resolve=>server.listen(55555,'127.0.0.1',resolve));
 let restored;
 async function hasSavedTime(tab,time){return tab.evaluate(async time=>{
  for(const name of await caches.keys()){
   if(!name.startsWith('ld-match-v1-'))continue;
   const cache=await caches.open(name);const response=await cache.match('/__ld_saved_match__');
   if(response&&(await response.text()).includes(time))return true;
  }
  return false;
 },time)}
 try{
  await page.goto('/');await expect(page.locator('[data-match-summary]')).toContainText('12:30');
  await expect.poll(()=>hasSavedTime(page,'12:30'),{timeout:20000}).toBe(true);
  // Older Chromium keeps service-worker fetches online under context.setOffline.
  // Make the data origin unavailable too, so both browser generations test a real failed refresh.
  failing=true;await context.setOffline(true);await page.close();restored=await context.newPage();await restored.setViewportSize({width:390,height:844});
  await restored.goto('http://127.0.0.1:3000/');await expect(restored.locator('body')).toHaveAttribute('data-match-document','1');
  await expect(restored.locator('[data-match-summary]')).toContainText('12:30');
  await expect(restored.locator('body')).not.toContainText(/sin conexi[oó]n|offline|copia guardada/i);
  expect(await restored.locator('.header').evaluate(element=>getComputedStyle(element).display)).toBe('flex');
  await restored.evaluate(()=>document.fonts.ready);expect(await restored.evaluate(()=>document.fonts.check('600 24px Barlow'))).toBe(true);
  let requests=0;const record=()=>requests++;restored.on('request',record);
  const counter=await restored.locator('.countdown-units').innerText();await restored.waitForTimeout(1200);
  expect(await restored.locator('.countdown-units').innerText()).not.toBe(counter);expect(requests).toBe(0);restored.off('request',record);
  await restored.getByRole('button',{name:/Cambiar tema/}).click();expect(await restored.evaluate(()=>document.documentElement.dataset.theme)).toBe('dark');
  league.matches[0].time='16:45';league.updatedAt='2026-10-30T11:00:00Z';failing=false;await context.setOffline(false);
  await expect(restored.locator('[data-match-summary]')).toContainText('16:45',{timeout:20000});
  await expect.poll(()=>hasSavedTime(restored,'16:45'),{timeout:20000}).toBe(true);
  failing=true;await restored.reload();await expect(restored.locator('body')).toHaveAttribute('data-match-document','1');await expect(restored.locator('[data-match-summary]')).toContainText('16:45');
  const savedUrls=await restored.evaluate(async()=>{const urls=[];for(const name of await caches.keys()){const cache=await caches.open(name);for(const request of await cache.keys())urls.push(request.url)}return urls});
  expect(savedUrls.some(url=>/\/admin|\/equipo|auth|rest\/v1/.test(url))).toBe(false);
 }finally{if(restored)await restored.close();await context.setOffline(false);server.closeAllConnections();await new Promise(resolve=>server.close(resolve))}
});
