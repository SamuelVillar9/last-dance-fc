# Partido en directo — checklist de integración

## Implementado en esta rama
- Sesión de partido, marcador provisional y estados.
- Permisos globales de anotación y control asignados por administración.
- Eventos de gol, tarjeta amarilla, roja y segunda amarilla, con asistencia opcional.
- Cronología, anulación con auditoría e idempotencia por solicitud.
- Cola de avisos a suscripciones de jugadores activos sin filtro de convocatoria.
- Interfaz móvil dentro de la ficha del partido.

## Bloqueos antes de producción
1. Ejecutar migraciones 001, 002 y 003 sobre una base de pruebas y validar el SQL y sus políticas.
2. Probar acceso anónimo, jugador sin permiso, anotador y administrador.
3. Verificar orden y simultaneidad de goles y anulaciones con dos dispositivos.
4. Integrar preferencias de avisos de partido en la pantalla existente de notificaciones.
5. Añadir push para cambios de estado (inicio, descanso, segunda parte, final); actualmente solo los eventos de juego tienen outbox.
6. Añadir reintento independiente del navegador para entregas pendientes; la ruta actual solo dispara un envío tras registrar.
7. Implementar conciliación explícita de los eventos con el acta y resultado oficiales, sin duplicar estadísticas.
8. Probar compilación, TypeScript, test suite y ejecución real en Vercel Preview.
9. Revisar la migración de Supabase antes de aplicarla en producción.
10. Fusionar únicamente después de completar las verificaciones.

**No desplegar ni fusionar esta rama todavía.**
