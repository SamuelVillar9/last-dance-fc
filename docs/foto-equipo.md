# Foto de equipo de LAST DANCE FC

La página /plantilla empieza con el título y las fichas mientras no haya foto de grupo publicada. No incluye ninguna imagen generada, imagen de muestra ni espacio vacío reservado.

Administración → Foto de equipo permite subir una foto horizontal, editar el pie y la descripción accesible. La imagen se optimiza en el navegador a WebP de hasta 2560 px sin recortar. El tamaño de entrada máximo es 15 MB; el archivo convertido debe ocupar menos de 5 MB y tener al menos 800 px de ancho. Al guardar, aparecerá al principio de Plantilla.

La imagen conserva su proporción en móvil y escritorio. Se puede abrir en un diálogo y usar Ver detalle para inspeccionarla a tamaño completo, con desplazamiento, cierre por Escape y restauración del foco. Si no se puede cargar, se oculta el bloque para conservar la plantilla utilizable.

La ruta se guarda en public.team_photo y el archivo en el bucket público team-photos. RLS permite lectura pública y cambios solo al administrador. Las rutas se limitan a official/<uuid>.webp. El registro único se crea con image_path nulo y no admite borrado por el cliente. Las imágenes futuras se publicarán desde administración en el almacenamiento de la web, sin subirlas al repositorio GitHub.

La marca de actualización evita sobrescribir cambios concurrentes. Un guardado fallido conserva la foto anterior y retira el archivo nuevo sobrante. La política de almacenamiento impide borrar el archivo actualmente publicado. No se modifican retratos individuales, cuentas, actas ni estadísticas.

Despliegue: aplicar 20261030135508_team_photo.sql antes de la interfaz. El cambio es aditivo. No se ejecuta IA al visitar la página ni al guardar en administración.
