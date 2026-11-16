# LAST DANCE FC — Push de asistencia

## Estado
Se reutilizan las suscripciones Web Push existentes, VAPID y el service worker raíz.
Las respuestas se registran en `private.availability` mediante `team_portal`.

## Reglas
- Avisos de convocatoria: partidos previstos dentro de los próximos siete días.
- Actividad: una notificación por ventana de 30 minutos, solo para jugadores sin respuesta y que la hayan activado; máximo una por jugador y partido cada 24 horas.
- Recordatorios: dentro de las ventanas 48–24 h y 24–0 h antes del inicio; nunca para quienes hayan respondido Voy, No voy o Duda.
- Descanso: entre 23:00 y 09:00 Europe/Madrid. Se difieren envíos no urgentes.
- Cambios: fecha, hora, pista y estado; según preferencia del usuario.

## Programación
- Vercel tiene `/api/attendance-push` como respaldo diario a las 07:00 UTC.
- El workflow `.github/workflows/attendance-push.yml` llama al endpoint cada 30 minutos.
- **Requiere configurar** el secreto de GitHub Actions `ATTENDANCE_CRON_SECRET` con el mismo valor que `CRON_SECRET` en Vercel (Settings → Secrets and variables → Actions → New repository secret).
- El endpoint rechaza llamadas sin `Authorization: Bearer <CRON_SECRET>`.
- Las programaciones de GitHub Actions pueden retrasarse; no se garantizan envíos al minuto exacto.

## Despliegue
1. Aplicar migraciones 202611160001, 202611160002, 202611160003 (ya aplicadas en Supabase LAST DANCE FC).
2. Verificar `VAPID_PRIVATE_KEY`, `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `SUPABASE_SERVICE_ROLE_KEY` y `CRON_SECRET` en Vercel.
3. Configurar secreto GitHub Actions indicado arriba.
4. Probar manualmente workflow_dispatch, comprobar respuesta HTTP 200 y cola.
5. En iPhone instalar la PWA en pantalla de inicio y aceptar notificaciones. En Android/desktop aceptar permisos en navegador compatible.
6. Probar un partido futuro con jugador pendiente, cambio de respuesta y cambio de horario.

## Seguridad
- Tablas privadas con RLS y sin permisos directos de usuario.
- `attendance_notices` exige cuenta vinculada y solo devuelve avisos del usuario autenticado.
- `attendance_dispatch` solo puede ejecutarse como service_role.
- No publicar claves VAPID privadas ni secretos en el repositorio.
