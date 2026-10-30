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
