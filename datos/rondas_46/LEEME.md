# Rondas hídricas: una sola capa

Fuente: **Corpoamazonia, 2022**, referencia de atributos **Resolución 957 de 2018**. Determinantes **20–31** del catálogo, en un archivo PMTiles y una capa MVT `rondas`. La **19 sigue pendiente (#44)** y no se incluye su geometría.

## Unión sin cambiar geometrías

Se parte exclusivamente de los doce archivos publicados por el #45, revisión `f5e8ef010a6c3da744295f242003ebfb27f6eda1`. No se abre la geodatabase ni se vuelve a teselar. Solo se reúnen entidades de la misma tesela y se renumeran los índices de sus diccionarios de atributos. Se conservan literalmente **ID, tipo e instrucciones geométricas MVT**, incluidos cierre, orientación, coordenadas, huecos y partes lineales. No se disuelve, recorta, proyecta, simplifica ni repara ninguna parte.

`integridad.json` incluye SHA-256 de los doce archivos del #45 y de sus geometrías nativas ya documentadas allí. Para cada determinante y nivel 5–12, compara antes/después dos huellas: geometría y geometría con atributos tipados. Los **96 pares coinciden**. La huella geométrica incluye tileid, ID, tipo, longitud y bytes de comandos, en orden; la segunda añade claves y valores protobuf originales en orden canónico. El control anterior también queda fijado por SHA-256 en el comprobador, para detectar cambios aunque se reescriban las dos listas del JSON.

Los diccionarios pueden cambiar de orden o compartir valores idénticos, pero no cambian sus tipos ni sus valores. Se conservan los ocho [campos públicos del #45](../rondas_43/diccionario_campos.json), entre ellos `objectid` (número de determinante), `Nombre` y `Norma_Asociada`. La compresión y los índices PMTiles cambian, por lo que **el SHA-256 del archivo contenedor es nuevo**. `SHA256SUMS` cubre la entrega actual.

Los trece originales, las cuatro reparaciones autorizadas y los resultados 0 m / 0 m² siguen documentados en [control del #45](../rondas_43/control_origen.json). Se mantienen las partes lineales devueltas por MakeValid. Esta unión conserva exactamente la representación publicada, incluidas sus limitaciones de cuantización y los fragmentos MVT no válidos para análisis; no introduce otra generalización.

## Menú y consulta

Un interruptor: **Rondas hídricas (Corpoamazonia, Res. 957 de 2018)**. Ocupa **una** de las ocho plazas simultáneas. Conserva transparencia, zoom, carga bajo demanda, cancelación, errores y reintento, fuente/año/leyenda. Un listado informativo mantiene visibles los doce números y normas sin interruptores individuales.

Al tocar un polígono se consulta la tesela de ese punto y se muestran sus determinantes, nombre y norma; se deduplican números y se muestran todas las coincidencias. Los huecos no se consideran superficie del polígono y las líneas conservadas no se presentan como polígonos. Para franjas más estrechas que un píxel hay que acercar el mapa. Con teclado se puede mover el mapa con sus flechas y usar **Consultar centro del mapa**. No hay consulta de la ronda 19. El modo de medir distancias mantiene su función, y apagar la capa retira consulta y ventana emergente. Se reutiliza una sola ventana, con tamaño ajustado al mapa y desplazamiento sin animación para mantener el cierre y el contenido dentro de la vista.

Se reutiliza el mismo lector local del #41/#45 y su caché. El adaptador usa `View.getDisplayTile` y `View.queryFeatures` de la versión fija protomaps-leaflet 5.1.0 incluida en vendor, sin otra biblioteca ni CDN. Se pide la tesela si fue desalojada del caché; no depende de una consulta de depuración ni reconstruye entidades completas. Las respuestas tardías se descartan si se apaga la capa, cambia la vista o se hace otra consulta.

La ayuda se calcula desde el catálogo: **32 de 33 registros disponibles**, en **21 capas de determinantes** (20 GeoJSON y una de rondas); **una pendiente**, la 19. Estas cifras corresponden a determinantes, no al total de todas las temáticas. Se actualiza el texto visible del Geoportal desde el módulo existente sin editar los archivos reservados del PR #22.

## Peso y distribución

Un archivo de **22.093.851 bytes**, frente a 22.938.210 bytes de los doce anteriores (844.359 bytes menos). Contiene **1.781 teselas**; la mayor tesela comprimida mide **365.897 bytes**. No se descarga entero al abrir el Geovisor. Las solicitudes exigen HTTP 206/Content-Range, con el mismo control del lector anterior.

Los doce archivos individuales se retiran de la distribución actual tras migrar el catálogo, el cliente, el servidor de pruebas y las comprobaciones. El catálogo histórico `entrega.json` del #45 conserva nombres y hashes como trazabilidad, sin tratarlos como rutas activas. La generación histórica solo escribe copias privadas y se impide reactivarla sobre el catálogo unificado. Los originales publicados se recuperan de la revisión fijada en Git, sin descargarlos de un servicio ni copiar una geodatabase al repositorio.

## Reproducción

Solo Python estándar y Git existentes, sin instalar GDAL ni otros paquetes. `--generar` requiere tener la revisión #45 en el historial local; CI solo necesita los archivos de esta entrega.

```text
python3 scripts/unificar_rondas46.py --generar
python3 scripts/unificar_rondas46.py --integrar
python3 scripts/unificar_rondas46.py
python3 scripts/preparar_rondas43.py --comprobar
python3 -m unittest discover -s tests -p 'test_*rondas*.py'
npm test
```

La unión valida todos los hashes de entrada contra la entrega histórica antes de aceptar archivos y audita el resultado. `--integrar` retira únicamente los doce archivos autorizados si sus SHA-256 siguen coincidiendo. Las comprobaciones de #43/#45 conservan la trazabilidad nativa y delegan la verificación de la representación actual al archivo único. La auditoría histórica queda disponible sin sobrescribirla con estadísticas de otra entrega.

[Verificación visual, red lenta y límites](../../docs/rondas_46/LEEME.md). No se modifican originales ni la discrepancia #44. Fuente y año son los declarados en la publicación autorizada; la referencia normativa no certifica un acotamiento individual. Las teselas son para consulta visual, no superficies, navegación ni resultados oficiales. Después de fusionar deberá comprobarse HTTP 206 de la URL nueva en Pages; este PR no despliega ni fusiona automáticamente.
