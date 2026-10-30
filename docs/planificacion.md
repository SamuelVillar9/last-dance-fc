# LAST DANCE FC — Planificación de la web

Actualizado: 30 de octubre de 2026.

## Objetivo y condiciones

Web sencilla del equipo para consultar plantilla, estadísticas de jugadores, calendario y clasificación. Repositorio público en el GitHub del usuario (SamuelVillar9), alojamiento preferido en Vercel o similar y desarrollo desde ChatGPT cuando las conexiones y permisos lo permitan.

La definición se hará mediante una pregunta por turno con opciones. No comenzar a desarrollar hasta que el usuario indique que la planificación está cerrada y autorice el inicio.

Usar como referencias la plantilla 2026/27 y los colores del club ya guardados, con blanco puro sustituyendo al gris claro. Consultar los documentos originales antes de implementar los datos exactos.

## Pregunta 1 — ¿Quién podrá consultar la web del equipo?

Decisión confirmada: cualquiera podrá consultar la web; solo los administradores podrán editar, con inicio de sesión para gestionar los datos.

## Pregunta 2 — ¿De dónde saldrán los datos de la competición?

Respuesta del usuario: la web del Polideportivo San Gabriel, fútbol sala de los domingos. Enlaces facilitados:

- Jornadas de la Fase I: https://www.polideportivosangabriel.es/pages/Futbol%20Sala/Domingo/Jornadas/Fase%20I/index%20jornadas.html
- Página general de la competición: https://www.polideportivosangabriel.es/pages/Futbol%20Sala/Domingo/futbol%20sala%20domingo.html

Se ha comprobado la temporada 2026/27, la tabla de clasificación y el HTML de jornadas. La extracción parece técnicamente viable; falta implementarla y validarla desde el alojamiento. La frecuencia y el registro de estadísticas se concretan en las decisiones siguientes.

## Decisiones 3 a 30

| Nº | Tema | Decisión confirmada |
|---:|---|---|
| 3 | Estadísticas individuales | Partidos jugados, goles, asistencias y tarjetas amarillas y rojas. |
| 4 | Registro | Acta por partido: seleccionar participantes y asignar goles, asistencias y tarjetas; calcular totales automáticamente. |
| 5 | Temporadas | Solo 2026/27. |
| 6 | Ficha pública | Nombre o apodo, dorsal, posición, foto y estadísticas. |
| 7 | Calendario | Todos los partidos de la liga y filtro para LAST DANCE FC. |
| 8 | Sincronización | Una vez al día automáticamente y botón manual para el administrador. Preservar las actas propias. Viabilidad por validar. |
| 9 | Inicio | Próximo partido, último resultado, posición en liga, máximos goleadores y asistentes del equipo. |
| 10 | Diseño | Selector claro/oscuro; colores del club principales y acentos; diseño deportivo muy personalizado, tipografía moderna y deportiva, evitar estética genérica de plantillas. |
| 11 | Navegación | Páginas separadas: Inicio, Plantilla, Calendario, Clasificación y Estadísticas; panel privado adicional. |
| 12 | Detalle del partido | Resultado, rival, fecha, hora, pista, participantes, goleadores, asistentes y tarjetas. |
| 13 | Administración | Solo el usuario, con una cuenta de administrador. |
| 14 | Acceso | Correo y contraseña. Se propone recuperación de contraseña y sin registro público. |
| 15 | Presupuesto | 0 euros al mes; planes gratuitos y adaptación a límites, que deberán verificarse antes del desarrollo. |
| 16 | Dirección | Subdominio gratuito del alojamiento; preferencia lastdancefc.vercel.app sujeta a disponibilidad. |
| 17 | Móvil | Responsive y añadible a pantalla de inicio, icono del club y apertura como app. |
| 18 | Página de estadísticas | Tabla ordenable y rankings destacados de goleadores y asistentes. |
| 19 | Fallos de sincronización | Mantener últimos datos y mostrar fecha/hora de última actualización correcta. |
| 20 | Publicación de actas | Guardar como borrador y publicar tras revisión. Solo actas publicadas visibles y computables públicamente. |
| 21 | Partidos anteriores | El usuario rellenará las actas anteriores para completar toda la temporada. |
| 22 | Plantilla | Altas, edición de fichas y bajas preservando estadísticas y actas anteriores. |
| 23 | Fotos | Subida y sustitución desde el panel, también móvil; imagen predeterminada hasta disponer de foto individual. Propuesta: identidad del club y dorsal. |
| 24 | Disciplina | Solo contar amarillas y rojas; sin gestión de sanciones. |
| 25 | Detalle de jugador | Datos, totales de temporada y desglose por partido de goles, asistencias y tarjetas. |
| 26 | Descargas | Sin descargas ni exportaciones desde el panel. |
| 27 | Menú móvil | Barra inferior fija: Inicio, Plantilla, Calendario, Clasificación y Estadísticas. |
| 28 | Fases | Fase actual por defecto, selector de fases anteriores de 2026/27 en calendario y clasificación. |
| 29 | Agregación | Totales de temporada y filtro por fase en estadísticas individuales. |
| 30 | Revisión visual | Comparar dos propuestas de inicio móvil antes de elegir dirección visual. |
| 31 | Tema inicial | Seguir el tema del dispositivo, con selector manual y recuerdo de la elección. |
| 32 | Vista de calendario | Lista por jornadas con fecha, hora, pista y resultado. |
| 33 | Siguiente paso | Consolidar lo acordado y comprobar viabilidad técnica y planes gratuitos, sin desarrollar todavía. |

