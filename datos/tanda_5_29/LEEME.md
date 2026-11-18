# Tanda 5 — amenazas con fecha y categorías acreditadas

Ampliación de #29 desde main con #49 fusionado. Prototipo de consulta: no es una alerta, un pronóstico ni un instrumento para certificar condiciones prediales o seguridad. Las fuentes originales se abren con OpenFileGDB en lectura. El paquete contiene únicamente dos capas con campos categóricos públicos; las otras cinco fuentes solicitadas quedan fuera y documentadas en `pendientes.json` y #29.

## Contenido y fuentes

| Capa | Fecha que se muestra | Fuente | Referencia fiel privada | Entrega PMTiles | Campos públicos |
|---|---|---|---:|---:|---|
| Amenaza_Incendios_Forestales | **2010** | IDEAM, ficha técnica POD 083 | 1.542.628 bytes | 396.075 bytes | fid_origen, Nivel_Amenaza |
| Amenaza_Remocion_Masa | **2022 (fecha declarada en ficha POD 085)** | Servicio Geológico Colombiano | 7.075.973 bytes | 1.484.739 bytes | fid_origen, GRADO, CATEGORIA |

Las fechas se toman del campo «Fecha» de las fichas técnicas suministradas; 2010 también aparece en el resumen/crédito de IDEAM. No se sustituyen por las fechas de creación o sincronización de la geodatabase. Las fichas describen un recorte previo realizado por el productor de la compilación POD; esta entrega conserva ese insumo y no reconstruye ni certifica la descarga nacional original. La fecha declarada en la ficha de remoción no acredita una actualización continua de los estudios. `fuentes.json` conserva número, nombre y SHA-256 de las dos fichas, sin publicar los PDF, sus contactos ni rutas del equipo.

- **Incendios:** cartografía estática de amenaza de 2010. **No informa incendios activos, puntos de calor ni alertas actuales.** Conserva las dos clases presentes: Baja y Muy Baja, una entidad por clase. No se inventan categorías ausentes.
- **Remoción en masa:** **solo cubre las zonas estudiadas incluidas en la fuente**. La ausencia de polígonos no implica ausencia de amenaza. Conserva Media (2 entidades) y Muy Baja (136). No informa eventos o alertas actuales.

Se omiten AREA_TOT, Shape_Area y Shape_Length, porque no son necesarios para consultar la clasificación y no se acredita su unidad como indicador ciudadano. Tampoco se entregan textos auxiliares con problemas de codificación. No se recalculan áreas ni se corrigen los atributos seleccionados. Las unidades de los campos entregados son categorías textuales, no magnitudes físicas. `diccionario_campos.json` identifica cada campo; `fid_origen` es el FID original y se repite entre fragmentos.

## Fidelidad y validez

Las 140 geometrías originales son MultiPolygon XY válidos para GEOS: 2 de incendios y 138 de remoción. **No se aplicó ninguna reparación**; `control_geometrias.json` registra `reparaciones: []`. Para cada entidad, el SHA-256 WKB original coincide con el usado y con la copia nativa releída del GeoPackage privado. Se conservan coordenadas, polígonos, huecos y atributos públicos, sin recortar al departamento ni simplificar antes de teselar. La transformación a CRS84 de la referencia privada también pasa la validación GEOS; se orientan sus anillos para RFC 7946 sin mover sus posiciones.

Se usaron GDAL 3.13.3 y GEOS 3.14.1 (CAPI 1.20.5), ya incluidos en QGIS, sin instalar herramientas. El original se abre sin actualización, se cierra antes de teselar y se comparan tamaños/fechas de modificación de sus archivos antes/después. No se afirma haber comparado byte a byte toda la geodatabase. No se publican WKB, GeoPackage, geodatabase ni referencias GeoJSON privadas.

El preparador incluye una barrera para futuras revisiones: solo podría adoptar MakeValid LINEWORK sobre una copia inválida de estas dos fuentes si la geometría resultante es válida, se conservan exactamente vértices únicos y segmentos con multiplicidad y la diferencia de área algebraica racional es 0 m². Verifica antes que el SRC sea proyectado en metros. Ante otro resultado se detiene. No descarta partes colapsadas para pasar la comprobación. Esta entrega no necesitó ejecutar esa reparación.

## Teselas y tolerancia por zoom

Los dos GeoJSON fieles superarían 1 MB; por ello se entregan PMTiles. Se reutilizan el lector y vendor del #41. No se descarga el archivo completo al entrar: cada interruptor solicita únicamente los rangos HTTP 206 necesarios. Cada capa ocupa una plaza del límite de ocho y tiene estado, error/reintento, transparencia y zoom. La leyenda distingue las clases por texto y por color; el lector aplica esos mismos colores a sus polígonos.

