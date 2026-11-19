# observatorio-departamental-amazonas
Versión pública inicial del Observatorio Departamental del Amazonas — Secretaría de Planeación y Desarrollo Territorial.

Versión inicial · en actualización permanente. Decisión de Alejandro y el equipo POD, 19 de noviembre de 2026. Las cifras calculadas en el navegador no son oficiales.

## Pruebas automáticas

Requisitos: Node.js 22, npm y Python 3. Desde la raíz, una sola orden instala las dependencias fijadas, Chromium y ejecuta las pruebas:

```sh
npm run test:local
```

La primera ejecución requiere red para descargar dependencias y navegador. En Linux puede ser necesario `npx playwright install --with-deps chromium` para las bibliotecas del sistema. Con todo instalado, `npm test` repite la suite.

Playwright levanta un servidor HTTP exclusivo en `127.0.0.1:8765` y lo cierra al terminar. Comprueba las diez vistas, errores JavaScript, creación del mapa Leaflet, las 33 entradas y la activación/desactivación real de la capa 1. Valida los 20 archivos GeoJSON y las trece rondas 19–31 reunidas en una capa PMTiles. La determinante 19 conserva la geometría de Determinantes_Ambientales_CAR; la diferencia de unos 53 m con Rondas_Hidricas se documenta sin corregirla (#44). Las pruebas comprueban interruptores y dibujo real por rangos en escritorio y celular.

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

Las determinantes 20–31 proceden de Rondas_Hidricas (Corpoamazonia 2022), cotejadas con su nombre, norma y WKB original en Determinantes_Ambientales_CAR. Las cuatro geometrías inválidas se corrigen solo en copias con MakeValid, sin desplazar vértices ni cambiar el área algebraica exacta; se conservan sus partes lineales. Por decisión POD del 18 de noviembre, se incorpora la 19 desde Determinantes_Ambientales_CAR (OBJECTID 19), sin ajustes; la discrepancia de unos 53 m es una observación técnica (#44). No se recortan al departamento ni se simplifican antes de generar niveles de zoom.

El lector local del drenaje (#41) se comparte sin duplicar solicitudes por rango ni librería. No se descargan los archivos completos al entrar: cada interruptor activa solo sus rangos. Fuente, año, leyenda, norma, transparencia, zoom, estado y errores están en el menú. Los fragmentos de teselas no se usan para conteos ni superficies; su validez tras cuantización es distinta de la validez de la referencia nativa.

- [Capa única, trazabilidad SHA-256, campos y reproducción](datos/rondas_46/LEEME.md).
- [Estado de verificación de escritorio/celular y conexión lenta](docs/rondas_46/LEEME.md).

Las trece determinantes comparten un solo interruptor y una plaza de las ocho capas. Tocar un polígono permite consultar su número; con teclado puede consultarse el centro del mapa. La unión conserva literalmente los comandos MVT publicados por el #45, sin volver a teselar. La ayuda distingue 33 de 33 registros disponibles, reunidos en 21 capas de determinantes, y cero pendientes.

- Comprobación sin QGIS en CI: `python3 scripts/preparar_rondas43.py --comprobar`.

## Tanda 4 de la ampliación #29

Reservas forestales nacionales y Humedales se consultan por teselas con el lector del #41, sin recorte ni simplificación previa. La reparación autorizada de Humedales conserva 3.079 polígonos y da 0 m / 0 m² en el control exacto; la atribución IAvH/MADS queda por confirmar. Se agregan ocho aeropuertos como copia fiel, con aviso visible de ubicación aproximada (#48), y una tabla categórica de servicios públicos por código territorial, sin nuevas geometrías. Producción agrícola y pecuaria quedan pendientes en #29 hasta confirmar unidad y año con la fuente (opción B del PR #49). Los metadatos de servicios no acreditados se muestran «por confirmar».

- [Entrega, fuentes, diccionario, huellas y reparación](datos/tanda_4_29/LEEME.md).
- [Comprobaciones de escritorio, celular y red lenta](docs/tanda_4_29/LEEME.md).
- Comprobación sin QGIS: `python3 scripts/preparar_tanda4_29.py`; pruebas específicas: `npx playwright test tests/tanda4.spec.js`.

## Tanda 5: amenazas históricas y zonas estudiadas

Se incorporan Amenaza_Incendios_Forestales (IDEAM 2010, sin información de incendios activos) y Amenaza_Remocion_Masa (fecha 2022 declarada en ficha POD 085, solo zonas estudiadas). Se entregan en PMTiles bajo demanda, con colores por categoría y el lector local existente. Las 140 geometrías originales son válidas y no se repararon.

El índice municipal de riesgo, las dos clasificaciones de suelo y Determinantes_OT quedan pendientes en #29 por metadatos/instrumentos sin acreditar. Territorios Colectivos queda fuera hasta revisión institucional de sensibilidad; no se preparan ubicaciones.

- [Entrega, fuentes, SHA-256, diccionario y pendientes](datos/tanda_5_29/LEEME.md).
- [Vistas y mediciones de escritorio/celular y red lenta](docs/tanda_5_29/LEEME.md).
- Comprobación sin GIS: `python3 scripts/preparar_tanda5_29.py`.

### Lectura ciudadana del Geovisor

Cada capa presenta una descripción breve, fuente, año y advertencias. La **Ficha técnica** plegable conserva los metadatos originales, identificadores, rutas públicas, observaciones y métodos de preparación. Las capas que se consultan por zonas muestran **—** en el conteo: no se interpretan las figuras de cada nivel de zoom como registros. Estas mejoras de presentación no alteran datos ni geometrías.