## Dirección visual elegida

El usuario ha elegido **A — Pulso**, representada en la maqueta «Pulso móvil dual de Last Dance FC.png» (referencia: libfile_c9e31dbf4ddc8191bb91e6d05e40377b).

- Tipografía de titulares deportiva, condensada e inclinada; texto secundario y tablas con fuente legible. La familia y licencia exactas se comprobarán al implementar.
- Composición editorial con protagonismo del nombre del club, marcadores, divisores finos y trazos de pista. Respetar la maqueta elegida al traducirla a una interfaz real y accesible.
- Versiones clara y oscura con rojo #F72441, negro y blanco puro. Comprobar contrastes en texto y estados activos; no usar solo el color para transmitir información.
- **Los rivales se identificarán exclusivamente por sus nombres. No usar escudos, insignias inventadas, iniciales dentro de escudos ni símbolos de sustitución.** Esta instrucción sustituye los emblemas de rival provisionales de la maqueta en todas las páginas. El club sí mantiene su escudo.
- Las cifras vacías de las maquetas no son datos deportivos reales. No mostrar valores de ejemplo como datos de producción.

## Referencias confirmadas

- Paleta: rojo #F72441, negro #000000 y blanco puro #FFFFFF.
- Plantilla 2026/27: 1 Dani; 2 Álvaro; 3 Joaquín; 4 Miguel; 6 Fdez; 7 Samu; 10 Jony; 11 Kevin; 14 Dani; 19 Rafa Jarillo; 20 Rafa Rodríguez.
- Los dorsales reservados 5 Nel, 8 Jorge y 9 Mario están fuera de la plantilla actual.

## Consolidación técnica — revisión del 30/10/2026

**Resultado: proyecto viable para la escala prevista con servicios gratuitos, condicionado a sus cuotas y a las comprobaciones previas a publicación que se indican abajo. No equivale a disponibilidad garantizada ni a una importación ya implementada.**

### Arquitectura propuesta, aún no implementada

| Parte | Propuesta | Motivo |
|---|---|---|
| Interfaz y servidor | Next.js con TypeScript y CSS personalizado | Páginas públicas, administración y rutas de importación en un mismo proyecto; soporte de despliegue en Vercel. |
| Diseño | Sistema propio basado en Pulso | Evitar una plantilla visual genérica; separar titulares deportivos y lectura de datos. |
| Datos | PostgreSQL de Supabase Free | Datos persistentes, relaciones entre partidos, jugadores, actas y fases. |
| Cuenta única | Supabase Auth, correo y contraseña | Alta controlada del administrador; sin registro público. |
| Imágenes | Supabase Storage Free | Fotos reemplazables desde móvil, comprimidas antes de almacenarlas. |
| Alojamiento | Vercel Hobby | Proyecto no comercial de pequeño volumen, dominio gratuito y despliegues desde GitHub. |
| Actualización | Cron diario de Vercel y botón autenticado | Un mismo proceso de importación para ambas entradas. |
| Código | Repositorio público en SamuelVillar9 | Código versionado y documentación; sin credenciales, correos privados, borradores o volcados de datos. |
| Experiencia móvil | Manifiesto web, iconos y modo standalone sobre HTTPS | Añadir a inicio en dispositivos compatibles; no implica funcionamiento sin conexión ni notificaciones, no solicitados. |

