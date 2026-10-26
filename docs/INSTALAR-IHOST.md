QRFORMA — INSTALACIÓN EN IHOST / CPANEL
=====================================

ARCHIVO QUE DEBES SUBIR

Usa qrforma-ihost.zip. Contiene la web compilada y todos sus archivos, con
index.html directamente en la raíz del ZIP. El paquete qrforma-codigo.zip
es el código fuente para futuras modificaciones; no es el que debes subir.

ACTUALIZAR UNA INSTALACIÓN ANTERIOR

Sube el nuevo ZIP a la misma carpeta de QRforma, extráelo y permite
sobrescribir los archivos de la aplicación, especialmente index.html.
Después recarga la web con Ctrl+F5 para ver la nueva versión.
Las pestañas Enlace, Wifi, Reseñas e Instagram muestran ahora el modelo
3D y un QR de ejemplo desde el primer momento. Completa tu enlace o tu
red wifi para habilitar la descarga con tus datos reales.

La versión 1.0.2 integra Google AdSense. Lee GOOGLE-ADSENSE.txt para
completar la conexión del dominio principal, ads.txt y los ajustes de Google.

La aplicación es estática. En el hosting basta con subir y extraer el ZIP.
Los QR y las descargas se generan en el navegador. No necesitas configurar
Node.js, PHP, una base de datos ni tokens de cPanel para que la web funcione.

1. CREA EL SUBDOMINIO

En cPanel, abre Dominios y pulsa Crear un nuevo dominio, o la opción
Subdominios si tu versión la muestra por separado.

Introduce qrforma seguido de tu dominio real. Por ejemplo, si eres dueño de
minegocio.cl, escribe qrforma.minegocio.cl. Este ejemplo no es un dominio
que se haya registrado o publicado para ti.

Si aparece Compartir raíz del documento, desmarca esa opción y elige una
carpeta independiente para QRforma. Así conservarás el sitio principal.
Anota la raíz del documento que indica cPanel para el nuevo subdominio.
Puede tener un nombre como public_html/qrforma o qrforma.minegocio.cl.
Usa siempre la ruta real que muestre tu panel.

Si usas un dominio nuevo, debe estar asociado a tu hosting. Si el DNS se
administra fuera de ihost, crea allí el registro del subdominio apuntando
a la IP que indique tu hosting. No uses una IP inventada.

2. SUBE LA WEB

Abre Archivos > Administrador de archivos en cPanel.
Entra en la raíz del documento del subdominio que acabas de crear.
Pulsa Cargar / Upload y sube qrforma-ihost.zip.
Vuelve al administrador, selecciona el ZIP y pulsa Extraer / Extract.
Extrae su contenido en esa misma carpeta.

La estructura resultante debe ser:

  carpeta-del-subdominio/
    index.html
    favicon.svg
    robots.txt
    ads.txt
    privacidad.html
    LEEME-INSTALACION.txt
    GOOGLE-ADSENSE.txt
    assets/
      archivos JavaScript, CSS y fuentes

No hace falta crear una carpeta dist adicional. Si aparece una carpeta
extra envolviendo estos archivos, coloca su contenido en la raíz del
documento que muestra cPanel.

3. ACTIVA HTTPS

En cPanel, busca SSL/TLS Status o Estado de SSL/TLS y comprueba el
certificado del nuevo subdominio. Si ofrece Run AutoSSL / Ejecutar AutoSSL,
úsalo cuando el subdominio ya resuelva hacia el hosting.

Abre tu dirección real con HTTPS. Si el certificado o el DNS todavía no
están disponibles, espera a que se apliquen o consulta a ihost.

4. COMPRUEBA LA HERRAMIENTA

- Pega un enlace tuyo y cambia el texto y los dos colores.
- Gira el objeto en la vista 3D y prueba mesa, llavero y placa.
- Descarga un PNG y escanéalo con el móvil.
- Descarga un 3MF y comprueba que tenga las piezas Base y QR y texto.
- Abre la web desde un móvil y comprueba una descarga.
- Comprueba el aviso de confirmación que aparece tras descargar.

El 3MF guarda dos materiales y sus colores, además de metadatos de
asignación de filamentos. Según tu laminador y versión, puede hacer falta
asignar manualmente esos filamentos a las piezas. El STL conserva la
geometría, pero no los colores. Comprueba siempre una impresión física
antes de fabricar varias unidades.

5. OPCIÓN: USAR UNA CARPETA EN VEZ DE UN SUBDOMINIO

Este paquete también funciona dentro de una subcarpeta, como /qrforma/,
porque sus archivos usan rutas relativas. Sube y extrae el mismo ZIP en
la carpeta que elijas y visita su dirección terminada en /.
Por ejemplo, si usas public_html/qrforma, la dirección normalmente será
https://TU-DOMINIO/qrforma/.

6. SI ALGO NO CARGA

- Error 404: comprueba la dirección y la raíz del documento en Dominios.
- Listado de archivos: comprueba que index.html esté en esa carpeta.
- Falta el diseño o la herramienta: comprueba que assets/ se extrajera
  completo junto a index.html y recarga la página.
- Sin vista 3D: usa un navegador actualizado con WebGL habilitado. La web
  ofrece una vista alternativa del QR cuando WebGL no está disponible.
- QR difícil de leer: usa base clara y QR oscuro, un enlace corto y un
  tamaño suficiente; prueba sin logo para comparar.

La web integra el script de Google AdSense para tu cuenta. La activación
y aprobación de los anuncios se gestionan en Google; consulta GOOGLE-ADSENSE.txt.

DOCUMENTACIÓN Y CAMBIOS

qrforma-codigo.zip incluye README.md, el código, las pruebas y el script
de empaquetado. Para volver a generar los paquetes desde el código, usa
Node.js 24, ejecuta npm ci y después npm run package:hosting.
