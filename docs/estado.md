# Estado real de implementación

- Páginas públicas, diseño Pulso y componentes responsive construidos.
- Primera carga real de calendario, clasificación y juego limpio. Estadísticas individuales vacías hasta publicar actas propias.
- Migraciones y políticas aplicadas a un proyecto Supabase dedicado. Cuenta administradora pendiente de activación por el propietario; no se ha inventado su correo o contraseña.
- Importación de fuentes de Fase I implementada. Enlaces y grupos de Fase II pendientes de publicación por la organización.
- Panel: login, recuperación (requiere SMTP), actas, borradores y publicación, jugadores, bajas y foto comprimida.
- Pruebas automáticas de importación, validación y totales; TypeScript y compilación de producción.
- Revisión visual local bloqueada por la política del navegador de este entorno; no se afirma verificación en móvil real.
- Activación de la cuenta real, envío de recuperación y recorrido autenticado completo pendientes de intervención del propietario y comprobación posterior.

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
- GitHub sigue pendiente del permiso de escritura y Vercel de su enlace Git para automatizar despliegues.

## Avisos de la revisión de Supabase

El asesor señala que `import_league` usa SECURITY DEFINER y es invocable por roles anon/authenticated. Es intencional para el cron con secreto y el administrador, dado que no se expone ninguna clave de servicio: valida la identidad autorizada o un secreto aleatorio de 256 bits mediante su hash privado antes de escribir. Se ha probado el rechazo sin credencial, incluido secreto nulo. La función solo actualiza el snapshot de liga, no jugadores, actas o administradores; mantiene search_path vacío, validación y límite de frecuencia.

Referencias de los avisos: [ejecución anónima de funciones privilegiadas](https://supabase.com/docs/guides/database/database-linter?lint=0028_anon_security_definer_function_executable) y [ejecución por usuarios autenticados](https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable). No se describen estos avisos como una auditoría sin hallazgos ni como una garantía de seguridad absoluta.

- La sincronización autenticada desde el despliegue respondió HTTP 200 y actualizó correctamente la copia de liga.

## Activación del propietario

- Cuenta del propietario confirmada en Supabase y añadida a admins. No se almacena el correo ni contraseña en este repositorio.
- Permiso de escritura de GitHub validado mediante el conector tras actualizar su instalación.
