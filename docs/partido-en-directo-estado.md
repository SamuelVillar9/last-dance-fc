# Partido en directo — entrega 2026/27

## Funcionalidad implementada
- Marcador provisional, reloj y estados de primera parte, descanso, segunda parte y final.
- Eventos de goles, asistencias, tarjetas amarillas, rojas y segundas amarillas.
- Anulación auditable de acontecimientos, sin alterar actas oficiales.
- Permisos de anotación y control asignados desde administración.
- Cronología pública actualizada por consulta periódica de 5 segundos.
- Notificaciones web push para eventos y cambios de estado a integrantes activos con suscripción, independientemente de su convocatoria.
- Preferencia independiente para desactivar push del directo.
- Cola persistente con reintentos mediante la tarea diaria existente y disparo tras eventos.
- Importación de eventos a un borrador de acta revisable por el administrador.
- Migraciones SQL aplicadas al proyecto Supabase de Last Dance FC.

## Alcance y límites operativos
- El directo es **provisional**. El resultado y las estadísticas oficiales se publican mediante el acta habitual.
- Los destinatarios necesitan una suscripción push activa y permisos del navegador. En iOS puede ser necesaria la PWA instalada.
- Los avisos se envían a todos los integrantes activos **suscritos** con la preferencia habilitada, estén convocados o no. No se pueden enviar a dispositivos sin consentimiento o suscripción.
- Los reintentos automáticos siguen la tarea diaria existente; no garantizan entrega inmediata si falla el disparo del evento.
- La actualización del marcador utiliza polling de cinco segundos, no canales Supabase Realtime.
- Los permisos de anotación son globales para los partidos del equipo.
- La importación al acta exige revisión manual antes de publicarla.

## Comprobación previa a la fusión
1. GitHub Actions: pruebas unitarias, tipos, migraciones aisladas, compilación y navegador.
2. Vercel Preview: despliegue READY del último commit.
3. Revisión de seguridad y comprobación de datos en Supabase.
4. Prueba funcional con cuentas de administrador y jugador suscrito.

No confundir la existencia de las funciones con la verificación de entrega real de notificaciones.
