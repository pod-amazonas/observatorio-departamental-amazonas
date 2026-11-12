# Rondas hídricas — determinantes 20–31

Publicación autorizada por Alejandro en #43. Fuente: **Rondas_Hidricas, Corpoamazonia 2022**. Se publica la copia derivada por teselas de doce registros completos, sin recortar al departamento ni aplicar una simplificación previa a los niveles de zoom. El original permanece intacto. Solo visualización; no representa certificación oficial de ubicación, área ni acotamiento normativo.

## Alcance y correspondencia

Se revisaron los trece registros: válidos FID 1–5 y 10–13; inválidos FID 6–9. La publicación incluye FID 2–13, correspondientes a determinantes 20–31. Antes de reparar, sus WKB son idénticos a los de Determinantes_Ambientales_CAR. Se verifican los atributos literales Nombre/LEYENDA «Rondas hídricas», CAR «Corpoamazonia» y Norma_Asociada «Resolución 957 de 2018». Rondas_Hidricas no contiene una norma propia: la referencia procede de la determinante cuya correspondencia geométrica fue verificada, sin inventarla ni deducirla por orden.

**La determinante 19 sigue pendiente por decisión de Alejandro (#44).** Ronda FID 1 y determinante 19 son válidas y comparten estructura, pero difieren entre 53,146 y 53,315 m en posiciones homólogas pese a declarar el mismo SRC. No se reasigna ni mueve ninguna geometría para hacerlas coincidir; no se publica el FID 1. El problema es anterior y ajeno a MakeValid. No se infiere la causa ni se corrige en este PR.

| Determinante | FID de Rondas_Hidricas | Norma literal cotejada | Bytes PMTiles |
|---:|---:|---|---:|
| 20 | 2 | Resolución 957 de 2018 | 3.168.650 |
| 21 | 3 | Resolución 957 de 2018 | 1.748.540 |
| 22 | 4 | Resolución 957 de 2018 | 1.329.832 |
| 23 | 5 | Resolución 957 de 2018 | 2.143.108 |
| 24 | 6 | Resolución 957 de 2018 | 3.203.478 |
| 25 | 7 | Resolución 957 de 2018 | 682.305 |
| 26 | 8 | Resolución 957 de 2018 | 838.624 |
| 27 | 9 | Resolución 957 de 2018 | 1.317.371 |
| 28 | 10 | Resolución 957 de 2018 | 1.326.113 |
| 29 | 11 | Resolución 957 de 2018 | 1.974.299 |
| 30 | 12 | Resolución 957 de 2018 | 2.628.279 |
| 31 | 13 | Resolución 957 de 2018 | 2.577.611 |

El año 2022 es el de la fuente declarado en el encargo, no una fecha de observación acreditada para cada geometría. La Resolución 957 de 2018 se cita como atributo de la fuente: no se afirma que sea un acto individual de acotamiento de cada cauce. El atributo Longitud_buffer=30 se conserva sin interpretarlo como ancho normativo verificado.

## Cuatro correcciones en copias

GDAL **3.13.3**, GEOS **3.14.1 / CAPI 1.20.5**, incluidos en QGIS. Únicamente los FID 6, 7, 8 y 9 reciben `OGR_G_MakeValidEx`, `METHOD=LINEWORK` (GEOS MakeValid), en el SRC proyectado nativo en metros. No se aplica snap, buffer(0), redondeo ni simplificación a las copias. Los nueve originales válidos se mantienen sin reparar; ocho de ellos se publican.

| FID | Posiciones antes → después, incluye cierres | Coordenadas únicas antes = después | Polígonos antes → después | Anillos antes → después | Líneas conservadas | Desplazamiento máx. | Cambio de área exacta |
|---:|---:|---:|---:|---:|---:|---:|---:|
| 6 | 3.967.722 → 3.967.723 | 3.967.178 | 487 → 487 | 541 → 542 | 0 | 0 m | 0 m² |
| 7 | 2.138.629 → 2.138.619 | 2.138.530 | 77 → 67 | 79 → 69 | 10 | 0 m | 0 m² |
| 8 | 3.520.804 → 3.520.800 | 3.520.769 | 6 → 2 | 27 → 23 | 4 | 0 m | 0 m² |
| 9 | 3.582.026 → 3.582.020 | 3.581.970 | 17 → 11 | 43 → 37 | 6 | 0 m | 0 m² |

Todos los resultados son válidos para GEOS. FID 6 continúa como MultiPolygon; FID 7–9 devuelven GeometryCollection con polígonos y líneas. **No se descartan las líneas**: se guardan completas, se entregan al generador MVT y el lector las dibuja con una regla específica. El descenso de posiciones y anillos refleja cambios de estructura y repeticiones de cierre; ninguna coordenada única se pierde o se añade. No se cuenta cada fragmento de tesela como una entidad.

Las coordenadas se cotejan por igualdad exacta de sus doubles, con conjuntos ordenados en disco para evitar cargar millones de objetos JSON. La distancia máxima de cada vértice original a los vértices resultantes es cero porque todos están presentes exactamente. El área se compara por shoelace racional exacto (exteriores menos huecos), guardando numerador/denominador de la diferencia; los cuatro numeradores son 0. En una entrada inválida es un área algebraica, **no una superficie OGC acreditada ni una cifra oficial**. No se redondea un cambio pequeño a cero. Los tests incluyen un desplazamiento submilimétrico que debe ser detectado y un polígono colapsado cuyas líneas se conservan.

Los SHA-256 de originales/corregidos y los resultados completos están en control_origen.json. Se abrió OpenFileGDB solo en lectura; tamaños y mtime de los archivos de la fuente coinciden antes/después. Las copias originales conservan sus hashes y el GPKG de análisis se relee: sus doce geometrías son válidas y sus WKB idénticos a las copias nativas verificadas. No se afirma haber calculado el hash de todos los bytes de la geodatabase completa. Ninguna geodatabase, WKB, GPKG o referencia sin teselar se sube al repositorio.

## Representación por zoom

Mismos parámetros del #41: PMTiles v3 / MVT, EPSG:3857, zoom **5–12**, EXTENT=4096, BUFFER=80, SIMPLIFICATION=1 en 5–11 y SIMPLIFICATION_MAX_ZOOM=0 en 12. No hay simplificación fuera de los niveles de zoom, recorte al departamento ni reparaciones adicionales de los fragmentos. La cuantización MVT a enteros permanece incluso en zoom 12.

| Zoom | Metros Mercator por unidad | Simplificación, unidades de tesela |
|---:|---:|---:|
| 5 | 305.748 | 1 |
| 6 | 152.874 | 1 |
| 7 | 76.437 | 1 |
| 8 | 38.219 | 1 |
| 9 | 19.109 | 1 |
| 10 | 9.555 | 1 |
| 11 | 4.777 | 1 |
| 12 | 2.389 | 0 |

Las unidades Mercator no son distancias terrestres certificadas ni una garantía del error máximo continuo. MAX_SIZE=100.000.000 y MAX_FEATURES=200.000 evitan reducciones adicionales por presupuesto de tesela; no se simplifica para cumplir una meta de 1 MB. La mayor tesela comprimida mide 79.780 bytes.

Las doce determinantes están representadas en todos los niveles 5–12. La cuantización y el recorte por tesela pueden producir fragmentos no válidos para GEOS (14 en conjunto en zoom 12) o colapsar componentes menores que la resolución del nivel. No se reparan ni se utilizan para reconstrucción de entidades, conteos o áreas. auditoria_teselas.json usa CLIP=NO para evitar recortar dos veces y documenta presencia, tipo y validez de fragmentos por zoom. Las partes lineales de las copias 7–9 también aparecen como fragmentos de línea en zoom 12; su número no es el de componentes originales porque pueden cruzar varias teselas.

## Cliente, campos y custodia

Se reutiliza el lector protomaps-leaflet 5.1.0 de #41, alojado en vendor/ con versión fija y licencias existentes. Hay una sola implementación de solicitudes por rango, cabeceras, cancelación y creación del renderizador; no se añade otra biblioteca ni CDN. Rondas y drenaje comparten la carga del lector, con estados y cancelación independientes. Se exige HTTP 206 y Content-Range exactos; un 200 se cancela sin continuar la descarga completa. Todo se carga solo al activar su interruptor. Se conserva el límite existente de ocho capas simultáneas.

Las rondas usan los controles únicos del menú de determinantes: botón role=switch / aria-checked, texto Encendida/Apagada, teclado, fuente/año, leyenda, norma referida, transparencia, zoom, error, reintento y limpieza. La 19 permanece deshabilitada y rotulada como pendiente. Los datos de teselas no se suman a los recuentos de registros ni producen superficies ficticias. Los campos públicos y su alcance están en diccionario_campos.json.

## Reproducción sin instalar herramientas

Solo GDAL/GEOS instalados con QGIS, biblioteca estándar de Python y sort del sistema. Las bibliotecas y carpetas se pasan por argumentos, sin rutas del equipo en los archivos públicos. Si no se detecta PROJ, configurar PROJ_DATA al directorio de datos de la instalación GIS existente. Usar una carpeta privada nueva, fuera del repositorio y fuera de la geodatabase.

```text
python3 scripts/preparar_rondas43.py --fase origen --gdb FUENTE_GDB --privado ANALISIS --gdal-library LIBGDAL --geos-library LIBGEOS
python3 scripts/preparar_rondas43.py --fase copias --privado ANALISIS --gdal-library LIBGDAL --geos-library LIBGEOS
python3 scripts/preparar_rondas43.py --fase teselas --privado ANALISIS --gdal-library LIBGDAL --geos-library LIBGEOS
python3 scripts/preparar_rondas43.py --fase auditar-nativa --privado ANALISIS --gdal-library LIBGDAL --geos-library LIBGEOS
python3 scripts/preparar_rondas43.py --fase integrar --privado ANALISIS
python3 scripts/auditar_rondas43.py --gdal-library LIBGDAL --geos-library LIBGEOS
python3 scripts/preparar_rondas43.py --comprobar
```

El preparador se detiene si cambian fuente, esquema, SRC o hashes aprobados; no reintenta un disco desconectado. Si una copia pierde vértices, se desplaza o cambia de área exacta, no continúa. integrar solo admite las correspondencias exactas 20–31; no habilita silenciosamente la 19. SHA256SUMS cubre todo el paquete público. --comprobar funciona sin QGIS y valida hashes, cabeceras, campos, correspondencias, reparaciones 0/0, auditoría y estado del catálogo.

Fuente técnica del formato: [GDAL PMTiles](https://gdal.org/en/stable/drivers/vector/pmtiles.html). Las mediciones y capturas se encuentran en docs/rondas_43/; el archivo nuevo aún requiere comprobar su URL definitiva en Pages tras la fusión. No se cambia infraestructura ni se implementa un alojamiento alternativo.
