# Versión pública inicial — verificación

Decisión de Alejandro y el equipo POD del 19 de noviembre de 2026. Rama desde main `5a8dfed` (#56). No se cambian datos, geometrías, la matriz de 57 indicadores ni dependencias.

## Interfaz y disponibilidad

El aviso es «Versión inicial · en actualización permanente». Se conserva que las cifras calculadas en el navegador no son oficiales. Certificados es una página informativa, con el aviso «La solicitud en línea estará disponible próximamente». El formulario anterior, V16 y los roles locales se conservan ocultos e inertes, fuera de la navegación pública. El panel autenticado V20 conserva su funcionamiento y acceso directo.

El Geovisor prioriza el mapa, con capas plegables e instrucciones breves. Herramientas, leyenda, estadísticas y archivos locales se pueden desplegar. Se conservan consulta, medición, importación, transparencia, zoom, limpieza y fichas. Las coordenadas siguen visibles bajo el mapa.

Pantalla completa usa la API del navegador cuando está disponible; si no existe o rechaza el permiso, amplía el visor dentro de la ventana. Incluye salida con Escape/botón, recorrido de teclado dentro del visor, restauración del foco y del desplazamiento y salida al cambiar de sección. En celular pliega las capas al ampliar y restaura su estado al salir. No se afirma haber ensayado Safari físico; el respaldo se comprueba en Chromium.

## Caché y fidelidad

Todos los rangos de cada PMTiles usan `?v=<SHA-256 del catálogo>`, incluida la clave del lector/caché. No se usa fecha aleatoria. Los catálogos se revalidan con `cache: no-cache`. Si falta un SHA-256 válido, no se descarga el archivo y se muestra el error con detalle técnico. Se conservan la validación de HTTP 206, rangos, ETag, cancelación y reintentos.

El parámetro identifica la versión publicada; no equivale a calcular el hash completo a partir de descargas parciales. Los archivos se siguen verificando con sus manifiestos y las comprobaciones de integridad existentes.

## Red lenta

Una observación por capa y pantalla (12 en total): Chromium, 1280×720 y 390×844, 1,6 Mbit/s, 150 ms, caché HTTP deshabilitada y contexto nuevo. Se mide desde activar hasta comprobar la carga y los píxeles dibujados. Servidor local con rangos reales y JS/JSON comprimidos; mapa base y Supabase simulados. No son promesas de tiempo en teléfono físico o GitHub Pages. El lector compartido frío añade 37.678 bytes por contexto.

| Capa | Pantalla | Bytes de capa | Tiempo (s) |
|---|---|---:|---:|
| drenaje_doble | Escritorio | 80.868 | 2,076 |
| rondas | Escritorio | 428.045 | 3,454 |
| reserva_forestal_ley_2da | Escritorio | 39.867 | 1,107 |
| humedales | Escritorio | 58.541 | 1,593 |
| amenaza_incendios_forestales | Escritorio | 25.470 | 1,130 |
| amenaza_remocion_masa | Escritorio | 47.921 | 1,075 |
| drenaje_doble | Celular | 78.681 | 2,092 |
| rondas | Celular | 428.045 | 4,107 |
| reserva_forestal_ley_2da | Celular | 38.540 | 1,095 |
| humedales | Celular | 58.541 | 2,036 |
| amenaza_incendios_forestales | Celular | 25.470 | 1,096 |
| amenaza_remocion_masa | Celular | 47.921 | 2,273 |

Todas las peticiones fueron HTTP 206 y llevaron el SHA-256 esperado; ninguna capa quedó sin dibujar y no hubo errores JavaScript. [Mediciones completas](rendimiento.json).

## Capturas

Se usa un fondo neutro que sustituye el mapa externo; las geometrías de drenaje sí corresponden al archivo público. Las capturas comprueban la distribución, no sustituyen la auditoría de fidelidad cartográfica.

- [Escritorio](vistas/mapa_1280.png) y [pantalla completa](vistas/pantalla_completa_1280.png).
- [Celular](vistas/mapa_390.png) y [pantalla completa](vistas/pantalla_completa_390.png).

## Comprobaciones

`tests/version58.spec.js` comprueba las diez vistas, los avisos, mapa de más de la mitad de la altura y más del 65 % de anchura, panel plegable, herramientas, pantalla completa nativa y sin API en ambos tamaños, teclado/escape/cambio de ruta, conservación del estado, cambio de URL al actualizar SHA-256 y rechazo de versiones ausentes. Las pruebas de foco mantienen sus aserciones de contraste y anillo pintado; las pruebas de rangos y errores reconocen el parámetro sin omitir fallos. La suite final y Actions/Gitleaks se registran en el PR.

Tras la revisión de Claude y la incorporación de main con #51 (`be8d973`): **194 pruebas aprobadas** con `npm test -- --workers=2` (3,5 minutos). Actions y Gitleaks del commit del PR se registran en su descripción. [Correcciones de la revisión, capturas de Certificados y mediciones de las dos capas incorporadas](revision59.md).
