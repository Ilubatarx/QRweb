QRFORMA 1.0.2 — GOOGLE ADSENSE
=============================

Esta versión integra el código que proporcionaste con el identificador
público ca-pub-3129822340744666. El script se carga una sola vez, de forma
asíncrona, en la cabecera de index.html.

QUÉ INCLUYE

- Código de AdSense para anuncios automáticos.
- Etiqueta meta de cuenta de AdSense.
- ads.txt con tu identificador de editor.
- Política de privacidad y cookies en privacidad.html, enlazada en el pie.
- Las correcciones del visor 3D de la versión 1.0.1.
- Descargas directas con confirmación. Se retiraron los anuncios ficticios
  y la ventana publicitaria de descarga; Google gestiona sus formatos.

1. ACTUALIZA QRFORMA

Sube el ZIP de esta versión a la carpeta de QRforma en cPanel y extráelo,
permitiendo sobrescribir los archivos de la aplicación. Después recarga
la web con Ctrl+F5.

index.html, assets/, ads.txt y privacidad.html deben quedar directamente
en la raíz del documento del subdominio o carpeta de QRforma.

2. COLOCA ADS.TXT EN EL DOMINIO PRINCIPAL

En AdSense se añadió clagambinoa.cl. Comprueba que este recurso público
esté disponible en esa dirección exacta:

  https://clagambinoa.cl/ads.txt

La línea correspondiente a esta cuenta es:

  google.com, pub-3129822340744666, DIRECT, f08c47fec0942fa0

El ZIP ya contiene ads.txt para QRforma. Si la herramienta está en un
subdominio, copia ese archivo también a la raíz del documento del dominio
principal que muestra cPanel. Si el dominio principal ya tiene ads.txt,
añade esta línea sin borrar las otras entradas.

La política ads.txt puede variar si administras autorizaciones distintas
por subdominio; comprueba las indicaciones que muestre tu cuenta AdSense.

3. COMPLETA LA CONEXIÓN DEL SITIO EN GOOGLE

En AdSense > Sitios, abre clagambinoa.cl y sigue el método de conexión que
ofrezca Google. Si pide verificar la página principal y eliges el método
Etiqueta meta, añade dentro de <head> de tu página principal:

  <meta name="google-adsense-account" content="ca-pub-3129822340744666">

Tu página personal del dominio principal se conserva. No la reemplaces
con el index.html de QRforma. El script ya está integrado en la herramienta.

4. ACTIVA LOS ANUNCIOS AUTOMÁTICOS

En AdSense > Anuncios, edita el sitio, activa Anuncios automáticos y pulsa
Aplicar al sitio. Google decidirá ubicaciones y formatos según tu cuenta.

Este script no incluye identificadores de bloques manuales. Si quieres
anuncios en posiciones concretas, crea esos bloques en Google y utiliza
sus códigos y data-ad-slot reales. No hay identificadores inventados.

Las viñetas y los anuncios ancla se gestionan desde las opciones oficiales
de Google. No se insertan anuncios dentro de una ventana propia que se
abra al descargar, ni se exige ver o pulsar publicidad para obtener archivos.

5. PRIVACIDAD Y CONSENTIMIENTO

La política incluida describe el procesamiento local del generador y el
uso de publicidad de Google. Revísala para reflejar las prácticas reales
del responsable del sitio y sus canales de contacto.

Para monetizar tráfico del EEE, Reino Unido o Suiza, configura en AdSense
> Privacidad y mensajería el mensaje y una plataforma de consentimiento
certificada por Google, según sus requisitos vigentes. Este paquete no
incluye una plataforma de consentimiento propia ni simula una certificada.

6. COMPRUEBA EL RESULTADO

- Visita QRforma con HTTPS y comprueba el generador y las descargas.
- Abre privacidad.html desde el enlace del pie.
- Comprueba ads.txt tanto en el destino de QRforma como en el dominio raíz.
- En el código fuente de QRforma busca ca-pub-3129822340744666.
- Consulta el estado del sitio en AdSense y completa la revisión solicitada.

La integración no equivale a la aprobación del sitio ni garantiza que
Google muestre anuncios. Influyen el estado de la cuenta, los ajustes de
anuncios, el consentimiento, la disponibilidad y los bloqueadores.

Las pruebas automatizadas de esta entrega simulan o bloquean el script
de Google para comprobar la herramienta sin generar impresiones reales.

Centro de ayuda oficial y políticas de Google:
https://support.google.com/adsense/?hl=es
https://policies.google.com/technologies/ads?hl=es
https://policies.google.com/technologies/partner-sites?hl=es
