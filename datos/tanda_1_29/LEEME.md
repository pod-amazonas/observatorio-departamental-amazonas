# Tanda 1 del Geovisor

Alejandro autorizó las fuentes de esta tanda en el encargo #29. Los años son los declarados en ese encargo. El paquete contiene copias fieles RFC 7946 en longitud/latitud WGS84. Se usó OpenFileGDB en solo lectura, GDAL/PROJ para reproyectar a CRS84 y GEOS para validar origen y salida. La comparación inversa conserva las posiciones y la estructura, con inversión del orden de anillos cuando RFC 7946 lo requiere. El residuo de ida y vuelta es numérico.

Departamento registra los 32 departamentos de Colombia. Se seleccionó el único registro con nombre Amazonas y código 91, con su geometría completa. CAR conserva el ámbito regional completo. Rutas conserva las dos geometrías completas del Putumayo y Amazonas.

| Capa | Entidades | Bytes brutos | Bytes gzip nivel 6 |
|---|---:|---:|---:|
| Departamento | 1 | 1.018.015 | 399.706 |
| Autoridad ambiental CAR | 1 | 2.237.372 | 886.390 |
| Rutas fluviales | 2 | 833.166 | 328.725 |

La meta de 1 MB del encargo se mide en transferencia. El tamaño gzip es una medición local y depende de la compresión que use el alojamiento.

Puerto queda pendiente de identificar qué instalaciones tienen acceso público verificado. Amenaza de inundación queda pendiente de una copia de fuente válida. La entidad 2 (Muy baja) tiene un anillo que se cruza consigo mismo desde el origen, según GEOS.

## Comprobación en el Geovisor

En escritorio (1280 × 720) y celular (390 × 844) se activaron las capas desde sus interruptores. Las descargas comenzaron al activarlas y los bytes recibidos coincidieron con las huellas del paquete. Se midió con HTTP gzip local, caché fría, 1,6 Mbit/s y latencia de 150 ms. Supabase se simuló.

| Capa | Escritorio hasta dibujo | Celular hasta dibujo |
|---|---:|---:|
| Departamento | 3,10 s | 2,26 s |
| Autoridad ambiental CAR | 4,82 s | 4,82 s |
| Rutas fluviales | 1,93 s | 1,93 s |

Se observó una corrida por tamaño y capa. Los tiempos dependen de la red y del alojamiento.

El diccionario identifica los campos publicados y excluidos. El manifiesto cubre cada archivo de este paquete. El visor sigue siendo un prototipo.
