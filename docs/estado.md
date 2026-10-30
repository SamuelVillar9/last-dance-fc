# Estado real de implementación

- Páginas públicas, diseño Pulso y componentes responsive construidos.
- Primera carga real de calendario, clasificación y juego limpio. Estadísticas individuales vacías hasta publicar actas propias.
- Migraciones y políticas aplicadas a un proyecto Supabase dedicado. Cuenta del propietario confirmada y habilitada como administradora; las credenciales no se almacenan en el repositorio.
- Importación de fuentes de Fase I implementada. Enlaces y grupos de Fase II pendientes de publicación por la organización.
- Panel: login, recuperación (requiere SMTP), actas, borradores y publicación, jugadores, bajas y foto comprimida.
- Pruebas automáticas de importación, validación y totales; TypeScript y compilación de producción.
- Revisión visual local bloqueada por la política del navegador de este entorno; no se afirma verificación en móvil real.
- Cuenta real activada. El envío de recuperación y el recorrido autenticado completo siguen pendientes de comprobación.

## Ajuste al iniciar desarrollo

Se importa juego limpio por equipos (puntos, amarillas y rojas). Solo se registran jugadores del LAST DANCE. La clasificación mantiene el orden oficial, respetando sus desempates.

## Publicación y permisos

- Commit local ee8c42d preparado. GitHub permite lectura, pero la integración rechaza escrituras con HTTP 403; pendiente habilitar permisos del repositorio y sincronizar el commit.
- Proyecto Vercel creado y despliegue directo de archivos solicitado, sin conexión Git automática todavía.
- Supabase: lectura pública de plantilla y liga comprobada; escritura anónima e importación sin credencial rechazadas; borradores no visibles de forma anónima.
- Ocho pruebas y TypeScript correctos. Compilación de producción correcta; auditoría de dependencias de producción sin vulnerabilidades conocidas en la ejecución.

## Verificación del despliegue

- Publicado en https://lastdancefc.vercel.app mediante despliegue directo.
- Páginas públicas, ficha de jugador, panel y manifiesto respondieron HTTP 200; la ruta de importación sin credencial respondió 401.
- Prueba transaccional de validación: goles nulos rechazados; borrador válido no crea una versión pública; transacción revertida sin datos de prueba persistentes.
- Permiso de escritura de GitHub resuelto y código publicado en main. Vercel ya puede acceder al repositorio; la conexión automática se comprueba con este commit.

## Avisos de la revisión de Supabase

El asesor señala que `import_league` usa SECURITY DEFINER y es invocable por roles anon/authenticated. Es intencional para el cron con secreto y el administrador, dado que no se expone ninguna clave de servicio: valida la identidad autorizada o un secreto aleatorio de 256 bits mediante su hash privado antes de escribir. Se ha probado el rechazo sin credencial, incluido secreto nulo. La función solo actualiza el snapshot de liga, no jugadores, actas o administradores; mantiene search_path vacío, validación y límite de frecuencia.

Referencias de los avisos: [ejecución anónima de funciones privilegiadas](https://supabase.com/docs/guides/database/database-linter?lint=0028_anon_security_definer_function_executable) y [ejecución por usuarios autenticados](https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable). No se describen estos avisos como una auditoría sin hallazgos ni como una garantía de seguridad absoluta.

- La sincronización autenticada desde el despliegue respondió HTTP 200 y actualizó correctamente la copia de liga.

## Activación del propietario

- Cuenta del propietario confirmada en Supabase y añadida a admins. No se almacena el correo ni contraseña en este repositorio.
- Permiso de escritura de GitHub validado mediante el conector tras actualizar su instalación.

## Comprobación de integración Git

30/10/2026: Vercel reconoce SamuelVillar9/last-dance-fc y su rama main. Esta actualización de documentación comprueba el disparo automático del despliegue por un commit real, sin modificar el comportamiento de la aplicación.

## Usuarios, actividad y cuenta atrás (30/10/2026)

- Nueva pestaña «Usuarios y actividad» dentro de Administración. Incluye todas las cuentas de Auth, con o sin jugador vinculado, rol, correo, último inicio de sesión y última actividad; búsqueda, filtros y resumen de uso hoy y en siete días.
- La consulta comprueba en PostgreSQL la pertenencia a `public.admins`. Jugadores y visitantes no pueden consultar el listado ni la tabla privada. El registro utiliza exclusivamente la identidad autenticada y la hora del servidor, con un máximo de una escritura cada cinco minutos por cuenta.
- Un único componente en el layout registra apertura, navegación y uso visible con sesión guardada. No registra IP, historial de páginas ni duración de sesiones. La actividad empieza con esta versión; no se inventan datos anteriores ni presencia «en línea».
- La tarjeta destacada del próximo partido muestra días, horas, minutos y segundos. Interpreta el horario en Europe/Madrid, contempla horario de verano y se recalcula al recuperar la pestaña. Al llegar el inicio muestra «¡DÍA DE PARTIDO!». Sin fecha/hora o con aplazamiento muestra el aviso correspondiente.
- La selección conserva el encuentro durante su día, y al día siguiente prioriza próximos partidos fechados para evitar que un resultado pendiente bloquee el calendario.
- La tabla privada usa RLS sin políticas y sin permisos directos deliberadamente: solo las funciones privadas controladas acceden a ella. El aviso informativo del asesor para `private.user_activity` corresponde a esta denegación por defecto: https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy.
- La migración está activada en Supabase. Comprobación transaccional en producción: el administrador obtiene las once cuentas, jugador y anónimo reciben rechazo; la escritura de prueba se revierte.
- Validación local: veinte pruebas unitarias, TypeScript y compilación; pruebas de permisos, limitación de frecuencia y vinculación sobre PostgreSQL aislado mediante PGlite. CI ejecuta además el SQL de integración sobre PostgreSQL 17.

- Navegador Chromium con cuentas simuladas: comprobados el panel y filtros en móvil, el rechazo visual del jugador, el registro con sesión guardada y el cambio de cuenta atrás al mensaje de partido. Revisión visual local de ambas pantallas realizada.
