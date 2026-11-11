# Drenaje doble en PMTiles — prueba incompleta

POC autorizada en #40. No es una entrega hidrográfica completa ni oficial. Se incluyen 90 registros válidos que intersectan el departamento de Amazonas, conservados completos: no se recortaron a su límite. Río Caquetá (FID 484) y Río Putumayo (2165), inválidos en origen, quedan fuera por autorización explícita de Alejandro. No se reparó ninguna geometría.

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

El preparador detiene el proceso si falta la fuente, cambia la cantidad de seleccionados o aparece otra geometría inválida. No reintenta el disco en bucle. La comparación inversa conserva las posiciones de la referencia linealizada con residuo numérico inferior a 0,000001 m; no equivale a precisión geográfica de la fuente. Los SHA-256 de las geometrías nativas seleccionadas y de la referencia quedan en catalogo.json. SHA256SUMS cubre el paquete público completo.

## Curvas, niveles y tolerancia

74 de las 90 geometrías contienen curvas. MVT y Leaflet necesitan segmentos: GDAL las linealiza con paso angular máximo configurado de 4° y OGR_ARC_MAX_GAP de 25 m, en el SRC nativo MAGNA CTM12. Esta conversión de representación se documenta aparte: **la referencia para la comparación usa la misma linealización; no constituye una comparación exacta contra las curvas analíticas**. No se aplica una simplificación previa ni se eliminan vértices lineales de la referencia. Los anillos se orientan conforme a RFC 7946 al exportar la referencia, sin cambiar su trazo.

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

MAX_SIZE=100.000.000 bytes y MAX_FEATURES=200.000 evitan reducciones adicionales por límites de presupuesto. La tesela comprimida más grande mide 39.301 bytes, muy por debajo de ese límite. No se reducen geometrías de la referencia para llegar a un peso objetivo. El archivo completo pesa 2.232.666 bytes; la referencia 75.266.153 brutos / 27.361.797 gzip.

## Auditoría y límites de uso

El archivo contiene 1.639 teselas. auditoria_teselas.json lee cada zoom con CLIP=NO, evitando que el lector vuelva a recortar el búfer. Una entidad puede figurar en varias teselas; sus fragmentos no son registros originales distintos.

| Zoom | IDs de origen representados | Fragmentos no válidos para GEOS |
|---:|---:|---:|
| 5 | 88 | 36 |
| 6 | 89 | 41 |
| 7 | 89 | 49 |
| 8 | 90 | 40 |
| 9 | 90 | 14 |
| 10 | 90 | 0 |
| 11 | 90 | 0 |
| 12 | 90 | 5 |

La cuantización y generalización visual pueden colapsar elementos muy pequeños o producir fragmentos que no cumplen validez OGC. No se reparan. Por ello la POC es **solo para visualizar**: no se reconstruyen entidades, no se cuentan ríos o fragmentos como registros y no se calculan áreas ni superficies con estas teselas. Al superar zoom 12 se amplía la representación existente, sin obtener más precisión. No acredita navegabilidad, límites, actualidad ni ubicación exacta de la cartografía original. La comparación con la referencia evalúa el cambio de representación, no certifica la fuente.

## Cliente local y alojamiento

Se propone y usa protomaps-leaflet 5.1.0 (BSD-3-Clause) en vendor/, con bundle y mapa de fuentes originales fijados por SHA-256 y avisos de dependencias permisivas. Está en mantenimiento y dibuja en canvas sin consulta individual. No usa CDN, estilos de mapa base, glifos ni datos externos nuevos. El lector y el archivo PMTiles se solicitan solo al encender la capa. La ficha ligera se carga antes para habilitar el menú.

El menú muestra advertencia, fuente/año, leyenda, interruptor con texto, transparencia y centro departamental. Los estados de carga, cancelación y error no se presentan como una carga vacía exitosa. La limpieza general elimina también esta capa. No se suman fragmentos al conteo de registros del visor.

Se exige HTTP 206 con Content-Range exacto. Si el servidor devuelve 200, se cancela el cuerpo y se muestra un error, evitando continuar con una descarga completa. La prueba de alojamiento realizada contra un PNG y leaflet.js ya publicados en el mismo GitHub Pages devolvió 206 para bytes 0–126, sin recomprimir los rangos. **El nuevo PMTiles no está desplegado mientras este PR esté abierto; falta verificar su URL definitiva después de la fusión.** La comprobación local sí utiliza este archivo real y rangos reales.

Si Pages no sirve bien el archivo, la alternativa es alojar solo el PMTiles en almacenamiento de objetos con Range y, si cambia de dominio, CORS que permita Range/If-Match y exponga ETag. El sitio puede permanecer en Pages. No se crea ningún servicio, cuenta, bucket ni cambio de permisos en esta POC.

Las mediciones y comparaciones están en docs/pmtiles_40/mediciones.json y sus vistas. Supabase se simula y la base OSM es externa. La referencia grande se sirve únicamente desde una copia de análisis local, sin subirla ni aumentar el límite de importación del sitio.
