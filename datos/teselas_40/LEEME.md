# Drenaje doble en PMTiles — 92 entidades

POC autorizada en #40 y opción B de Alejandro en el PR #41 (11 de noviembre de 2026). Incluye los 92 registros que intersectan el departamento de Amazonas, completos, sin recortar a su límite. Río Caquetá (FID 484) y Río Putumayo (2165) se corrigieron exclusivamente en copias con MakeValid; los originales siguen intactos. Las 92 geometrías de referencia son válidas para GEOS. No es una entrega hidrográfica oficial ni una certificación del inventario completo de ríos.

## Origen y custodia

Drenaje_Doble tiene 1.578 registros de varias regiones, no únicamente Amazonas. La selección se comprobó por intersección con departamento_amazonas, código 91, ya publicado. La geodatabase se abrió con OpenFileGDB en lectura. Solo se entrega el PMTiles derivado; las copias originales WKB y la referencia GeoJSON permanecen fuera del repositorio.

Fuente/año: IGAC 2022 según ficha POD 013. Es el año declarado por la ficha, no una fecha de observación acreditada para cada registro. Se excluyen PROYECTO, fechas de relleno, simbología y atributos ajenos a la consulta. Únicos campos públicos en las teselas: NOMBRE_GEOGRAFICO y origen_id (FID de origen, repetible entre fragmentos de tesela).

## Procedimiento reproducible

Se usaron exclusivamente GDAL 3.13.3 y GEOS 3.14.1 incluidos en QGIS, mediante su API C desde Python estándar. No se instaló software. scripts/preparar_pmtiles40.py recibe la fuente, bibliotecas y carpeta privada mediante argumentos; no contiene rutas del equipo. Se configura PROJ_DATA al directorio de la base PROJ incluida en QGIS cuando el entorno no la detecte.

```text
python3 scripts/preparar_pmtiles40.py --gdb FUENTE_GDB --privado CARPETA_PRIVADA --gdal-library LIBGDAL --geos-library LIBGEOS
python3 scripts/auditar_pmtiles40.py --gdal-library LIBGDAL --geos-library LIBGEOS
python3 scripts/preparar_pmtiles40.py --comprobar
```

El preparador detiene el proceso si falta la fuente, cambia la cantidad de seleccionados o aparece otra geometría inválida fuera de los dos FID autorizados. No reintenta el disco en bucle. La comparación inversa conserva las posiciones de la referencia linealizada con residuo numérico inferior a 0,000001 m; no equivale a precisión geográfica de la fuente. Los SHA-256 de las geometrías nativas seleccionadas y de la referencia quedan en catalogo.json. SHA256SUMS cubre el paquete público completo.

## Corrección autorizada de Caquetá y Putumayo

Se utiliza `OGR_G_MakeValidEx` con `METHOD=LINEWORK`, operación GEOS MakeValid equivalente a ST_MakeValid, con **GDAL 3.13.3 y GEOS 3.14.1 (CAPI 1.20.5)**. Se aplica solo a FID 484 y 2165 en copias MultiPolygon, en MAGNA CTM12 (metros), antes de reproyectar y de generar teselas. Estos dos originales no contienen curvas: la comparación de su reparación es contra sus vértices y segmentos nativos, sin linealización. No se aplica simplificación, redondeo, snap, buffer(0), ni reasignación de coordenadas en esta operación.

Ambos pasan de inválidos a válidos y permanecen MultiPolygon. Se comprueba igualdad exacta de conjuntos de coordenadas y de segmentos no orientados con multiplicidad, usando los doubles originales. **No se mueve, añade ni elimina ninguna coordenada única ni segmento.** Cada reparación divide un anillo en dos y repite una coordenada de cierre: aumenta en una la cantidad de posiciones almacenadas, sin crear un vértice nuevo.

| Control en SRC nativo | Caquetá 484 | Putumayo 2165 |
|---|---:|---:|
| Posiciones antes → después (incluye cierres) | 63.550 → 63.551 | 90.307 → 90.308 |
| Vértices únicos antes = después | 63.273 | 89.812 |
| Polígonos antes → después | 2 → 2 | 4 → 4 |
| Anillos antes → después | 276 → 277 | 491 → 492 |
| Desplazamiento máximo de vértices | **0 m** | **0 m** |
| Área algebraica original / área reparada (m²) | 1.013.008.021,8382213 | 1.075.864.576,1442492 |
| Diferencia de área, cálculo racional exacto | **0 m²** | **0 m²** |

El área original de una geometría inválida no es una superficie OGC acreditada: se informa como suma algebraica de exteriores menos huecos. Se calcula por shoelace con aritmética racional exacta sobre los doubles, y se conserva numerador/denominador en reparaciones.json. La suma exacta es idéntica tras reparar. La API de área de GDAL da diferencias aproximadas de +0,000521 m² y −0,001083 m² por la acumulación float al reordenar anillos; también se guardan sus valores, sin presentarlas como cambios del territorio. No son áreas oficiales ni geodésicas.

`reparaciones.json` registra método, versiones, validez y SHA-256 antes/después. Los originales se releen y sus WKB deben conservar el hash; los tamaños y mtime de todos los archivos de la geodatabase deben coincidir antes/después. Se abre OpenFileGDB sin permiso de actualización. No se afirma haber comparado byte a byte toda la geodatabase. Las copias originales y reparadas permanecen privadas fuera del repositorio.

`control_90_previo.json` fija las huellas WKB y de cada Feature de la referencia anterior (commit 28f6e74). El preparador exige igualdad para las otras 90 entidades, incluidos atributos públicos y coordenadas, y falla si otra precisa reparación. `--comprobar` valida este control, las dos reparaciones autorizadas y el manifiesto sin requerir QGIS en CI. Los tests de conservación detectan un vértice movido, segmentos reconectados, pérdida de partes y reparación de un FID no autorizado.

