# Rondas hídricas: una sola capa

Fuente: **Corpoamazonia, 2022**, referencia de atributos **Resolución 957 de 2018**. Determinantes **19–31** del catálogo, en un archivo PMTiles y una capa MVT `rondas`. La **19 se publica desde Determinantes_Ambientales_CAR, OBJECTID 19, sin ajustes**, por decisión del equipo POD del 18 de noviembre (#44).

## Unión sin cambiar geometrías

Para las determinantes 20–31 se parte de los doce archivos publicados por el #45, revisión `f5e8ef010a6c3da744295f242003ebfb27f6eda1`. Estas doce no se vuelven a teselar. Para añadir la 19 se abre exclusivamente su fuente en lectura y se comprueba la copia nativa por SHA-256. Solo se reúnen entidades de la misma tesela y se renumeran los índices de sus diccionarios de atributos. Se conservan literalmente **ID, tipo e instrucciones geométricas MVT**, incluidos cierre, orientación, coordenadas, huecos y partes lineales. No se disuelve, recorta, proyecta, simplifica ni repara ninguna parte.

`integridad.json` incluye SHA-256 de los doce archivos del #45 y de sus geometrías nativas ya documentadas allí. Para cada determinante y nivel 5–12, compara antes/después dos huellas: geometría y geometría con atributos tipados. Los **96 pares coinciden**. La huella geométrica incluye tileid, ID, tipo, longitud y bytes de comandos, en orden; la segunda añade claves y valores protobuf originales en orden canónico. El control anterior también queda fijado por SHA-256 en el comprobador, para detectar cambios aunque se reescriban las dos listas del JSON.

Los diccionarios pueden cambiar de orden o compartir valores idénticos, pero no cambian sus tipos ni sus valores. Se conservan los ocho [campos públicos del #45](../rondas_43/diccionario_campos.json), entre ellos `objectid` (número de determinante), `Nombre` y `Norma_Asociada`. La compresión y los índices PMTiles cambian, por lo que **el SHA-256 del archivo contenedor es nuevo**. `SHA256SUMS` cubre la entrega actual.

Los trece originales, las cuatro reparaciones autorizadas y los resultados 0 m / 0 m² siguen documentados en [control del #45](../rondas_43/control_origen.json). Se mantienen las partes lineales devueltas por MakeValid. Esta unión conserva exactamente la representación publicada, incluidas sus limitaciones de cuantización y los fragmentos MVT no válidos para análisis; no introduce otra generalización.

## Determinante 19: decisión del 18 de noviembre

La fuente seleccionada es **Determinantes_Ambientales_CAR, OBJECTID 19**, no Rondas_Hidricas FID 1. La geometría es válida: **554 polígonos, 731 anillos y 470.634 posiciones**. El SHA-256 WKB original y el de la copia nativa releída coinciden: `2c60f8a2a4c1ab72abe471654ae75169a301d422574bd662be6f733757d6436f`. No se repara, traslada, recorta, disuelve ni simplifica. El original permanece intacto; se comparan tamaños/fechas de sus archivos al leerlo, no se afirma haber comparado byte a byte toda la geodatabase.

El control previo midió **53,146–53,315 m**, mediana 53,221 m, entre posiciones homólogas de las dos versiones en SRC métrico. No es Hausdorff ni una tolerancia de ajuste. Se conserva como **observación técnica**, sin atribuir una causa no comprobada ni corregir las fuentes. Decisión: [#44](https://github.com/pod-amazonas/observatorio-departamental-amazonas/issues/44#issuecomment-6984702769); regla general: [#29](https://github.com/pod-amazonas/observatorio-departamental-amazonas/issues/29#issuecomment-6984763632).

La 19 usa GDAL 3.13.3 / GEOS 3.14.1 de QGIS, sin instalaciones, y niveles 5–12, EXTENT=4096, BUFFER=80, **SIMPLIFICATION=0 en todos los niveles**, SIMPLIFICATION_MAX_ZOOM=0. No se simplifica antes de teselar ni se añaden reparaciones. MVT obliga a reproyectar, cuantizar y fragmentar la representación; no se afirma igualdad de coordenadas nativas y MVT. La celda mide 305,748 m Web Mercator en z5, se divide entre dos por nivel, y mide 2,389 m en z12. Son unidades de representación, no precisión terrestre acreditada.

`determinante_19.json` conserva la prueba nativa, los ocho controles MVT antes/después de unir, sus parámetros y la observación. La huella del control se fija también en el comprobador. La unión mantiene los 96 controles anteriores y añade ocho: **104 pares determinante/nivel**. Los comandos de las doce rondas previas son idénticos al #47. Los campos `fid_ronda`, `Fuente_hidrica` y `Longitud_buffer` están ausentes en la 19: no se inventan ni se copian de FID 1. [Diccionario actual](diccionario_campos.json).

## Menú y consulta

Un interruptor: **Rondas hídricas (Corpoamazonia, Res. 957 de 2018)**. Ocupa **una** de las ocho plazas simultáneas. Conserva transparencia, zoom, carga bajo demanda, cancelación, errores y reintento, fuente/año/leyenda. Un listado informativo mantiene visibles los trece números y normas sin interruptores individuales.

Al tocar un polígono se consulta la tesela de ese punto y se muestran sus determinantes, nombre y norma; se deduplican números y se muestran todas las coincidencias. Los huecos no se consideran superficie del polígono y las líneas conservadas no se presentan como polígonos. Para franjas más estrechas que un píxel hay que acercar el mapa. Con teclado se puede mover el mapa con sus flechas y usar **Consultar centro del mapa**. La consulta incluye la 19. Su observación técnica permanece visible en la ficha de la capa y en esta documentación, sin cambiar el tamaño de la ventana de consulta. El modo de medir distancias mantiene su función, y apagar la capa retira consulta y ventana emergente. Se reutiliza una sola ventana, con tamaño ajustado al mapa y desplazamiento sin animación para mantener el cierre y el contenido dentro de la vista.

Se reutiliza el mismo lector local del #41/#45 y su caché. El adaptador usa `View.getDisplayTile` y `View.queryFeatures` de la versión fija protomaps-leaflet 5.1.0 incluida en vendor, sin otra biblioteca ni CDN. Se pide la tesela si fue desalojada del caché; no depende de una consulta de depuración ni reconstruye entidades completas. Las respuestas tardías se descartan si se apaga la capa, cambia la vista o se hace otra consulta.

La ayuda se calcula desde el catálogo: **33 de 33 registros disponibles**, en **21 capas de determinantes** (20 GeoJSON y una de rondas); **cero pendientes**. Estas cifras corresponden a determinantes, no al total de todas las temáticas. Se actualiza el texto visible del Geoportal desde el módulo existente sin editar los archivos reservados del PR #22.

## Peso y distribución

Un archivo de **23.128.497 bytes**, con las trece determinantes. Contiene **1.823 teselas**; la mayor tesela comprimida mide **390.125 bytes**. No se descarga entero al abrir el Geovisor. Las solicitudes exigen HTTP 206/Content-Range, con el mismo control del lector anterior.

Los doce archivos individuales se retiran de la distribución actual tras migrar el catálogo, el cliente, el servidor de pruebas y las comprobaciones. El catálogo histórico `entrega.json` del #45 conserva nombres y hashes como trazabilidad, sin tratarlos como rutas activas. La generación histórica solo escribe copias privadas y se impide reactivarla sobre el catálogo unificado. Los originales publicados se recuperan de la revisión fijada en Git, sin descargarlos de un servicio ni copiar una geodatabase al repositorio.

## Reproducción

La preparación usa el GDAL/GEOS existente de QGIS; la unión y comprobación usan Python estándar y Git. CI no requiere GIS ni el disco original. Los argumentos de fuente/copia son simbólicos, sin rutas del equipo; las copias quedan fuera del repositorio y del original. Si el disco desaparece el proceso se detiene sin reintentar.

```text
python3 scripts/agregar_ronda19_44.py --gdb FUENTE_GDB --privado CARPETA_ANALISIS --gdal-library LIBGDAL --geos-library LIBGEOS
python3 scripts/agregar_ronda19_44.py --integrar CARPETA_ANALISIS
python3 scripts/unificar_rondas46.py
python3 scripts/preparar_rondas43.py --comprobar
python3 -m unittest discover -s tests -p 'test_*rondas*.py'
npm test
```

La unión valida todos los hashes de entrada contra la entrega histórica antes de aceptar archivos y audita el resultado. `--integrar` retira únicamente los doce archivos autorizados si sus SHA-256 siguen coincidiendo. Las comprobaciones de #43/#45 conservan la trazabilidad nativa y delegan la verificación de la representación actual al archivo único. La auditoría histórica queda disponible sin sobrescribirla con estadísticas de otra entrega.

[Verificación visual, red lenta y límites](../../docs/rondas_46/LEEME.md). No se modifican originales ni la discrepancia #44. Fuente y año son los declarados en la publicación autorizada; la referencia normativa no certifica un acotamiento individual. Las teselas son para consulta visual, no superficies, navegación ni resultados oficiales. Después de fusionar deberá comprobarse HTTP 206 del archivo actualizado en Pages; este PR no despliega ni fusiona automáticamente.
