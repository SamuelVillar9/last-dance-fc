type Settings = { url: string; publicKey: string; secretKey: string };
type Dependencies = Settings & { fetcher?: typeof fetch };

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Cache-Control': 'no-store',
};

export function createAccountHandler({url, publicKey, secretKey, fetcher = fetch}: Dependencies) {
  return async function handle(request: Request): Promise<Response> {
    const reply = (status: number, body: Record<string, unknown>) =>
      Response.json(body, {status, headers: cors});
    if (request.method === 'OPTIONS') return new Response(null, {status: 204, headers: cors});
    if (request.method !== 'POST') return reply(405, {error: 'Método no permitido.'});
    const authorization = request.headers.get('Authorization') ?? '';
    if (!/^Bearer \S+$/i.test(authorization)) return reply(401, {error: 'Inicia sesión como administrador.'});
    if (!url || !publicKey || !secretKey) return reply(503, {error: 'El alta de cuentas no está configurada.'});
    const userHeaders = {apikey: publicKey, Authorization: authorization, 'Content-Type': 'application/json'};
    const adminHeaders = {apikey: secretKey, Authorization: `Bearer ${secretKey}`, 'Content-Type': 'application/json'};
    try {
      // Verify the token with Auth. User-supplied metadata never grants admin access.
      const identity = await fetcher(`${url}/auth/v1/user`, {headers: userHeaders});
      if (!identity.ok) return reply(401, {error: 'Tu sesión ha caducado. Vuelve a entrar.'});
      const user = await identity.json();
      if (!user.id) return reply(401, {error: 'Sesión no válida.'});
      const permission = await fetcher(`${url}/rest/v1/rpc/is_admin`, {method: 'POST', headers: userHeaders, body: '{}'});
      if (!permission.ok || await permission.json() !== true) return reply(403, {error: 'Solo el administrador puede crear cuentas.'});

      if (Number(request.headers.get('content-length') ?? 0) > 4096) return reply(413, {error: 'Solicitud demasiado grande.'});
      const raw = await request.text();
      if (raw.length > 4096) return reply(413, {error: 'Solicitud demasiado grande.'});
      let body: Record<string, unknown>;
      try { body = JSON.parse(raw); } catch { return reply(400, {error: 'Datos no válidos.'}); }
      if (!body || typeof body !== 'object') return reply(400, {error: 'Datos no válidos.'});
      const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
      const password = typeof body.password === 'string' ? body.password : '';
      const playerId = typeof body.player_id === 'string' ? body.player_id : '';
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254 || password.length < 12 || password.length > 128 || !playerId || playerId.length > 100)
        return reply(400, {error: 'Selecciona un jugador e indica un correo válido y una contraseña de entre 12 y 128 caracteres.'});

      // Check activation and existing links BEFORE creating anything in Auth.
      const dashboard = await fetcher(`${url}/rest/v1/rpc/team_portal`, {method: 'POST', headers: userHeaders, body: JSON.stringify({p_action: 'dashboard'})});
      if (!dashboard.ok) return reply(503, {error: 'Primero hay que activar el vestuario en la base de datos.'});
      const portal = await dashboard.json();
      if (portal.admin !== true) return reply(403, {error: 'Acceso denegado.'});
      if (portal.accounts?.some((account: {player_id: string}) => account.player_id === playerId))
        return reply(409, {error: 'Este jugador ya tiene una cuenta vinculada.'});
      const playerResponse = await fetcher(`${url}/rest/v1/players?id=eq.${encodeURIComponent(playerId)}&active=eq.true&select=id`, {headers: userHeaders});
      if (!playerResponse.ok) return reply(503, {error: 'No se pudo comprobar la ficha del jugador.'});
      const players = await playerResponse.json();
      if (!Array.isArray(players) || !players.some(player => player.id === playerId)) return reply(400, {error: 'La ficha debe corresponder a un jugador activo.'});

      // Admin API works with public signups disabled and sends no invitation email.
      const created = await fetcher(`${url}/auth/v1/admin/users`, {method: 'POST', headers: adminHeaders, body: JSON.stringify({email, password, email_confirm: true})});
      if (!created.ok) {
        const failure = await created.json().catch(() => ({}));
        return reply(created.status === 422 ? 409 : 400, {error: failure.code === 'email_exists' || failure.code === 'email_address_not_authorized' || /already.*registered/i.test(failure.msg ?? failure.message ?? '')
          ? 'Ese correo ya tiene una cuenta. Utiliza Vincular cuenta existente.' : 'No se pudo crear la cuenta. Revisa el correo y la contraseña.'});
      }
      const account = await created.json();
      const accountId = account.id ?? account.user?.id;
      if (typeof accountId !== 'string' || !/^[0-9a-f-]{36}$/i.test(accountId))
        return reply(502, {error: 'Auth no ha devuelto un identificador válido. Revisa las cuentas antes de repetir el alta.'});
      let linked = false;
      try {
        const link = await fetcher(`${url}/rest/v1/rpc/team_portal`, {method: 'POST', headers: userHeaders, body: JSON.stringify({p_action: 'link', p_payload: {email, player_id: playerId}})});
        linked = link.ok;
      } catch { /* Roll back this newly-created account only. Never delete existing users. */ }
      if (!linked) {
        const removed = await fetcher(`${url}/auth/v1/admin/users/${accountId}`, {method: 'DELETE', headers: adminHeaders}).catch(() => null);
        return reply(502, {error: removed?.ok
          ? 'No se pudo vincular la ficha y se ha anulado el alta. Puedes intentarlo de nuevo.'
          : 'La cuenta se creó pero falta vincularla. Utiliza Vincular cuenta existente con este correo.'});
      }
      return reply(201, {success: true});
    } catch {
      return reply(503, {error: 'No se pudo completar el alta. Revisa la conexión y las cuentas existentes antes de repetirla.'});
    }
  };
}
