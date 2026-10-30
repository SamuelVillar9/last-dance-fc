import {test,expect} from '@playwright/test';

test('mobile vestuario opens login, registration and recovery without layout overflow',async({page})=>{
 await page.setViewportSize({width:375,height:812});
 await page.goto('/equipo');
 await expect(page.getByRole('button',{name:'Entrar',exact:true})).toBeVisible();
 await page.getByRole('button',{name:'Crear mi cuenta'}).click();
 await expect(page.getByRole('button',{name:'Crear cuenta',exact:true})).toBeVisible();
 await expect(page.getByLabel('Contraseña',{exact:true})).toHaveAttribute('minlength','12');
 await page.getByRole('button',{name:'Ya tengo cuenta'}).click();
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
