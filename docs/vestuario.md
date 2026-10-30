# Vestuario y MVP
Rutas: /equipo (acceso privado) y /mvp (ranking público).

## Alta de jugadores: exclusiva del administrador
No existe formulario de registro público. Los jugadores solo inician sesión con los datos que les entrega el administrador.

1. Entra con tu cuenta de administrador en /equipo.
2. En Cuentas de jugadores deja seleccionada Crear cuenta de jugador.
3. Elige su ficha, escribe su correo y una contraseña temporal de 12 a 128 caracteres.
4. Pulsa Crear y vincular cuenta. No se envían invitaciones ni correos de confirmación.
5. Entrega esas credenciales por privado al jugador. Puede cambiarlas con Cambiar contraseña después de entrar.
6. Para tu cuenta de administrador o cualquier cuenta ya creada, usa Vincular cuenta existente.

La función create-player-account comprueba la sesión y el rol de administrador antes de usar Auth Admin. La clave de servidor permanece dentro de Supabase Edge Functions. Si la vinculación falla se intenta anular únicamente la cuenta recién creada; si falla también la anulación, se explica cómo vincular esa cuenta existente sin duplicarla.

## Cerrar el registro en Supabase
Además de retirar el registro de la interfaz, desactiva Authentication > Sign In / Providers > Allow new users to sign up en el proyecto Supabase. Así se bloquea también el alta directa por API; Auth Admin sigue permitiendo las altas del administrador.
La configuración local supabase/config.toml también declara enable_signup=false. El proyecto remoto requiere aplicar ese ajuste en el panel de Supabase; no basta con ocultar un botón. El código no declara el registro como cerrado en el proveedor hasta verificar ese ajuste.

## Activación
Despliega supabase/functions/create-player-account con su autenticación interna: verifica el JWT mediante Auth y comprueba is_admin, sin confiar en metadatos del usuario. La función necesita que la migración team_area esté aplicada previamente. Comprueba esa condición antes de crear cuentas.
La migración team_area se aplicó en producción el 30 de octubre de 2026, tras la autorización del propietario. Se verificaron el acceso del administrador, las dos votaciones existentes, los permisos y la conservación de jugadores, actas y borradores. La función create-player-account está desplegada. El cierre del registro público en la configuración remota de Auth debe verificarse por separado.

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


## El rincón de rajar

Los comentarios de actuación son públicos y aparecen debajo del acta del partido y en la ficha de su destinatario. Solo los jugadores con una cuenta vinculada y activa pueden escribir. El partido debe haber finalizado y tener un acta publicada; el destinatario debe figurar en ella. Se permite comentar la propia actuación.

Cada autor puede guardar un comentario de hasta 280 caracteres por destinatario y partido, editarlo o eliminarlo. El administrador puede eliminar cualquier comentario. Se muestran diez comentarios por página, con filtro por jugador en el partido. No hay respuestas, reacciones ni consultas periódicas. Las identidades de Auth se guardan en el esquema privado y nunca se incluyen en la respuesta pública.

La migración `20261030120704_match_comments.sql` debe aplicarse antes de desplegar la interfaz. `tests/comments.sql` comprueba los permisos reales y `tests/browser.spec.mjs` recorre publicación, error de guardado, edición, ficha personal y moderación.