GDALVectorTranslate genera EPSG:3857, niveles 5–12, EXTENT=4096, BUFFER=80, SIMPLIFICATION=1 y SIMPLIFICATION_MAX_ZOOM=0. MAX_SIZE=100.000.000 y MAX_FEATURES=200.000 evitan que el presupuesto por tesela fuerce una reducción adicional. No se realiza generalización previa. Al acercar por encima de 12 se amplía el último nivel disponible.

| Zoom | Metros Web Mercator por unidad MVT | Simplificación en unidades |
|---:|---:|---:|
| 5 | 305,748 | 1 |
| 6 | 152,874 | 1 |
| 7 | 76,437 | 1 |
| 8 | 38,219 | 1 |
| 9 | 19,109 | 1 |
| 10 | 9,555 | 1 |
| 11 | 4,777 | 1 |
| 12 | 2,389 | 0 |

MVT exige cuantización a enteros y fragmentación por teselas incluso con simplificación 0. La celda no es una garantía de desplazamiento máximo ni una precisión terrestre acreditada. En remoción no se distinguen por generalización 4 entidades a zoom 5, 3 a zoom 6–7 y 2 a zoom 8–9; **las 138 aparecen en zoom 10–12**. Las dos de incendios aparecen en todos los niveles. `auditoria_teselas.json` verifica todas las teselas, todos los campos y las entidades visibles por nivel. Los fragmentos no se usan para conteos ni superficies oficiales ni se afirma que mantengan la validez GEOS de la referencia nativa.

## Fuentes retiradas de esta tanda

No hay archivos ni controles de estas fuentes en la entrega:

| Fuente | Pendiente para retomar |
|---|---|
| Indice_Municipal_Riesgo | Confirmar con DNP año de referencia, unidad/escala y metodología de Indice_Ajustado. La ficha 090 fecha la compilación POD en 2022, sin acreditar esos metadatos del indicador. Después se unirá por código a la División publicada, sin nuevas geometrías. |
| Clasificacion_Suelo_Departamental | Identificar instrumento, acto y vigencia por municipio/clase. La ficha 097 y los atributos no acreditan adopción ni condición de propuesta. |
| Clasificacion_Suelo_Puerto_Nariño | Confirmar instrumento, acto y vigencia. La ficha 098 y los atributos no acreditan ese respaldo. Solo se rotulará «propuesto» cuando tal condición esté documentada. |
| Determinantes_OT | Cotejar normas/vigencia y coincidencias con las determinantes ambientales. Se revisaron 25 registros de atributos; 12 categorías son N.D. Hay coincidencias temáticas por nombre, que no prueban igualdad geométrica. No se añaden nuevos polígonos ni se duplica el catálogo. |
| Territorios_Colectivos | Revisión institucional que permita descartar localización directa o indirecta de pueblos en aislamiento voluntario. Solo se revisaron esquema/metadatos, sin leer geometrías ni atributos de localización, renderizar mapas ni generar centroides o derivados. No se procesa la capa de aislamiento ni se realizan cruces para intentar identificarla. |

Los pendientes se registran en #29. No se completan año, unidad, metodología o vigencia por suposición ni se considera «propuesto» un instrumento cuyo estado solo se desconoce.

## Reproducción y comprobación

`SHA256SUMS` cubre el paquete público completo, excepto el manifiesto mismo. La comprobación usa Python estándar, sin GIS, fuentes montadas ni acceso a red. La preparación requiere la fuente autorizada y las bibliotecas ya instaladas de QGIS; los nombres siguientes son simbólicos, sin rutas del equipo:

```sh
python3 scripts/preparar_tanda5_29.py --fase preparar --gdb FUENTE_GDB --privado CARPETA_ANALISIS --gdal-library LIBGDAL --geos-library LIBGEOS
python3 scripts/preparar_tanda5_29.py --fase integrar --privado CARPETA_ANALISIS
python3 scripts/preparar_tanda5_29.py
npx playwright test tests/tanda5.spec.js
```

La carpeta de análisis queda fuera del repositorio y de la fuente. El proceso se detiene si el disco desaparece, sin reintentos en bucle. Solo se abren por nombre las dos fuentes de ENV: no se exportan capas aplazadas. La integración no vuelve a leer el original. Evidencias de escritorio, celular y red lenta en `docs/tanda_5_29/LEEME.md` y en el PR.