Es una recomendación técnica para el objetivo de 0 euros y Vercel; no una elección del usuario de versiones concretas ni una autorización de implementación. Las versiones exactas se fijarán y verificarán al comenzar.

### Límites gratuitos comprobados

| Servicio | Límites relevantes de la documentación oficial | Consecuencia para este proyecto |
|---|---|---|
| Vercel Hobby | Uso personal/no comercial; 100 GB de transferencia rápida, 1 millón de invocaciones de funciones, 4 horas de CPU activa y 360 GB-hora de memoria provisionada incluidos. | Adecuado como estimación para un equipo amateur y tráfico reducido. No activar complementos de pago; confirmar el plan real de la cuenta antes de crear recursos. |
| Cron de Vercel Hobby | Cada tarea puede ejecutarse una vez al día; ejecución dentro de la hora, sin precisión de minuto garantizada. | Cumple la decisión 8. Propuesta: ventana diaria 06:00–06:59 UTC, equivalente a 07:00–07:59 en invierno y 08:00–08:59 en verano en Madrid. Hora propuesta, no elegida aún por el usuario. |
| Supabase Free | 500 MB de base de datos, 1 GB para archivos, 5 GB de salida y 5 GB de salida cacheada, 50.000 usuarios activos mensuales; máximo de 2 proyectos activos. | Capacidad estimada suficiente para una temporada y un administrador. 11 fotos de 250 KB representarían aproximadamente 2,75 MB; limitar tamaño y dimensiones y retirar archivos sustituidos. |
| Inactividad de Supabase | Puede pausar proyectos gratuitos tras una semana con poca actividad. | La sincronización usa la base de datos de forma real, pero no elimina ni garantiza evitar la pausa. Documentar reactivación y mostrar un estado de indisponibilidad si sucede. |
| Correos de Supabase por defecto | Solo direcciones autorizadas del equipo de la organización, límite actual de 2 mensajes por hora y sin garantía de entrega. | No dar por resuelta la recuperación de contraseña en producción con el correo predeterminado. Configurar SMTP propio o documentar recuperación administrativa mientras se resuelve. |

La previsión de 0 euros depende de tráfico, cuotas disponibles y condiciones vigentes. No es una garantía permanente ni incluye comprar un dominio. Un plan gratuito puede limitar o suspender servicio al superar sus cuotas. No se contratará un plan de pago sin una instrucción nueva del usuario.

Para recuperar contraseña por email sin comprar dominio, se puede evaluar SMTP de una cuenta existente compatible, por ejemplo Gmail si admite contraseña de aplicación y verificación en dos pasos. No se ha configurado ni comprobado en la cuenta del usuario. Las credenciales se introducirán directamente en los ajustes del proveedor, nunca en el chat o en el repositorio. No es necesario elegirlo ahora para finalizar esta planificación, pero sí verificar un mecanismo de recuperación antes de publicar.

### Comprobación de los datos de la liga

