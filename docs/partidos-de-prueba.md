# Partidos de prueba — solo administración

## Acceso
Entrar en **Administración → Partidos de prueba** con una cuenta administradora. No se muestra en el vestuario, calendario, ficha de partidos ni en el módulo de anotadores.

## Uso
1. Escribir el nombre del rival ficticio y crear una simulación.
2. Seleccionarla, pulsar **Iniciar**, anotar goles, asistencias y tarjetas, y usar **+1/+5/+10 min** para avanzar el reloj sin esperar.
3. Pasar a **Descanso**, **Segunda parte** y **Finalizar**.
4. Usar **Anular** para corregir acontecimientos; **Reiniciar** para volver al 0-0 o **Eliminar prueba** para borrar el partido.

## Seguridad y aislamiento
- Tablas `private.live_simulations` y `private.live_simulation_events` sin acceso directo de `anon` ni `authenticated`.
- Única RPC expuesta `public.live_simulation`, que comprueba `auth.uid()` y `public.is_admin()` en cada operación y limita los registros al administrador propietario.
- No utiliza `public.live_matches`, `public.live_events`, las actas, las tablas de liga ni el sistema de notificaciones.
- No aparecen partidos de prueba en páginas públicas. Los jugadores autorizados para anotar partidos reales no pueden leerlos ni operarlos.
- No se envían push de prueba a jugadores: comprobar push reales requiere una prueba controlada independiente con consentimiento.

## Validación
`tests/live-simulations.sql` verifica acceso denegado al jugador, anotación de gol, reinicio y eliminación, ejecutado en el PostgreSQL aislado de GitHub Actions.
