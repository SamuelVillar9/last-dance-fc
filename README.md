# LAST DANCE FC

Web de fútbol sala · temporada 2026/27. Diseño Pulso, temas claro/oscuro y navegación móvil. Next.js 16, React, TypeScript y Supabase PostgreSQL/Auth/Storage. Fuentes Barlow y Barlow Condensed autoalojadas mediante Fontsource (OFL); iconos Lucide (ISC). Identidad del club usada por indicación del propietario.

## Ejecutar y verificar

```sh
npm ci
cp .env.example .env.local
# Completar URL y clave publicable de Supabase.
npm run dev
npm test
npm run typecheck
npm run build
```

Sin variables, las páginas públicas usan una copia fechada de los datos oficiales y el panel queda deshabilitado. Nunca publicar `.env.local`, contraseñas o claves de servicio.

## Alcance

Inicio, plantilla, calendario por jornadas, clasificación general y juego limpio por equipos, estadísticas individuales del LAST DANCE y detalle de partido/jugador. Rivales exclusivamente por nombre. Actas en borrador y publicadas, altas/bajas conservando historial y fotos optimizadas desde móvil. Estadísticas calculadas solo con actas publicadas. Añadir a pantalla de inicio no implica modo sin conexión.

## Configuración de datos y acceso

Aplicar migraciones de `supabase/migrations` en orden sobre un proyecto dedicado. Todas las tablas expuestas tienen RLS. Solo identidades registradas en `admins` pueden modificar datos o leer borradores.

### Activar la cuenta del propietario

1. En Supabase → Authentication → Users, crear la cuenta del propietario con su correo y contraseña. El propietario introduce su contraseña directamente en Supabase.
2. Desde una sesión administrativa, conceder acceso:

```sql
insert into public.admins(user_id)
select id from auth.users where email = 'CORREO_DEL_PROPIETARIO';
```

3. Deshabilitar nuevos registros en Authentication → Sign In / Providers → Allow new users to sign up. La aplicación no tiene registro y ninguna cuenta sin `admins` tiene permisos de gestión incluso antes de deshabilitarlo.
4. Configurar Site URL y Redirect URLs de recuperación (`/admin`). Configurar SMTP propio y probar la recuperación: el SMTP predeterminado de Supabase es restringido. No compartir contraseñas en chat ni en el repositorio.
5. Verificar login, actas, fotos y recuperación con la cuenta real. No se crean credenciales de prueba en producción automáticamente.

### Sincronización

Fuentes públicas de San Gabriel: `Jornadas/Fase I/Jornadas.htm`, `clasificacion.html` y `juego limpio.html`. Un único lector normaliza tablas, horarios, resultados, descansos y aplazamientos. Se conserva el orden oficial de clasificación, incluidos desempates. No se atribuyen tarjetas o goles a jugadores rivales.

`GET /api/sync` requiere el secreto de cron en Authorization Bearer. `POST /api/sync` requiere la sesión del administrador. Ambos guardan una copia completa validada en transacción. Separación mínima entre importaciones correctas: 60 segundos. Los fallos conservan la última copia y las actas propias nunca se sustituyen por la importación.

Configurar `CRON_SECRET` aleatorio de al menos 32 caracteres en Vercel y su SHA-256 en `private.sync_config`. Nunca copiar el secreto a migraciones o GitHub. Rotar ambos valores conjuntamente. Cron diario a partir de 06:00 UTC; Hobby no garantiza el minuto exacto.

El lector implementa Fase I. El modelo y los selectores admiten fases/grupos, pero los enlaces de Fase II deben incorporarse cuando la organización los publique. No fabricar jornadas o grupos futuros.

## Despliegue

Repositorio conectado a Vercel, preset Next.js y Node 24. Variables:

| Variable | Uso |
|---|---|
| NEXT_PUBLIC_SUPABASE_URL | URL pública de la API |
| NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY | Clave publicable |
| CRON_SECRET | Solo servidor de producción; nunca en previews no revisadas |

Mantener planes gratuitos. Hobby es para uso personal/no comercial. Las cuotas y pausas de Supabase Free siguen aplicando; no hay garantía de disponibilidad permanente. Sin exportaciones en el panel; respaldo y recuperación operativos se gestionan fuera de la interfaz.

No incluye notificaciones, noticias, crónicas, sanciones, cuentas de jugadores, modo offline ni fichas de rivales.

Ver `docs/planificacion.md` y `docs/estado.md`.