1. La página general enlaza a un calendario contenedor que carga un **iframe**. Los datos están en el HTML `Jornadas.htm`, no solo en el contenedor.
2. Se ha obtenido respuesta HTTP 200 y contenido estructurado del contenedor, del HTML interno y de la clasificación durante la revisión. El HTML interno tiene tablas anidadas, texto con codificación antigua y horas con formato como `9:0`; la importación deberá normalizarlos.
3. Se han observado fechas, horas, pistas, equipos locales/visitantes, resultados, descansos y partidos aplazados. El documento de jornadas revisado solo incluye las jornadas que la organización ha publicado: no generar como oficiales las restantes por cálculo.
4. La clasificación contiene posición, nombre, puntos, jugados, ganados, empatados, perdidos, goles a favor, en contra y diferencia. **Conservar el orden oficial**, sin recalcular el desempate con una regla simplificada.
5. El documento oficial de sistema de liga 2026/27 indica Fase I de 15 equipos a una vuelta y Fase II de tres grupos de cinco por clasificación, también a una vuelta. La segunda fase necesita grupo además de fase. Preparar el modelo para ello y registrar sus enlaces cuando estén publicados; no inventar grupos o emparejamientos.
6. El nombre externo del equipo es `LAST DANCE`; vincularlo al club interno `LAST DANCE FC` mediante una correspondencia explícita. No depender del nombre visible como identificador de base de datos.
7. La importación se realizará desde servidor; no depender del navegador del visitante ni de que la liga permita peticiones CORS.
8. No se ha localizado una API documentada durante esta revisión. La viabilidad observada corresponde a lectura de HTML público. No se ha implementado ni ejecutado un importador completo ni se ha comprobado todavía el acceso desde una función desplegada de Vercel.

Fuentes operativas:

