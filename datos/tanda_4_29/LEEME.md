# Tanda 4 — ampliación del piloto #29

Entrega autorizada por Alejandro. Prototipo de consulta; no certifica límites, superficies, restricciones prediales, vigencia normativa ni operación de instalaciones. La geodatabase original se abre con OpenFileGDB en lectura y permanece intacta. Solo se publican campos incluidos expresamente en el diccionario; se excluyen contactos, identificadores personales y desagregaciones étnicas. No se procesa la capa de pueblos en aislamiento voluntario.

## Contenido y procedencia

| Capa | Entrega | Fuente y año declarados | Advertencia |
|---|---|---|---|
| Reserva_Forestal_Ley_2da | 7 entidades nacionales completas; PMTiles de 2.922.308 bytes | MADS-SIAC; compilación POD 2022, crédito SIAC septiembre de 2021 | Sin selección ni recorte departamental. Incluye Amazonas y las otras seis reservas. No equivale a la zonificación A/B ni certifica vigencia. |
| Humedales | 1 MultiPolygon con 3.079 polígonos; PMTiles de 2.375.595 bytes | El encargo indica IAvH; el metadato cita MADS 2018; compilación POD 2022 | Atribución y año por confirmar, visibles en el menú. Copia reparada autorizada según el apartado siguiente. |
| Aeropuerto | 8 puntos en GeoJSON RFC 7946; 1.722 bytes | IGAC, compilación POD 2022 | Ubicación aproximada, sin datos de operación ni garantía de acceso público; #48 sigue abierto. |
| Estado_ServPublicos_ANM | 11 filas, 7 campos de valores | Compilación POD 2022; metadato cita Alcaldía de Leticia | Año de observación por confirmar. Categorías textuales originales, incluidas «No Aplica»; definiciones por confirmar. |

La tabla categórica de servicios públicos, menor de 1 MB, conserva valores, nulos y categorías originales; no calcula nuevos indicadores. No contiene geometrías: se une por `MpCodigo` a las once unidades de la División publicada en el #31. «Unidad territorial» incluye áreas no municipalizadas; no se afirma que las once sean municipios. Se comprueban códigos únicos y coincidencia exacta con la base, cuya huella SHA-256 se incluye en la tabla. El navegador reutiliza esa geometría sin crear copias superpuestas.

Producción agrícola y pecuaria quedan fuera de esta entrega por la opción B de Alejandro en el PR #49. Su publicación queda pendiente en #29 hasta confirmar con ENA / Ministerio de Agricultura el año de referencia y la unidad de cada indicador, con respaldo de la fuente. No se entregan sus tablas ni sus cifras.

## Aeropuertos: selección y límites

De 63 registros, se publican exclusivamente los ocho que intersectan `departamento_amazonas`, código 91, conservando el punto completo: FID 1, 3, 400, 401, 402, 403, 405 y 406. Se excluyen preventivamente instalaciones restringidas y nombres insuficientes antes de procesar su geometría. Solo se entregan `NOMBRE_GEOGRAFICO`, `FECHA` literal y el FID como `Feature.id`; no se publican horarios, frecuencias, estado operativo ni otras condiciones de navegación. `FECHA` no es una verificación de operación actual.

La comparación aproximada por distancia haversine con referencias publicadas de Aerocivil encuentra diferencias de 942 a 5.727 m (aproximadamente 0,9–5,7 km). No se conoce su causa. Alejandro autorizó conservar estos puntos fieles y mostrar un aviso visible en menú y ventana emergente: **no sirven para localizar accesos, navegar ni confirmar operación, horarios o disponibilidad actual; no garantizan acceso público**. No se sustituye ninguna coordenada. La clasificación de aviación general no significa acceso público.

