# observatorio-departamental-amazonas
Prototipo web del Observatorio Departamental del Amazonas — Secretaría de Planeación y Desarrollo Territorial.

## Pruebas automáticas

Requisitos: Node.js 22, npm y Python 3. Desde la raíz, una sola orden instala las dependencias fijadas, Chromium y ejecuta las pruebas:

```sh
npm run test:local
```

La primera ejecución requiere red para descargar dependencias y navegador. En Linux puede ser necesario `npx playwright install --with-deps chromium` para las bibliotecas del sistema. Con todo instalado, `npm test` repite la suite.

Playwright levanta un servidor HTTP exclusivo en `127.0.0.1:8765` y lo cierra al terminar. Comprueba las diez vistas, errores JavaScript, creación del mapa Leaflet, las 33 entradas y la activación/desactivación real de la capa 1. Valida los 20 archivos GeoJSON y las doce rondas 20–31 en PMTiles. La determinante 19 sigue pendiente de verificar su ubicación (#44); no se publica su geometría. Las pruebas comprueban interruptores y dibujo real por rangos en escritorio y celular.

El servidor de pruebas (`tests/serve.py`) conserva el manejo HTTP de Python y usa una cola explícita de 128 conexiones pendientes. Evita que las ráfagas de recursos de Chromium saturen la cola predeterminada de 5 en Python 3.9 y causen `ERR_CONNECTION_RESET`. Las pruebas siguen fallando ante cualquier solicitud local fallida; el diagnóstico incluye el motivo y el tipo de recurso.

El navegador usa Leaflet 1.9.4 instalado localmente. Todas las solicitudes externas se interceptan: Supabase devuelve un conjunto vacío simulado, la configuración real se sustituye y no se descargan teselas de OpenStreetMap. Esto no valida permisos de Supabase, mapas base ni servicios externos.

GitHub Actions ejecuta la misma suite en cada PR; las acciones están fijadas por SHA y el token tiene solo lectura. Los fallos conocidos se marcan individualmente con `test.fail` y una explicación: si dejan de fallar, Playwright exige retirar la marca. Nunca se ignoran globalmente errores de consola o de geometría.

La lista de capas se prueba con clic a 1280×720 y 390×844. Las regresiones de Documentos POD y Avances POD comprueban 33 documentos, 0 pendientes, ausencia de entradas con `needsPrivacyReview: true` y ausencia de enlaces públicos a `admin_borradores_v20.html`. Los resultados de ejecución se registran en el PR. CI usa Ubuntu 24.04, compatible con Playwright 1.56.1.

## Datos cartográficos para la web

Los GeoJSON de `datos/determinantes_ambientales/` se publican con 6 decimales (como máximo 8 cm de corrimiento) para que carguen en conexiones lentas. Tras agregar o reemplazar una capa autorizada en el catálogo:

```sh
python3 scripts/reducir_precision_geojson.py                         # redondea, compacta y escribe procesado.json
python3 scripts/reducir_precision_geojson.py --comprobar             # verificación rápida (la de CI)
python3 scripts/reducir_precision_geojson.py --comprobar --completo  # vuelve a procesar todo en memoria
python3 scripts/topologia_geojson.py datos/determinantes_ambientales/*/*.geojson  # validación topológica
```

- Solo procesa capas del catálogo con estado `aprobada_disponible_geojson`; rechaza cualquier otro archivo.
- No simplifica, no repara y no elimina partes. Un polígono redondeado se acepta solo si sigue siendo válido (incluido el interior conexo), si los mismos anillos siguen coincidiendo en cada punto de contacto y si ningún anillo invierte su orientación. Si no, ese polígono completo conserva sus coordenadas originales; `procesado.json` lista cuáles.
- No toca atributos, `name` ni `crs`. Conserva la Z si existe. Rechaza NaN e Infinity.
- Rechaza archivos cuyo nombre o atributos mencionen «aislamiento». Es una defensa adicional: no sustituye la revisión institucional de cada capa exigida en `AGENTS.md`.
- El validador sigue las reglas de validez de OGC/GEOS para polígonos y se contrasta con casos sintéticos en `tests/regresiones_topologia.py`. No es GEOS: ante una duda de validez, la referencia es GEOS.

## Rondas hídricas en teselas

Las determinantes 20–31 proceden de Rondas_Hidricas (Corpoamazonia 2022), cotejadas con su nombre, norma y WKB original en Determinantes_Ambientales_CAR. Las cuatro geometrías inválidas se corrigen solo en copias con MakeValid, sin desplazar vértices ni cambiar el área algebraica exacta; se conservan sus partes lineales. La 19 permanece pendiente por decisión de Alejandro (#44). No se recortan al departamento ni se simplifican antes de generar niveles de zoom.

El lector local del drenaje (#41) se comparte sin duplicar solicitudes por rango ni librería. No se descargan los archivos completos al entrar: cada interruptor activa solo sus rangos. Fuente, año, leyenda, norma, transparencia, zoom, estado y errores están en el menú. Los fragmentos de teselas no se usan para conteos ni superficies; su validez tras cuantización es distinta de la validez de la referencia nativa.

- [Método, trazabilidad, campos y reproducción](datos/rondas_43/LEEME.md).
- [Mediciones de conexión lenta y capturas de escritorio/celular](docs/rondas_43/LEEME.md).
- Comprobación sin QGIS en CI: `python3 scripts/preparar_rondas43.py --comprobar`.
