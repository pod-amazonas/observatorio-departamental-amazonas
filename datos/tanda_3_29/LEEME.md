# Tanda 3: entrega parcial revisable

Prototipo. Se proponen dos capas pequeñas y dos entradas pendientes, sin geometrías publicadas para las pendientes. Solo Alejandro fusiona. No se alteran los originales ni se publican datos excluidos, metadatos XML internos o rutas privadas.

## Preparación y control

Las cuatro capas del encargo se abrieron con OpenFileGDB en modo lectura. Primero se revisaron atributos sin cargar geometrías. GDAL 3.13.3 / PROJ reproyectó las copias XY desde MAGNA CTM12 a OGC:CRS84, longitud/latitud. GEOS 3.14.1 validó origen y salida de los puntos publicados. No se recorta, desplaza, simplifica, redondea ni elimina dimensiones de esas salidas. La estructura y los valores de cada punto seleccionado coinciden con la copia auditada; los campos públicos conservan sus valores originales. El residuo máximo de reproyección inversa es inferior a 0,000001 m. No representa precisión de la fuente.

El preparador recibe copias privadas auditadas con huella fija y aplica una selección explícita de FID y campos; rechaza copias diferentes. `python3 scripts/preparar_tanda3_29.py --entrada CARPETA_DE_COPIAS_AUDITADAS` reproduce los dos archivos desde custodia. `python3 scripts/preparar_tanda3_29.py --comprobar` comprueba el paquete sin disco externo ni herramientas GIS. El manifiesto SHA-256 cubre todos los archivos del paquete excepto el propio manifiesto.

## Capas propuestas

- **Equipamientos:** 25 de 106 registros. Solo los tipos literales observados en esta selección: Recreación y deporte (2), Transporte (10), Cultura (2), Administración (1) y Salud (10). Se omiten 13 por precaución de sensibilidad. Otros 68 con nombres genéricos quedan pendientes de identificación, incluidos los siete que no tienen geometría. No se inventan nombres ni se completan posiciones. Fuente: ficha POD 125, Gobernación / DANE, 2022. Todos declaran `ESTADO: Sin Información`: no acredita acceso ni funcionamiento actual.
- **Centros poblados:** 11 cabeceras o asentamientos principales, revisados individualmente y documentados en revision_publicacion.json. Son referencias principales, no un inventario comunitario. Se omiten área, altitud, jerarquía y centralidad. Se conservan los códigos duplicados, provisionales y de distinta longitud, sin corregirlos; el FID es el identificador de la entrega. No unir esta capa por COD_CPOB. Fuentes y fechas literales por punto: DANE 2020 u OCHA Colombia 2010. El metadato también menciona MGN 2021 y talleres POD 2022; no se presenta una fecha uniforme ni vigencia actual.

## Pendientes y decisiones necesarias

**Cobertura_Uso_Tierra_CLC:** copia fiel válida de 11.498 entidades; 90.272.071 bytes brutos y 33.804.252 gzip. No se agrega al repositorio. El mapa POD DB16 indica SINCHI 2020; la ficha 041 está fechada 2021. Estas diferencias quedan visibles. La leyenda agrupada deriva de cob_agrup, sin categorías inventadas. La cobertura observada **no equivale al uso permitido**.

Alejandro autorizó evaluar copias, sin adoptarlas. Se ensayaron 10/25/50 m con preservación topológica por entidad. La cobertura original no cumple la hipótesis de bordes exactamente coincidentes en cinco entidades; no se aplicó una simplificación de cobertura que exige esa hipótesis. Las tres variantes conservan entidades, polígonos y anillos, y validez individual, pero introducen miles de nuevas entidades con bordes no coincidentes. Tampoco cumplen el peso. Las copias experimentales siguen fuera del repositorio.

| Parámetro | Bytes gzip | Nuevas entidades con bordes no coincidentes | Distancia máxima **muestreada**, m |
|---|---:|---:|---:|
| 10 m | 12.236.611 | 8.455 | 17,335 |
| 25 m | 7.860.402 | 9.122 | 41,628 |
| 50 m | 5.314.399 | 9.435 | 87,747 |

La distancia usa hasta 128 vértices por entidad y lado; no es Hausdorff exacta ni una cota continua garantizada. El parámetro del algoritmo no se presenta como desplazamiento máximo medido. evaluacion_clc.json contiene áreas, diferencias simétricas, cambios relativos y huellas. No recomiendo adoptar estas variantes. Una unión por código municipal no conserva la distribución espacial de las coberturas: requeriría otros datos agregados y otro significado. La alternativa pendiente es diseñar consulta por zonas o teselas, sin producirla en este PR.

**Usos_POT_Municipales:** ocho entidades Z/M, cuatro usos en Leticia y Puerto Nariño. La ficha 102 (2022) y los atributos no identifican instrumento, acto, fecha o vigencia de los polígonos. No se exporta, no se descarta M ni se atribuye vigencia por proximidad temática. Se necesita correspondencia con la cartografía del acto aplicable y una decisión explícita sobre dimensiones.

Como referencia externa consultada el 11 de noviembre de 2026, el [servicio oficial del IGAC](https://mapas2.igac.gov.co/server/rest/services/ordenamiento/instrumentospot/MapServer/2) registra Leticia PBOT 2022, Acuerdo 11 del 16 de octubre de 2022, como vigente; su PBOT 2002 figura derogado. Puerto Nariño EOT 2007, Acuerdo 17 del 28 de diciembre de 2007, figura como instrumento vigente con vigencia de largo plazo vencida. referencias_instrumentos.json distingue estos estados y fechas de actualización. Esto no certifica vigencia jurídica actual ni acredita la correspondencia de los ocho polígonos con esos instrumentos.

## Integración y pruebas

Las dos capas se descargan únicamente al encenderlas. El menú muestra fuente, fechas, advertencias y leyenda con los tipos reales y colores del mapa. Conserva transparencia, zoom, error y reintento. Los puntos se consultan con Enter o Espacio; las ventanas se ajustan al mapa en celular. Las dos pendientes tienen controles deshabilitados y no descargan geometrías.

Las pruebas verifican huellas y cobertura del manifiesto, campos permitidos, RFC 7946, códigos originales sin corrección, exclusiones, presupuesto bruto/gzip, controles de todas las capas, foco, leyendas, errores y ausencia de descarga anticipada. Supabase se simula; no se usa producción.

La entrega publicada pesa 6.648 bytes brutos / 1.370 gzip para Equipamientos y 2.577 / 681 para Centros, ambas bajo 1 MB también sin compresión. En la corrida documentada de red local a 1,6 Mbit/s y 150 ms, caché fría, el dibujo de Equipamientos tardó 0,257 s en escritorio y 0,245 s en celular; Centros 0,245 s y 0,315 s. No incluye terminar de cargar la base externa. Las capturas se guardaron tras esperar OpenStreetMap. Resultados y vistas en docs/tanda_3_29; no son una garantía de tiempos en producción.

`npm test`: 142 pruebas aprobadas (4,2 min). No se debilitan las pruebas de foco ni los controles previos; el recorrido incluye las nuevas tarjetas y los interruptores de las capas publicables.
