# Tanda 6 — comprobación visual y red lenta

**Registro histórico de la entrega original.** Drenaje Sencillo se seleccionó posteriormente a 27.341 entidades completas que intersectan Amazonas; los pesos y mediciones de este documento corresponden a la entrega anterior. Consulte la [selección actual](../drenaje62/LEEME.md). Vías y Caminos no cambia.

Rama propia desde main `df1a50b` (#50 fusionado). Se entregan drenajes y vías. CLC, bienes culturales y población permanecen fuera por los motivos registrados en #29 y `datos/tanda_6_29/pendientes.json`. No se cambia ninguna fuente ni se instala software.

## Pesos de la entrega

| Fuente | Registros de referencia | GeoJSON fiel privado | PMTiles público |
|---|---:|---:|---:|
| Drenaje sencillo | 65.165 | 337.653.770 bytes | 29.170.560 bytes |
| Vías/caminos | 1.811 | 1.185.240 bytes | 298.868 bytes |

Se conserva toda la referencia de origen sin recortes nuevos ni reparación. Seis curvas se convierten a segmentos con el método del #41; el control diferencia sus huellas de las originales. Las vías ofrecen además su base fiel completa en GeoJSON gzip de **355.447 bytes**, bajo ODbL, sin descarga automática. `SHA256SUMS`, diccionario y control de geometrías se comprueban con Python estándar.

## Descarga con conexión lenta

Chromium local, pantalla emulada de **1280×720 y 390×844**, movimiento reducido, red de **1,6 Mbit/s y 150 ms**, caché HTTP deshabilitada, tres contextos nuevos por capa/tamaño: **12 observaciones**. La vista se fija en el departamento a zoom 6. Se mide desde activar el interruptor hasta finalizar la carga y comprobar píxeles pintados. Los rangos usan HTTP 206 real; el servidor local comprime JS/JSON. Los tiempos incluyen lectura del lector compartido frío (37.678 bytes adicionales). Supabase y el mapa base externo se simulan en estas mediciones para aislar las capas. No son cifras de un teléfono físico ni del alojamiento GitHub Pages.

| Capa | Pantalla | Bytes de capa | Solicitudes por rango | Tiempo observado |
|---|---|---:|---:|---:|
| Drenaje sencillo | Escritorio | 1.267.267 | 5 | 7,230–7,262 s |
| Drenaje sencillo | Celular | **1.267.267** | 5 | **7,226–7,240 s** |
| Vías/caminos | Escritorio | 34.123 | 3 | 0,921–0,937 s |
| Vías/caminos | Celular | 34.123 | 3 | 0,936–0,985 s |

No se descargan los 29,17 MB del archivo de drenaje al abrirlo: esta vista necesita aproximadamente 1,27 MB, más el lector. Otros encuadres, zooms y densidades producen otras cifras. Al entrar en la página sin activar capas no se solicita ningún PMTiles, copia GeoJSON ni vendor del lector. Los resultados completos, incluidos errores JS (ninguno), están en `rendimiento.json`.

## Comparación visual

Capturas con el mapa OSM real. La vista departamental muestra el contexto; en la vista de detalle **zoom 10** se sustituye el lienzo MVT por la referencia fiel privada en la misma posición y tamaño. Se seleccionan las entidades completas cuyas envolventes intersectan la ventana de análisis, sin cortar ni simplificar sus coordenadas, y se comprueba que dicha ventana cubra todo el mapa. Para drenaje son 3.411 entidades y para vías 1.468. No se publican esos GeoJSON de análisis.

Se conserva la ubicación y el trazado general en las comparaciones. Se observan diferencias de detalle por generalización y cuantización y de grosor/suavizado entre canvas y SVG; no se afirma igualdad de píxeles ni de geometrías MVT. La igualdad de las referencias nativas se verifica por WKB/SHA-256, aparte de las imágenes. El drenaje es denso en el centro del departamento; las vías se aprecian en detalle alrededor de Leticia. Estos encuadres no se obtienen de capas comunitarias ni de población.

| Fuente | Escritorio | Celular |
|---|---|---|
| Drenaje sencillo | [Departamento](vistas/drenaje_sencillo_departamento_1280.png) · [Detalle en teselas](vistas/drenaje_sencillo_detalle_1280.png) · [Referencia](vistas/drenaje_sencillo_referencia_1280.png) · [Menú](vistas/drenaje_sencillo_menu_1280.png) | [Departamento](vistas/drenaje_sencillo_departamento_390.png) · [Detalle en teselas](vistas/drenaje_sencillo_detalle_390.png) · [Referencia](vistas/drenaje_sencillo_referencia_390.png) · [Menú](vistas/drenaje_sencillo_menu_390.png) |
| Vías/caminos | [Departamento](vistas/vias_y_caminos_departamento_1280.png) · [Detalle en teselas](vistas/vias_y_caminos_detalle_1280.png) · [Referencia](vistas/vias_y_caminos_referencia_1280.png) · [Menú](vistas/vias_y_caminos_menu_1280.png) | [Departamento](vistas/vias_y_caminos_departamento_390.png) · [Detalle en teselas](vistas/vias_y_caminos_detalle_390.png) · [Referencia](vistas/vias_y_caminos_referencia_390.png) · [Menú](vistas/vias_y_caminos_menu_390.png) |

## Detalle por zoom y límites

`auditoria_teselas.json` recorre todas las teselas, exige líneas, FID y atributos públicos idénticos y enumera los segmentos que no se distinguen por cuantización/generalización. A zoom 12 no se distinguen **10 drenajes y una vía**, con extensiones inferiores a 2 m en ambas dimensiones; no desaparecen de la referencia nativa. En vías, la descarga fiel incluye también ese segmento. No se anuncia que el MVT contenga todos los registros fuente ni se ofrecen conteos/longitudes de los fragmentos como cifras oficiales.

| Zoom | Drenajes distinguibles | Vías distinguibles |
|---:|---:|---:|
| 5 | 65.015 | 1.092 |
| 6 | 65.093 | 1.412 |
| 7 | 65.102 | 1.588 |
| 8 | 65.120 | 1.717 |
| 9 | 65.125 | 1.774 |
| 10 | 65.132 | 1.797 |
| 11 | 65.146 | 1.808 |
| 12 | 65.155 | 1.810 |

No se aplica un filtro por cantidad máxima para reducir la tesela: MAX_FEATURES=200.000 y MAX_SIZE=100.000.000; la auditoría exige específicamente las omisiones conocidas del último nivel y rechaza pérdidas adicionales. Por encima de 12 solo se amplía ese nivel. El método, celda por nivel y conversión de curvas constan en el LEEME del paquete.

## Pruebas

Cuatro pruebas nuevas comprueban integridad y exclusión aun recalculando manifiesto, fidelidad de atributos y referencias, carga al activar, líneas realmente pintadas, teclado, transparencia, zoom, avisos, licencia y atribución OSM independiente del mapa base. También error de rangos, reintento y limpieza. Las pruebas previas de foco e interruptores incluyen los nuevos controles sin relajar sus aserciones. La suite completa y Actions/Gitleaks se registran en el PR.

La primera suite detectó contraste 2,995:1 al lado de los enlaces nuevos de licencia por interferencia con texto contiguo. Se separaron sus cajas con márgenes, sin cambiar el color ni las aserciones de foco. Las dos pruebas de recorrido completo con Tab en el Geovisor pasaron después del ajuste (25,4 s); las capturas corresponden al ajuste final.

Validación inicial, anterior a la integración con main: **`npm test`: 177 pruebas aprobadas en 4,2 min**, incluidas las cuatro nuevas y los recorridos completos de foco. Sin pruebas omitidas, relajaciones de contraste o nuevas dependencias.


## Actualización con main después de #56 (19 de noviembre de 2026)

La rama incorpora main `5a8dfed`, incluidas las 33 determinantes, los textos ciudadanos, las fichas técnicas y el aviso de prototipo. Se resuelven los conflictos sin cambiar archivos de `datos/tanda_6_29`, su manifiesto, sus geometrías ni el preparador. Las atribuciones/licencias permanecen visibles; la descarga técnica de vías y los metadatos completos están en la Ficha técnica plegable. Las pruebas exigen conservar cada campo original, las advertencias, el conteo «—» y el detalle de los errores.

Se repitió una observación por capa y tamaño, con el mismo servidor local que comprime JS/JSON, red simulada de 1,6 Mbit/s y 150 ms, caché deshabilitada y contexto nuevo. Mapa base y Supabase simulados; no son tiempos de un teléfono físico ni de Pages. Se comprobó dibujo efectivo y ausencia de errores JavaScript. Los bytes solicitados se mantienen respecto a la validación inicial.

| Capa | Pantalla | Bytes de capa | Lector frío adicional | Tiempo |
|---|---|---:|---:|---:|
| Drenaje sencillo | Escritorio | 1.267.267 | 37.678 | 7,390 s |
| Drenaje sencillo | Celular | 1.267.267 | 37.678 | 7,439 s |
| Vías y caminos | Escritorio | 34.123 | 37.678 | 0,985 s |
| Vías y caminos | Celular | 34.123 | 37.678 | 0,971 s |

[Mediciones de integración](integracion_main.json) · Menús móviles con los textos ciudadanos: [drenaje](vistas/drenaje_sencillo_menu_integrado_390.png), [vías](vistas/vias_y_caminos_menu_integrado_390.png). Las comparaciones originales de trazado siguen siendo aplicables: los archivos cartográficos no se regeneraron.

Validación de la integración: **`npm test -- --workers=2`: 182 pruebas aprobadas**, incluidas las comprobaciones de fidelidad, foco, atribución independiente, fichas, errores/reintentos y recorrido móvil. Los resultados de Actions/Gitleaks del commit actualizado se registran en el PR.