- [Página general](https://www.polideportivosangabriel.es/pages/Futbol%20Sala/Domingo/futbol%20sala%20domingo.html)
- [Contenedor de jornadas](https://www.polideportivosangabriel.es/pages/Futbol%20Sala/Domingo/Jornadas/Fase%20I/index%20jornadas.html)
- [HTML interno de jornadas](https://www.polideportivosangabriel.es/pages/Futbol%20Sala/Domingo/Jornadas/Fase%20I/Jornadas.htm)
- [Clasificación](https://www.polideportivosangabriel.es/pages/Futbol%20Sala/Domingo/clasificacion.html)
- [Sistema oficial de la competición 2026/27](https://www.polideportivosangabriel.es/docs/Sistemas%20Ligas/bases%20futbol%20sala%20domingo.pdf)

También se ha leído el reglamento 2026/27 aportado por el usuario. Su artículo 18 remite al sistema de cada competición y establece desempates que incluyen enfrentamientos entre fases y otros criterios. No se automatizarán sanciones ni clasificación disciplinaria, conforme a la decisión 24.

### Reglas de sincronización propuestas

- Separar datos oficiales importados de las actas propias. Un cambio de resultado oficial no debe borrar participantes, goles individuales, asistencias o tarjetas.
- Cada partido tendrá un identificador interno estable. Cambios de fecha u hora no crean un partido nuevo. Para identificarlo, usar fase, grupo, jornada y equipos, no exclusivamente la fecha.
- Registrar intento y resultado de cada sincronización y conservar por separado la hora del último éxito. Si hay fallo de red, formato inesperado, tabla vacía o incoherencia, mantener los datos válidos anteriores de ese conjunto.
- Validar primero y guardar cada conjunto coherente de forma atómica. No mostrar una clasificación parcial. Diferenciar estados de éxito de calendario y clasificación si uno falla y el otro no.
- Limitar tiempos, número de peticiones y reintentos; una ejecución a la vez. El botón manual requiere sesión del administrador y un intervalo mínimo para evitar peticiones repetidas.
- Incorporar fases nuevas de manera controlada, sin reasignar automáticamente datos antiguos al cambiar el contenido de una URL reutilizada por la organización.
- Guardar fecha/hora en UTC y presentar partidos y actualizaciones en Europe/Madrid.
- Un descanso no es un rival ni un partido jugado. Un aplazamiento sin hora no se convierte en 00:00 ni en resultado 0–0. La ausencia de marcador significa sin resultado publicado.
- Mostrar enlace a la fuente y fecha de actualización. La sincronización diaria no garantiza recoger cambios de última hora; el botón permite actualizarlos bajo demanda.

### Modelo inicial de datos propuesto

| Entidad | Función |
|---|---|
| Temporada | Única temporada habilitada: 2026/27. |
| Fases y grupos | Separar fases y divisiones/grupos dentro de cada fase. |
| Equipos y correspondencias externas | Nombre público, identidad estable y mapeo del club; rivales sin escudos. |
| Jugadores y pertenencia a plantilla | Nombre/apodo, dorsal, posición pendiente si falta, foto opcional, alta/baja. Identificador estable; los dos Dani son jugadores distintos. |
| Partidos | Jornada, fase/grupo, local/visitante, pista, fecha/hora opcionales, estado y resultado oficial opcional. |
| Clasificación oficial | Filas por fase/grupo con posición oficial y columnas de la tabla. |
| Actas | Relación con partido del club y estado borrador/publicada. Propuesta: guardar una versión publicada y otra de trabajo al corregir, para evitar cambios públicos parciales. |
| Participaciones | Jugador, partido y cantidades no negativas de goles, asistencias, amarillas y rojas. Único registro por jugador y versión del acta. |
| Sincronizaciones | Historial acotado de intentos, errores y última importación válida por fuente. |
| Administrador | Única identidad autorizada, gestionada por Auth y controles en servidor/base de datos. |

Los totales serán derivados de las participaciones de actas publicadas; no habrá un campo de total editable que pueda sumarse dos veces. Publicar o republicar un acta no duplicará las estadísticas. La participación seleccionada debe significar que el jugador disputó el partido, no solo que estuvo convocado; dejar este significado claro en el formulario.

El marcador oficial y la suma de goles atribuibles a jugadores pueden diferir por autogoles o resultados administrativos. Antes de publicar se avisará de discrepancias y se permitirá registrar una explicación sin inventar goleadores. No imponer igualdad obligatoria que impida guardar un acta real. Esta es una regla propuesta de integridad, no una funcionalidad adicional solicitada de seguimiento de eventos.

### Protección de datos y publicación

- Rutas de administración y escrituras de base de datos restringidas a la identidad concreta del administrador; no basta con estar autenticado ni con ocultar botones.
- Lectura pública solo de los datos previstos y las actas publicadas. Los borradores y sus estadísticas no estarán accesibles mediante API pública.
- Registro abierto deshabilitado. Configurar redirecciones válidas de recuperación y cookies de sesión seguras.
- Credenciales de servidor, sincronización y base de datos nunca en JavaScript público, capturas o GitHub. El repositorio público contendrá esquema y ejemplos de configuración sin valores secretos; no la base de datos activa.
- En Storage, escritura solo del administrador y límites de formato, peso y dimensiones de imagen. Fotos públicas solo cuando se publiquen; mantener una imagen predeterminada sin inventar fotografías.
- No se añaden notificaciones, noticias, crónicas, convocatorias, sanciones, exportaciones ni modo sin conexión, al no estar incluidos en el alcance.
- Sin exportación en el panel, conforme a la decisión 26. La recuperación operativa de los datos es otra cuestión: no prometer copias diarias/restauración automática del plan Free. La política de respaldo técnico sigue pendiente de concretar fuera del panel.

### Conexiones comprobadas y límites de ejecución desde aquí

- GitHub: identidad autenticada **SamuelVillar9** comprobada. La integración disponible permite trabajar con archivos, commits, ramas y PR de repositorios accesibles, pero **no expone crear un repositorio nuevo**. No se ha probado una escritura. Puede ser necesaria la creación inicial del repositorio público desde GitHub móvil o una vía autenticada compatible que se habilite después.
- Vercel: se puede consultar el espacio **Samuel's projects**. La consulta de proyectos con nombre que contiene `last` no devolvió coincidencias. Esto **no acredita disponibilidad global** de `lastdancefc.vercel.app` ni confirma el plan de facturación de la cuenta; ambas cosas quedan para la configuración inicial.
- Supabase: conexión de consulta disponible. Se ha consultado el inventario sin crear ni modificar proyectos. Confirmar cuota gratuita disponible y crear un proyecto separado para LAST DANCE; no reutilizar datos de otro proyecto.
- El desarrollo puede realizarse desde este entorno, pero las conexiones iniciales, creación del repositorio si no hay herramienta y entrada de credenciales podrían requerir acciones del usuario desde el móvil. No se necesita un PC para escribir el código; tampoco se promete ausencia total de intervención.
- Se revisó el changelog de Supabase: usar clientes actuales compatibles con TLS moderno y no depender de personalización de las plantillas de email del proveedor predeterminado en nuevos proyectos gratuitos. No se han instalado dependencias.

### Ruta de trabajo cuando el usuario autorice desarrollar

1. Confirmar plan gratuito y cuota de los servicios, nombre de repositorio y dirección disponibles; resolver creación inicial del repositorio y mecanismo de recuperación del administrador.
2. Preparar código, esquema, políticas de acceso y datos iniciales conocidos; posiciones y fotos no conocidas permanecen pendientes. No inventar datos individuales.
3. Construir Pulso con componentes personalizados, páginas públicas y navegación responsive; aplicar rivales solo con nombres.
4. Implementar actas, borradores/publicación, cálculo de estadísticas y fotos desde móvil.
5. Implementar importación y comprobar acceso real desde Vercel. Activar una sola tarea diaria y el botón manual.
6. Verificar los recorridos completos y límites de acceso antes de publicación. Revisar la versión final y los pendientes con el usuario conforme a sus instrucciones.

### Criterios de aceptación

- Inicio, plantilla, calendario, clasificación y estadísticas se pueden consultar sin login; móvil sin desbordamientos, barra inferior usable y selector de tema persistente.
- La identidad visual sigue Pulso, usa el escudo propio y nunca muestra escudos de rivales.
- Clasificación importada conserva exactamente el orden oficial. Calendario presenta estados de descansos, aplazamientos y horarios pendientes correctamente y filtra fase/equipo.
- Un borrador no cambia datos ni totales públicos. Publicar incorpora cada participación una sola vez; corregir y republicar reemplaza sus valores, sin duplicarlos.
- Dar de baja a un jugador conserva su historial. Editar un nombre o dorsal no cambia su identidad ni mezcla a los dos jugadores llamados Dani.
- Sin sesión o con una identidad diferente no se puede editar, subir fotos ni disparar importación manual; no se pueden leer borradores por API.
- La sincronización repetida es idempotente, no elimina actas y conserva datos anteriores ante un fallo. Detecta cambios de hora/pista sin duplicar partidos.
- Instalación en pantalla de inicio comprobada en un dispositivo compatible; no se ofrece funcionamiento offline no desarrollado.
- Recuperación del administrador comprobada y límites gratuitos revisados. Pruebas de permisos, agregación de actas e importación con casos reales; compilación y revisión móvil antes de publicar.

### Fuentes técnicas oficiales revisadas

- [Vercel Hobby: cuotas y uso](https://vercel.com/docs/plans/hobby)
- [Cron: límites y precisión](https://vercel.com/docs/cron-jobs/usage-and-pricing)
- [GitHub conectado a Vercel](https://vercel.com/docs/git/vercel-for-github)
- [Next.js en Vercel](https://vercel.com/docs/frameworks/full-stack/nextjs)
- [PWA con Next.js](https://nextjs.org/docs/app/guides/progressive-web-apps)
- [Supabase: precios y Free](https://supabase.com/pricing)
- [Supabase: correos SMTP](https://supabase.com/docs/guides/auth/auth-smtp)
- [Supabase: pausa por inactividad](https://supabase.com/kb/faqs/platform/free-project-pausing)
- [Supabase: lista de producción y copias](https://supabase.com/docs/guides/deployment/going-into-prod)
- [Supabase: historial de cambios](https://supabase.com/changelog)
- [Google: contraseñas de aplicación y requisitos](https://support.google.com/accounts/answer/185833)

## Estado actual

**Definición funcional consolidada y viabilidad documental revisada. Desarrollo sin iniciar y sin autorización para empezarlo.**

No se han creado repositorios, proyectos, tablas, cuentas, cron ni despliegues. Solo se ha actualizado esta documentación y se han realizado comprobaciones de lectura. Las limitaciones principales pendientes antes de publicar son creación inicial del repositorio, confirmación del plan/cuotas y dominio, recuperación del administrador y prueba del importador desde el alojamiento.