Referencias de contraste, sin copiar datos operativos: [AIP AD 1.3](https://eaip-colombia.atnaerocivil.gov.co/eaip/A%2073-26_2026_10_01/eAIP/AD%201.3-es-CO.html), [AIP SKLT](https://eaip-colombia.atnaerocivil.gov.co/eaip/A%2073-26_2026_10_01/eAIP/AD%202%20SKLT%20-%20LETICIA%20-%20ALFREDO%20VASQUEZ%20COBO-en-US.html). El control resumido, método, correspondencias y distancias están en `control_aeropuertos.json`. La discrepancia permanece en el [issue #48](https://github.com/pod-amazonas/observatorio-departamental-amazonas/issues/48).

## Reparación autorizada de Humedales

La entidad FID 1 era inválida por autointersección de anillo. Se aplicó únicamente sobre una copia `OGR_G_MakeValidEx` con `METHOD=LINEWORK`, equivalente a GEOS MakeValid/ST_MakeValid: GDAL **3.13.3**, GEOS **3.14.1 (CAPI 1.20.5)** incluidos en QGIS, sin instalar dependencias. Se trabajó en MAGNA CTM12 (metros), antes de reproyectar o teselar, sin snap, buffer, simplificación ni descarte de partes. Las siete reservas ya eran válidas y no se repararon.

| Control nativo | Antes | Después |
|---|---:|---:|
| Tipo | MultiPolygon inválido | MultiPolygon válido |
| Polígonos | 3.079 | 3.079 |
| Anillos | 3.678 | 3.706 |
| Posiciones, incluidos cierres | 786.604 | 786.632 |
| Vértices únicos | 782.728 | 782.728 |
| Segmentos no orientados con multiplicidad | 782.926 | 782.926 |

Los 28 cierres adicionales repiten coordenadas existentes: no se añade, elimina ni desplaza ningún vértice único o segmento. **Desplazamiento máximo: 0 m. Diferencia de área algebraica racional exacta: 0/1 m²**. Se calcula por shoelace sobre los doubles originales con aritmética racional; el área algebraica de una entrada inválida no es una superficie OGC acreditada ni una cifra oficial. La suma flotante de GDAL cambia **−0,0013580322265625 m²** por el orden de acumulación al separar anillos; se conserva este resultado, sin redondearlo a cero ni confundirlo con un cambio territorial.

`reparacion_humedales.json` registra la autorización, métricas, versiones y hashes WKB antes/después. `control_geometrias.json` comprueba la igualdad WKB de la copia nativa releída del GeoPackage con la geometría adoptada. Para las reservas, las huellas original y usada coinciden. Se comprueban también tamaños y fechas de modificación de los archivos de la fuente antes/después: no se afirma una comparación byte a byte de toda la geodatabase. Las copias WKB, GeoPackage y GeoJSON de análisis no se suben al repositorio.

## Teselas: mismo método del #41

Los GeoJSON fieles completos ocuparían 33.116.300 y 32.012.222 bytes (reservas y humedales respectivamente); se entregan PMTiles, no esos archivos. GDALVectorTranslate reproyecta desde la referencia nativa a EPSG:3857 y genera una capa MVT por archivo. No hay recorte departamental ni simplificación previa. Parámetros: `MINZOOM=5`, `MAXZOOM=12`, `EXTENT=4096`, `BUFFER=80`, `SIMPLIFICATION=1` en zoom 5–11, `SIMPLIFICATION_MAX_ZOOM=0` en zoom 12. No se cambia la representación nativa para conseguir un peso máximo; el presupuesto de 1 MB motivó el formato por teselas, no la descarga completa.

| Zoom | Metros de Web Mercator por unidad MVT | Simplificación (unidades) |
|---:|---:|---:|
| 5 | 305,748 | 1 |
| 6 | 152,874 | 1 |
| 7 | 76,437 | 1 |
| 8 | 38,219 | 1 |
| 9 | 19,109 | 1 |
| 10 | 9,555 | 1 |
| 11 | 4,777 | 1 |
| 12 | 2,389 | 0 |

MVT exige cuantización y fragmentación por tesela, incluso con simplificación cero. Estas celdas no son una garantía de desplazamiento máximo ni precisión terrestre. Se conservan las referencias nativas válidas para control, pero los fragmentos cuantizados no reconstruyen exactamente la fuente; no se usan para calcular áreas ni contar entidades. Por encima del zoom 12 se amplía la tesela disponible, sin prometer más detalle.

`auditoria_teselas.json` decodifica todos los fragmentos con Python estándar y verifica capa única, campos públicos sin cambios y presencia de todos los FID en cada zoom 5–12. Los fragmentos no se confunden con el número de entidades. No se atribuye validez GEOS nativa a cada fragmento cuantizado. `SHA256SUMS` cubre todos los archivos del paquete público excepto el propio manifiesto.

## Reproducción y comprobación

Se necesita la fuente autorizada y las bibliotecas ya incluidas en QGIS para preparar; CI no las necesita para comprobar. Los argumentos siguientes son nombres simbólicos, sin rutas del equipo:

```sh
python3 scripts/preparar_tanda4_29.py --fase preparar --privado CARPETA_ANALISIS --gdb FUENTE_GDB --gdal-library LIBGDAL --geos-library LIBGEOS
python3 scripts/preparar_tanda4_29.py --fase integrar --privado CARPETA_ANALISIS
python3 scripts/preparar_tanda4_29.py
```

La fase de preparación requiere los controles privados de selección, atributos públicos y reparación evaluada previamente; falla si no coinciden sus huellas autorizadas o si una reserva resulta inválida. No repara automáticamente nuevas entradas. La copia de análisis permanece fuera del repositorio. Si el disco desaparece, se detiene sin reintentos.

El menú reutiliza el lector local del #41 y las consultas municipales del #36. Cada capa tiene interruptor, fuente/año, leyenda, transparencia, zoom, estado y error/reintento. Los PMTiles se leen por rangos HTTP 206 solo al activar; la vista inicial se conserva para evitar alejar el departamento hasta el ámbito nacional de las reservas. Las evidencias de escritorio, celular y red lenta se registran en `docs/tanda_4_29/LEEME.md` y en el PR.

El botón de zoom de estas dos capas encuadra sin animación y mantiene un mínimo de zoom 5, para no ocultar las teselas al intentar abarcar el ámbito nacional en una pantalla pequeña. Puede quedar territorio fuera de la ventana: se explora desplazando el mapa. Evita además que un zoom anterior termine después de cambiar rápidamente de capa.
