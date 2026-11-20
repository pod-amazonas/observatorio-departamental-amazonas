# Drenaje Sencillo: entidades completas que intersectan Amazonas

Selección autorizada por Alejandro para la presentación del 20 de noviembre de 2026. Rama desde main `40fd8a4`, con #61 fusionado. Se modifica exclusivamente la publicación de Drenaje Sencillo y su control de integridad; Vías y Caminos y las demás capas se conservan.

## Resultado

| Concepto | Resultado |
|---|---:|
| Registros de la entrega anterior | 65.165 |
| Entidades completas que intersectan Amazonas | **27.341** |
| Registros excluidos por no intersectar | 37.824 |
| Partes lineales seleccionadas | 27.365 |
| Posiciones en la representación lineal seleccionada | 3.839.809 |
| Desplazamiento respecto a la copia nativa publicada | **0 m** |
| Reparaciones nuevas | Ninguna |
| PMTiles completo | **12.682.115 bytes** |

## Método y fidelidad

Se usa la copia nativa privada y verificada de la entrega anterior. La geodatabase original no se abre ni modifica y no es necesario reconectar el disco. Antes de seleccionar se comprueba el WKB de todas las entidades contra el control original publicado, fijado por SHA-256. Se mantienen solo los campos públicos `fid_origen` y `ESTADO_DRENAJE`.

GEOS aplica **Intersects** con el único polígono publicado de `departamento_amazonas`, `DeCodigo=91`, transformado al CRS nativo del drenaje. Los contactos con el borde también cuentan. Se selecciona cada entidad completa, incluso su parte exterior al departamento: no se usa Clip ni Intersection para alterar su trazado. Las geometrías seleccionadas se copian a un archivo de análisis nuevo y se releen, comprobando WKB idéntico por FID y coordenadas CRS84 idénticas a la entrega anterior.

La selección conserva las seis curvas que ya tenían representación lineal autorizada en la tanda 6; no introduce otra aproximación ni las vuelve a linearizar. Los ocho contenedores curvos seleccionados, la lista de registros y sus huellas están en `datos/tanda_6_29/control_geometrias.json`. No se presenta esa representación previa de arcos como un original curvo idéntico.

El apartado `seleccion` registra huellas del departamento, control anterior y copia nativa, versiones GDAL 3.13.3 / GEOS 3.14.1 y conteos. El comprobador fija además la huella conjunta de los registros seleccionados, para rechazar cambios de FID, geometría o atributos aun recalculando el manifiesto. No se publican rutas internas ni archivos de análisis.

Las teselas mantienen el método publicado: niveles 5–12, extent 4096, buffer 80, simplificación 1 por nivel y 0 en el máximo, sin simplificación previa. MVT fragmenta y cuantiza únicamente para representar cada nivel. A zoom 12 permanecen seis líneas demasiado pequeñas para distinguirse en la cuadrícula; sus entidades siguen completas en la copia nativa. La auditoría exige exactamente los FID 162830, 162960, 163042, 163111, 163119 y 163286 como omisiones de representación. No sirve para conteos o longitudes oficiales.

El lector existente solicita la nueva versión mediante el SHA-256 del catálogo; no se cambia código del menú ni de descarga. Se conservan interruptor, fuente IGAC, año 2022, leyenda y advertencia de que no es una ruta navegable certificada.

## Navegador y red lenta

Una observación por tamaño en Chromium, 1280×720 y 390×844; red simulada de 1,6 Mbit/s, 150 ms, caché HTTP deshabilitada y contexto nuevo. Servidor local con rangos HTTP 206 reales y compresión de JS/JSON; mapa base y servicios externos sustituidos. No representa una medición en teléfono físico o GitHub Pages.

| Pantalla | Bytes de la capa descargados | Lector frío | Tiempo hasta dibujo |
|---|---:|---:|---:|
| Escritorio | 525.790 | 37.678 | 4,054 s |
| Celular | 525.790 | 37.678 | 4,003 s |

Ambas mediciones dibujaron sin errores JavaScript y todos los rangos llevaron el nuevo SHA-256. La entrada al sitio no descarga el archivo completo: se activa mediante el interruptor. El consumo depende del encuadre y nivel. [Mediciones completas](rendimiento.json).

Capturas con mapa base sustituido por un fondo neutro: [escritorio](vistas/mapa_1280.png), [celular](vistas/mapa_390.png), [escritorio ampliado](vistas/pantalla_completa_1280.png) y [celular ampliado](vistas/pantalla_completa_390.png). Son comprobaciones de representación y distribución, no una afirmación de igualdad de píxeles con la geometría nativa.

## Reproducibilidad y verificaciones

El [LEEME del paquete](../../datos/tanda_6_29/LEEME.md) contiene los comandos con argumentos simbólicos. `seleccionar_drenaje62.py` escribe en una carpeta de análisis nueva y fuera del repositorio; `--integrar` adopta solo Drenaje. El preparador original rechaza integrar la entrega completa anterior sin esta selección.

`preparar_tanda6_29.py --comprobar` funciona sin GIS, red ni disco. Valida manifiesto, referencia seleccionada y contenido de todas las teselas. Las cinco pruebas específicas del paquete pasaron, incluidas las de rechazo de fuentes aplazadas y cambios de identidad, geometría o atributos. La suite completa y Actions/Gitleaks se registran en el PR.

Se compararon contra main los binarios, descarga, campos, fuentes, control y auditoría de Vías y Caminos: idénticos. No cambian las capas aplazadas ni sus decisiones de publicación.
