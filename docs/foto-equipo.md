# Foto de equipo de LAST DANCE FC

Se publica al principio de /plantilla, antes del título y las fichas. La imagen completa conserva su proporción en móvil y escritorio; el diálogo permite verla completa o a tamaño de detalle, con desplazamiento, cierre con Escape y restauración del foco. Incluye texto alternativo, dimensiones reservadas y variantes WebP de 768/1280/1672 píxeles.

La primera versión es una composición generada con los diez retratos públicos existentes. El usuario ha elegido expresamente publicarla provisional con diez: Fdez (#6) carece de fotografía y se incorporará cuando se disponga de ella. Su ficha sigue activa y visible. No se inventa ni duplica a ningún jugador.

De pie, de izquierda a derecha: Álvaro #2, Joaquín #3, Miguel #4, Samu #7 y Jony #10. Agachados: Kevin #11, Dani #14, Dani portero #1, Rafa Jarillo #19 y Rafa Rodríguez #20. El portero conserva la camiseta amarilla; los nueve restantes la negra y roja. Pantalones y medias blancos para los nueve jugadores de campo. El portero conserva camiseta, pantalón y medias amarillos, conforme a la última corrección del usuario.

Generación mediante la herramienta de imágenes integrada. Referencias: dos tableros de identidad montados sin alterar los retratos, la camiseta, el escudo y la foto de referencia de colocación en pabellón. Prompt base: composición fotográfica realista de exactamente diez identidades, en dos filas de cinco, sobre pista de madera de un pabellón de fútbol sala, preservando rostros, edad, peinados y equipación. Corrección final: cambiar únicamente el pantalón y las medias del portero central #1 a amarillo, conservando los pantalones y medias blancos de los nueve jugadores de campo, así como caras, camisetas, posiciones, iluminación y fondo.

Activos publicados: public/team-photo-v1.webp, public/team-photo-v1-1280.webp y public/team-photo-v1-768.webp. No se ejecuta IA al visitar la página ni al guardar en administración.

Administración → Foto de equipo permite subir una nueva composición horizontal, editar el pie y la descripción accesible. Convierte en el navegador a WebP de hasta 2560 px sin recortar. Guarda la ruta en public.team_photo y el archivo en el bucket público team-photos. RLS permite lectura pública y cambios solo al administrador. Las rutas se limitan a official/<uuid>.webp. El registro único no admite borrado por el cliente. La marca de actualización protege frente a cambios concurrentes; un guardado fallido conserva la foto anterior y retira el archivo nuevo sobrante. La política de almacenamiento impide borrar el archivo actualmente publicado.

Despliegue: aplicar 20261030135508_team_photo.sql antes de la interfaz. El cambio es aditivo; el código usa la imagen incluida si no hay sustitución almacenada o no se puede cargar. No se modifican retratos individuales, cuentas, actas ni estadísticas.
