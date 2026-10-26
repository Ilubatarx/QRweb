# QRforma

Generador de códigos QR para imprimir en 3D. Sin registro ni servidor de aplicación: los enlaces, las contraseñas wifi, los logos y los modelos se procesan en el navegador.

## Desarrollo

Requiere Node.js 24 y npm. Cada tarea cloud ya está aislada: utiliza este checkout existente; no hace falta crear un worktree.

```sh
cd /workspace/QRweb
npm ci --cache /workspace/.npm-cache
npm run dev -- --port 5173 --strictPort
```

Para construir y servir la versión de producción:

```sh
npm run build
npm run preview -- --port 4173 --strictPort
```

La compilación genera `dist/` y prerenderiza la portada, la herramienta, el contenido y las FAQ. Las fuentes se sirven localmente. No se necesitan variables de entorno, claves, base de datos ni servicios externos para utilizar la herramienta.

## Funciones

- QR estáticos para enlaces, reseñas, perfiles de Instagram y redes wifi (incluye escape de caracteres especiales).
- Corrección de errores alta y margen de cuatro módulos.
- Soporte de mesa con pie conectado, llavero con agujero y placa con dos agujeros de montaje.
- Ancho ajustable, dos colores, puntos cuadrados/suaves/redondos, texto y logo o emoji central.
- Vista 3D real con giro, zoom, reinicio y ampliación; vista 2D del QR.
- 3MF, STL binario, PNG de 2048 píxeles y SVG con los mismos diseños.
- Avisos de contraste y de módulos demasiado pequeños para una boquilla de 0,4 mm.
- Placeholders de anuncios horizontales, intermedio, notificación y diálogo de descarga con cierre. No hay anuncios ni rastreadores reales.
- Diseño responsive, navegación por teclado, diálogo con control de foco y respeto por movimiento reducido.
- HTML prerenderizado, metadatos, datos estructurados WebApplication/FAQPage y robots.txt.

## 3MF y preparación de la impresión

El 3MF es un paquete ZIP/OPC en milímetros. Contiene dos objetos de malla cerrada (`Base` y `QR y texto`) ensamblados en un solo objeto, con materiales base y colores RGBA estándar. El archivo añade metadatos opcionales para asignar los extrusores 1 y 2 y los colores de filamento siguiendo las convenciones de Bambu Studio. No incluye ajustes de una impresora concreta.

Se verifica que el lector 3MF de Three.js recupera ambas mallas y ambos colores. La interpretación y asignación automática de filamentos depende del laminador y su versión; no se han certificado Bambu Studio, OrcaSlicer, PrusaSlicer o Cura mediante una prueba de impresión. Si es necesario, asigna manualmente los dos materiales a las piezas identificadas. El STL no conserva colores.

El soporte de mesa imprime de pie. Para obtener sus colores durante la impresión hace falta un sistema multimaterial; como alternativa se puede pintar el relieve. El llavero y la placa se orientan en plano y permiten un cambio de filamento por altura. El QR y el texto tienen 0,8 mm de relieve en el tamaño de referencia; todas las dimensiones escalan proporcionalmente con el ancho elegido.

Los emojis y logos se convierten en un relieve monocromo simplificado en 3D. Las versiones PNG y SVG conservan la imagen original del símbolo. Usa una base clara, un QR oscuro, filamento opaco y al menos 0,8 mm por módulo con una boquilla de 0,4 mm. Los controles de pantalla no sustituyen escanear una impresión física de prueba.

## Validación

```sh
npm test
# Con el servidor de desarrollo en el puerto 5173:
npm run test:browser
```

Las pruebas de navegador requieren Chromium. Se usa `/usr/bin/chromium` por defecto; puedes indicar `CHROMIUM_PATH` y, si cambias el puerto del servidor, `TEST_URL`.

Se comprueban la decodificación con un lector independiente (`jsQR`), las descargas reales, los materiales 3MF, las mallas sin bordes abiertos, los agujeros, el volumen positivo y la estructura STL. También se prueban wifi, logos, giro con ratón, contraste, el cierre de anuncios y la ausencia de desbordamientos entre 320 y 1440 px.

## Publicación

Es una web estática y no necesita un backend.

- **ihost / cPanel:** ejecuta `npm run package:hosting`. El script genera `qrforma-ihost.zip` listo para subir, con rutas relativas que funcionan en un dominio, subdominio o subcarpeta. Incluye una guía de instalación y genera por separado `qrforma-codigo.zip`. Los paquetes se guardan en la carpeta superior del proyecto; `QRFORMA_PACKAGE_DIR` permite elegir otro destino. Sigue [la guía de cPanel](docs/INSTALAR-IHOST.md).
- **GitHub Pages:** el workflow `.github/workflows/deploy.yml` compila y publica al hacer push a `main`. En el repositorio, activa **Settings → Pages → Build and deployment → Source: GitHub Actions**. El workflow calcula la ruta base del proyecto automáticamente. La URL de despliegue la devuelve el paso `actions/deploy-pages` cuando termina correctamente.
- **Netlify:** conecta el repositorio; `netlify.toml` incluye la compilación y la carpeta `dist`. También puedes subir directamente el contenido de `dist` a Netlify Drop.
- **Vercel:** importa el repositorio; `vercel.json` configura Vite y `dist`.

La publicación requiere acceso a uno de esos servicios. Un build correcto o un push al repositorio no confirma que exista una web pública. Después del despliegue, comprueba la portada, el giro 3D y una descarga desde el dominio asignado. Cuando haya un dominio definitivo, añade su URL canónica y sitemap.

Después de generar el paquete, `npm run test:hosting` sirve el ZIP real en la raíz y en una subcarpeta para comprobar sus archivos y sus descargas, sin depender del servidor de desarrollo.

## Estructura

- `src/App.jsx`: editor, contenido, estados y descargas.
- `src/Preview.jsx`: escena Three.js y controles de giro.
- `src/qr.js`: datos wifi, matriz QR, SVG y contraste.
- `src/model.js`: geometría, símbolo en relieve y exportación 3MF/STL.
- `scripts/prerender.mjs`: HTML de producción para buscadores.
- `tests/`: comprobaciones unitarias y de navegador.

React + Vite + Three.js + qrcode + fflate. Instalación reproducible mediante `package-lock.json` y `npm ci`.
