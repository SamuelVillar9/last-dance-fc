# Vestuario y MVP
Rutas: /equipo (acceso privado) y /mvp (ranking público).

## Alta de jugadores
1. El jugador entra en /equipo y pulsa Crear mi cuenta con correo y contraseña (12 caracteres o más).
2. Confirma el correo si se solicita. Si el envío gratuito de Supabase no permite ese destinatario, el administrador puede crear la cuenta en Supabase > Authentication > Users > Add user > Create new user, con correo confirmado y contraseña temporal que se comparte de forma privada.
3. El administrador inicia sesión en /equipo con su cuenta habitual. En Cuentas de jugadores selecciona la ficha y escribe el correo confirmado.
4. Pulsa Vincular cuenta. La cuenta no puede vincularse a un jugador que ya tiene otra cuenta; primero hay que desvincularlo.
5. El jugador ya puede responder y votar. También puedes vincular tu propia cuenta de administrador a tu ficha.
No se dan permisos de administración a los jugadores.

## Funcionamiento
La disponibilidad (Voy / No voy / Duda / Sin responder) ES la convocatoria. Puede cambiar hasta el inicio del partido (hora de Madrid). El administrador puede responder por otros jugadores.
El acta publicada es la única fuente de asistentes para el MVP. Publicar abre 48 horas. Los votos pueden cambiar, pero solo hay uno por jugador y partido. No hay autovoto. Se ve quién votó, nunca sus elecciones. Al cerrar, se publican recuentos y los empates comparten premio. La clasificación ordena por premios y después por votos.
Editar un acta no reinicia la ventana; se eliminan votos cuyo emisor o destinatario ya no figure en ella. Las actas existentes reciben una ventana de 48 horas al instalar la función.

## Comprobación aislada
El workflow checks.yml ejecuta tests unitarios, TypeScript, build y pruebas de PostgreSQL con roles, actas y usuarios ficticios en un contenedor efímero. No recibe secretos ni URL de producción.
Para ejecutar las mismas pruebas con PostgreSQL local, aplica tests/team-bootstrap.sql, las dos migraciones iniciales y supabase/team-area.sql, y después tests/team.sql con ON_ERROR_STOP=1.
El bootstrap es únicamente para una base vacía de pruebas. Nunca debe ejecutarse en Supabase.

## Despliegue
supabase/team-area.sql se aplica una sola vez como migración team_area. Solo añade estructuras y funciones; no cambia actas, jugadores ni credenciales existentes. Las tablas nuevas viven en private con RLS y sin permisos directos del cliente. Los RPC públicos usan funciones invoker; las implementaciones privadas verifican identidad y permisos.
No hay servicios nuevos de pago, tareas programadas ni claves service_role en el navegador.
