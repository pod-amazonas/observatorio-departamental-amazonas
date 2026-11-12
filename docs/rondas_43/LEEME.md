# Verificación visual y red — doce rondas

Se incluyen determinantes **20–31**; la **19 sigue pendiente** por decisión de Alejandro (#44). Las cuatro reparaciones nativas cumplen 0 m y 0 m², con partes lineales conservadas. [Método, trazabilidad y límites](../../datos/rondas_43/LEEME.md).

## Red lenta simulada

Chromium / Leaflet 1.9.4, viewports 1280×720 y 390×844, DPR 1, sin limitar CPU. **1,6 Mbit/s y 150 ms**. Caché HTTP deshabilitada, primera solicitud de cada archivo; el lector está frío solo en la primera capa (20) y se reutiliza después. Una medición por capa/tamaño, no promedios ni garantía de producción; no es hardware móvil físico.

Los tiempos van desde iniciar la pulsación del interruptor hasta finalizar la carga y dos cuadros del navegador. Se cuentan cuerpos PMTiles y lector, sin cabeceras, catálogo, CSS ni módulo de interfaz cargados antes. **Para aislar el costo de las capas, el mapa base OSM se simula con una imagen mínima durante las mediciones**: no se incluye su costo real de red. Supabase está simulado; no se consulta producción. Las capturas finales, separadas de estas mediciones, usan OSM real y red sin limitar.

Los doce archivos completos suman **22.938.210 bytes**; no se descargan juntos al entrar al Geovisor. Solo se solicitan rangos del archivo que se activa. El lector es el mismo de drenaje (#41), sin otra copia ni CDN.

### 1280 × 720

| Determinante | Zoom | Peticiones de rango | Bytes PMTiles | Bytes lector | Total al activar | Hasta dibujo |
|---:|---:|---:|---:|---:|---:|---:|
| 20 | 7 | 6 | 108.404 | 37.678 | 146.082 | 1,360 s |
| 21 | 7 | 4 | 58.193 | 0 | 58.193 | 0,716 s |
| 22 | 7 | 3 | 45.854 | 0 | 45.854 | 0,653 s |
| 23 | 8 | 6 | 97.002 | 0 | 97.002 | 0,904 s |
| 24 | 7 | 4 | 104.747 | 0 | 104.747 | 0,954 s |
| 25 | 8 | 4 | 35.720 | 0 | 35.720 | 0,604 s |
| 26 | 9 | 5 | 58.154 | 0 | 58.154 | 0,737 s |
| 27 | 7 | 4 | 50.519 | 0 | 50.519 | 0,686 s |
| 28 | 9 | 8 | 86.781 | 0 | 86.781 | 0,854 s |
| 29 | 8 | 4 | 79.426 | 0 | 79.426 | 0,834 s |
| 30 | 7 | 4 | 87.184 | 0 | 87.184 | 0,854 s |
| 31 | 8 | 5 | 102.594 | 0 | 102.594 | 0,954 s |

### 390 × 844

| Determinante | Zoom | Peticiones de rango | Bytes PMTiles | Bytes lector | Total al activar | Hasta dibujo |
|---:|---:|---:|---:|---:|---:|---:|
| 20 | 6 | 3 | 71.181 | 37.678 | 108.859 | 1,145 s |
| 21 | 6 | 3 | 45.772 | 0 | 45.772 | 0,653 s |
| 22 | 7 | 3 | 45.854 | 0 | 45.854 | 0,668 s |
| 23 | 7 | 3 | 71.505 | 0 | 71.505 | 0,780 s |
| 24 | 6 | 3 | 71.741 | 0 | 71.741 | 0,788 s |
| 25 | 7 | 3 | 30.125 | 0 | 30.125 | 0,571 s |
| 26 | 8 | 3 | 38.414 | 0 | 38.414 | 0,621 s |
| 27 | 6 | 3 | 38.822 | 0 | 38.822 | 0,636 s |
| 28 | 8 | 5 | 63.704 | 0 | 63.704 | 0,752 s |
| 29 | 7 | 3 | 63.746 | 0 | 63.746 | 0,753 s |
| 30 | 7 | 4 | 87.184 | 0 | 87.184 | 0,871 s |
| 31 | 7 | 4 | 81.161 | 0 | 81.161 | 0,854 s |

Sin errores JavaScript registrados en ambos tamaños. Los centros y métricas sin redondear están en mediciones.json. La activación ajusta la vista a la extensión completa de cada capa, como los GeoJSON del menú; las comparaciones entre capas usan distintos centros/zooms según su extensión. La medición no evalúa velocidad de una descarga completa ni precisión de límites.

## Capturas de escritorio y celular

Se muestra una ronda válida y todas las reparadas (24–27), además de la 31. Las otras siete también se activan y verifican en las pruebas automatizadas y la medición. La leyenda mantiene fuente, año y referencia normativa; las correcciones en copias y las partes lineales se declaran. No se afirma alineación certificada contra OSM.

| Determinante | Escritorio: menú | Escritorio: mapa | Celular: menú | Celular: mapa |
|---:|---|---|---|---|
| 20 | [Ver](vistas/menu_20_1280.png) | [Ver](vistas/mapa_20_1280.png) | [Ver](vistas/menu_20_390.png) | [Ver](vistas/mapa_20_390.png) |
| 24 | [Ver](vistas/menu_24_1280.png) | [Ver](vistas/mapa_24_1280.png) | [Ver](vistas/menu_24_390.png) | [Ver](vistas/mapa_24_390.png) |
| 25 | [Ver](vistas/menu_25_1280.png) | [Ver](vistas/mapa_25_1280.png) | [Ver](vistas/menu_25_390.png) | [Ver](vistas/mapa_25_390.png) |
| 26 | [Ver](vistas/menu_26_1280.png) | [Ver](vistas/mapa_26_1280.png) | [Ver](vistas/menu_26_390.png) | [Ver](vistas/mapa_26_390.png) |
| 27 | [Ver](vistas/menu_27_1280.png) | [Ver](vistas/mapa_27_1280.png) | [Ver](vistas/menu_27_390.png) | [Ver](vistas/mapa_27_390.png) |
| 31 | [Ver](vistas/menu_31_1280.png) | [Ver](vistas/mapa_31_1280.png) | [Ver](vistas/menu_31_390.png) | [Ver](vistas/mapa_31_390.png) |

Las pruebas recorren las doce capas con teclado en ambos tamaños: interruptor, descarga por rangos, píxeles realmente dibujados, fuente/año/norma/leyenda, transparencia, zoom, limpieza y ausencia de controles duplicados. Comprueban además error HTTP 200 sin continuar descarga completa, reintento, cancelación sin reactivación tardía y ruta con prefijo de GitHub Pages. Drenaje y rondas se activan juntos con una sola carga del lector.

## Reproducción y publicación

Las mediciones se hicieron con un servidor local de rangos (el mismo protocolo que tests/serve.py) y compresión gzip de JS/JSON; los PMTiles ya van comprimidos internamente. No se usa servidor de tiles externo ni se cambia infraestructura de Actions. Las capturas no se usan para validar foco: la prueba de foco mantiene su recorrido real por Tab, sin scrollIntoView para ocultar problemas.

Los nuevos archivos no están desplegados mientras el PR siga abierto. Tras la fusión debe comprobarse la URL definitiva de una ronda en Pages con HTTP 206/Content-Range; el lector cancela un 200 y muestra un error en vez de continuar una descarga completa. La publicación del drenaje en Pages ya fue confirmada por Alejandro.