La auditoría MVT confirma que **484 y 2165 aparecen en todos los niveles 5–12**. El rótulo «prueba incompleta» se retira solo después de verificar las 92 referencias válidas y su inclusión; permanece la advertencia de corrección en copias y de uso exclusivamente visual. Esta reparación no cambia los parámetros de generalización por zoom ni repara fragmentos cuantizados de las teselas.

Fuentes del método: [GEOS MakeValid](https://libgeos.org/doxygen/classgeos_1_1operation_1_1valid_1_1MakeValid.html), [API vectorial GDAL](https://gdal.org/en/stable/api/vector_c_api.html).

## Curvas, niveles y tolerancia

74 de las 92 geometrías contienen curvas. MVT y Leaflet necesitan segmentos: GDAL las linealiza con paso angular máximo configurado de 4° y OGR_ARC_MAX_GAP de 25 m, en el SRC nativo MAGNA CTM12. Esta conversión de representación se documenta aparte: **la referencia para la comparación usa la misma linealización; no constituye una comparación exacta contra las curvas analíticas**. No se aplica una simplificación previa ni se eliminan vértices lineales de la referencia. Los anillos se orientan conforme a RFC 7946 al exportar la referencia, sin cambiar su trazo.

GDALVectorTranslate genera PMTiles/MVT en EPSG:3857, zoom 5–12, EXTENT=4096 y BUFFER=80. La simplificación es 1 unidad de tesela en zoom 5–11 y 0 en zoom 12. Aun con simplificación 0 queda la cuantización obligatoria de coordenadas enteras MVT. El tamaño de una celda no es una garantía del desplazamiento máximo continuo. Los valores siguientes son metros de Web Mercator, no distancias terrestres certificadas; la escala local varía con la latitud.

| Zoom | Metros Mercator/unidad | Simplificación en unidades |
|---:|---:|---:|
| 5 | 305,748 | 1 |
| 6 | 152,874 | 1 |
| 7 | 76,437 | 1 |
| 8 | 38,219 | 1 |
| 9 | 19,109 | 1 |
| 10 | 9,555 | 1 |
| 11 | 4,777 | 1 |
| 12 | 2,389 | 0 |

MAX_SIZE=100.000.000 bytes y MAX_FEATURES=200.000 evitan reducciones adicionales por límites de presupuesto. La tesela comprimida más grande mide 44.872 bytes, muy por debajo de ese límite. No se reducen geometrías de la referencia para llegar a un peso objetivo. El archivo completo pesa 2.847.111 bytes; la referencia 81.493.852 brutos / 29.820.647 gzip.

## Auditoría y límites de uso

El archivo contiene 2.135 teselas. auditoria_teselas.json lee cada zoom con CLIP=NO, evitando que el lector vuelva a recortar el búfer. Una entidad puede figurar en varias teselas; sus fragmentos no son registros originales distintos.

| Zoom | IDs de origen representados | Fragmentos no válidos para GEOS |
|---:|---:|---:|
| 5 | 90 | 40 |
| 6 | 91 | 47 |
| 7 | 91 | 54 |
| 8 | 92 | 45 |
| 9 | 92 | 16 |
| 10 | 92 | 1 |
| 11 | 92 | 1 |
| 12 | 92 | 7 |

La cuantización y generalización visual pueden colapsar elementos muy pequeños o producir fragmentos que no cumplen validez OGC. No se reparan. Por ello la POC es **solo para visualizar**: no se reconstruyen entidades, no se cuentan ríos o fragmentos como registros y no se calculan áreas ni superficies con estas teselas. Al superar zoom 12 se amplía la representación existente, sin obtener más precisión. No acredita navegabilidad, límites, actualidad ni ubicación exacta de la cartografía original. La comparación con la referencia evalúa el cambio de representación, no certifica la fuente.

## Cliente local y alojamiento

Se propone y usa protomaps-leaflet 5.1.0 (BSD-3-Clause) en vendor/, con bundle y mapa de fuentes originales fijados por SHA-256 y avisos de dependencias permisivas. Está en mantenimiento y dibuja en canvas sin consulta individual. No usa CDN, estilos de mapa base, glifos ni datos externos nuevos. El lector y el archivo PMTiles se solicitan solo al encender la capa. La ficha ligera se carga antes para habilitar el menú.

El menú muestra advertencia, fuente/año, leyenda, interruptor con texto, transparencia y centro departamental. Los estados de carga, cancelación y error no se presentan como una carga vacía exitosa. La limpieza general elimina también esta capa. No se suman fragmentos al conteo de registros del visor.

Se exige HTTP 206 con Content-Range exacto. Si el servidor devuelve 200, se cancela el cuerpo y se muestra un error, evitando continuar con una descarga completa. La prueba de alojamiento realizada contra un PNG y leaflet.js ya publicados en el mismo GitHub Pages devolvió 206 para bytes 0–126, sin recomprimir los rangos. **El nuevo PMTiles no está desplegado mientras este PR esté abierto; falta verificar su URL definitiva después de la fusión.** La comprobación local sí utiliza este archivo real y rangos reales.

Si Pages no sirve bien el archivo, la alternativa es alojar solo el PMTiles en almacenamiento de objetos con Range y, si cambia de dominio, CORS que permita Range/If-Match y exponga ETag. El sitio puede permanecer en Pages. No se crea ningún servicio, cuenta, bucket ni cambio de permisos en esta POC.

Las mediciones y comparaciones están en docs/pmtiles_40/mediciones.json y sus vistas. Supabase se simula y la base OSM es externa. La referencia grande se sirve únicamente desde una copia de análisis local, sin subirla ni aumentar el límite de importación del sitio.
