# El rincón de rajar: menciones, reacciones y notificaciones

## Integración con el estado actual

La versión de partida es main d219e6fc (PR #14). Ya permite comentar a cualquier cuenta vinculada a un jugador activo, aunque no aparezca como participante. Se conserva esa regla: el destinatario de un comentario debe aparecer en el acta publicada de un partido finalizado. No se cambian las reglas de la votación MVP.

Los mismos comentarios se muestran en el partido y la ficha personal. Se conserva un comentario por autor, destinatario y partido, límite de 280 caracteres, edición, borrado, moderación y paginación.

## Comportamiento nuevo

- Escribir @ abre un selector con foto, nombre y dorsal. El texto `@Nombre#dorsal` queda vinculado al ID estable del jugador. Se valida la selección en servidor; texto libre sin seleccionar no genera avisos.
- Mencionar varias veces a una persona no duplica el aviso. Editar conserva el historial de destinatarios avisados. Quitar una mención cancela su aviso; volver a añadirla no vuelve a avisar. Automen­ciones y jugadores sin cuenta no generan notificaciones.
- Cualquier jugador con cuenta activa puede reaccionar, haya jugado o no. Una reacción por comentario: 😂, 🔥, 👏 o 🤦. Elegir otra sustituye; repetir la propia la elimina. Conteos y nombres son públicos como los comentarios. No genera push.
- Campana privada con contador, últimos 50 avisos y acción de marcar todos como leídos. Un enlace abre y resalta el comentario, también fuera de la primera página. Si la sesión ha caducado, el acceso pasa por el vestuario y conserva el destino.
- Tutorial modal tras iniciar sesión para usuarios que aún no lo hayan descartado ni tengan activo el dispositivo. «Ahora no» lo pospone durante la sesión; «No mostrar de nuevo» se conserva por cuenta. Activar correctamente también descarta el tutorial.
- Ajustes permanentes desde la campana y desde el vestuario. Permiso y suscripción por dispositivo; preferencia de menciones por usuario; prueba real limitada a una cada 30 segundos.
- En iOS/iPadOS se explica cómo instalar en pantalla de inicio y el requisito 16.4+. Permiso solicitado desde el toque del usuario. Bloqueos y navegadores incompatibles tienen instrucciones y conservan avisos internos.
- Cerrar sesión desde vestuario o administración desvincula ese dispositivo. La cola también comprueba pertenencia activa y preferencias antes de despachar.

## Arquitectura y privacidad

Tablas privadas con RLS y sin acceso directo para anon/authenticated. RPC públicas invocadoras delegan en funciones privadas con search_path fijo, validación de identidad y permisos. Endpoints y claves de suscripciones nunca se devuelven por RPC de usuario. La RPC de despacho es exclusiva de service_role.

El servidor guarda comentario, menciones y avisos en una transacción. Una cola por aviso y dispositivo mantiene leases, hasta cinco intentos y espera creciente; se procesa con `after()` tras publicar y en el cron diario de sincronización existente. Un fallo push no bloquea la publicación ni la sincronización de liga. Los reintentos diferidos se ejecutan en un siguiente despacho o el cron diario: no se promete reintento inmediato ni entrega garantizada.

El envío usa Web Push aes128gcm (RFC 8291) y VAPID ES256 (RFC 8292), con vector criptográfico oficial en tests. Los endpoints se limitan a servicios push conocidos y no se siguen redirecciones. La push muestra autor y destino al comentario, nunca su texto completo. El service worker existente se amplía sin sustituir su caché. La copia offline elimina la campana y el modal privados antes de guardarse.

## Publicación

1. Verificar checks de la PR y código completo.
2. Aplicar `20261030123937_rincon_interactions.sql` antes de publicar la interfaz; es aditiva y conserva las RPC originales.
3. Configurar en Vercel el par `NEXT_PUBLIC_VAPID_PUBLIC_KEY` y `VAPID_PRIVATE_KEY` y disponer de `SUPABASE_SERVICE_ROLE_KEY` exclusivamente en servidor. La URL y clave publicable son las existentes.
4. Publicar la versión y verificar `/api/rincon`: `configured: true`.
5. Probar con cuentas reales dos dispositivos autorizados y recepción en iPhone instalado, Android y escritorio.

La configuración de la clave privada de producción está pendiente de aprobación explícita: la revisión automática la bloqueó. La clave pública está preparada en el proyecto last-dance-fc de Vercel; no se ha activado envío real ni se ha aplicado la migración a producción en esta entrega. Ninguna clave privada se guarda en Git.

## Validación

TypeScript, build, tests unitarios y migraciones sobre PostgreSQL embebido. Integración con roles reales comprueba participación de ausentes, destinatario presente en acta, menciones válidas, no duplicación, aislamiento de avisos, descarte del tutorial, reacciones y restricciones de despacho. CI ejecuta además PostgreSQL 17 y navegador con cuentas simuladas. Una prueba simulada no acredita recepción real en iPhone; el botón de prueba permite completarla en el dispositivo del usuario.
