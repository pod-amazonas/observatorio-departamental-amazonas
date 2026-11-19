# Tanda 6 — drenaje sencillo y vías

Ampliación de #29 desde main con #50 fusionado. Prototipo de consulta, sin certificación de navegación ni transitabilidad. Se entregan exclusivamente dos fuentes con fecha, licencia y campos públicos identificados. Las otras tres permanecen fuera y se detallan en `pendientes.json` y #29.

## Fuentes, campos y licencias

- **Drenaje_Sencillo:** IGAC 2022, ficha POD 019, cartografía básica 1:25.000. 65.165 registros. Licencia CC BY 4.0 adoptada para los datos abiertos IGAC mediante Resolución 616 de 2020: https://www.igac.gov.co/transparencia-y-acceso-a-la-informacion-publica/normograma/resolucion-616-de-2020 . Campos: `fid_origen` y `ESTADO_DRENAJE`, código categórico literal cuyo diccionario de valores no se acredita. No se inventan interpretaciones ni caudales. **No es una ruta navegable certificada.**
- **Vias_y_Caminos:** © colaboradores de OpenStreetMap, ODbL 1.0. Compilación de 2022 según ficha POD 127, no descarga actual. 1.811 registros. Campos `fid_origen` y `highway`, etiqueta categórica original. **No garantiza transitabilidad, acceso público, estado actual o seguridad del recorrido.** Licencia, atribución y copia fiel abierta separada se detallan en `NOTICE-ODbL.md`.

Ambas fichas describen recortes hechos anteriormente por el productor POD. Esta entrega conserva esos insumos completos: no realiza recortes nuevos ni reconstruye las bases nacionales originales. El SHA-256 de las fichas queda en `fuentes.json`; no se publican sus PDF, contactos ni rutas del equipo. Las unidades son categorías textuales, no indicadores físicos; el año de compilación no es una promesa de actualización. Se excluyen nombres, notas libres, etiquetas auxiliares, datos de operación y longitudes calculadas. Los FID identifican registros fuente, no personas ni rutas certificadas.

## Fidelidad y validez

QGIS suministra GDAL 3.13.3 y GEOS 3.14.1; no se instala nada. OpenFileGDB abre el original en lectura. Se comparan tamaños y fechas de modificación de sus archivos antes/después; no se afirma comparar byte a byte toda la geodatabase. Las copias privadas quedan fuera del repositorio y de la fuente. Si el disco desaparece el preparador se detiene, sin reintentos.

**No se necesita MakeValid ni se adopta ninguna reparación.** Todos los registros son válidos en su representación lineal. `control_geometrias.json` contiene SHA-256 WKB original y lineal por FID, huella de atributos públicos, comparación exacta WKB de la copia nativa releída y control de transformación inversa (< 0,000001 m). Los registros lineales conservan el WKB idéntico.

Drenaje tiene nueve contenedores MultiCurve; solo seis contienen curvas reales: FID 153715, 154134, 155345, 155639, 155701 y 392170. Como en #41, OGR_GetLinearGeometry usa ángulo máximo 4° y OGR_ARC_MAX_GAP=25 m para representar arcos antes de MVT, formato que solo admite segmentos. Esta conversión añade posiciones a lo largo de las curvas y no se presenta como WKB original idéntico ni como reparación de 0 m. Los otros tres contenedores solo se convierten a MultiLineString, conservando las líneas. El control enumera los nueve casos; las demás geometrías son idénticas antes de reproyectar. No se simplifica la referencia ni se mueven manualmente vértices. Las seis curvas requieren aproximación de representación, igual que en el método autorizado del #41.

## Teselas

Se reutiliza el lector local PMTiles del #41, sin nuevas dependencias ni CDN. Cada capa ocupa una plaza del límite de ocho y se descarga solo al encenderla, por rangos HTTP 206. Interruptor de teclado, transparencia, zoom, estado y error/reintento permanecen en el menú. La atribución OSM de la capa es independiente del mapa base.

GDAL genera niveles 5–12, EXTENT=4096, BUFFER=80, SIMPLIFICATION=1 y SIMPLIFICATION_MAX_ZOOM=0, MAX_SIZE=100.000.000 y MAX_FEATURES=200.000. No hay simplificación previa; MVT exige cuantización y fragmentación aun con simplificación cero. Por encima de zoom 12 se amplía el último nivel y no aumenta la precisión. La unidad MVT representa metros Web Mercator: 305,748 en z5, 152,874 en z6, 76,437 en z7, 38,219 en z8, 19,109 en z9, 9,555 en z10, 4,777 en z11 y 2,389 en z12. Son celdas de representación, no una garantía de desplazamiento terrestre máximo. En zoom 12 no se distinguen 10 drenajes y una vía, con extensiones aproximadas inferiores a 2 m: colapsan en la celda de 2,389 m, incluso sin simplificación. No se afirma que todas las entidades originales aparezcan en el archivo MVT. Los originales y la referencia nativa mantienen todos los registros; la copia descargable de vías también conserva el segmento 772. Los identificadores exactos se enumeran en la auditoría y el comprobador exige ese conjunto, para detectar pérdidas adicionales.

La auditoría enumera por nivel las entidades que no se distinguen por cuantización/generalización; las teselas no son apropiadas para conteos, longitudes oficiales ni reconstrucción de geometrías completas.

## Fuentes aplazadas

- **Cobertura_Uso_Tierra_CLC:** ficha SINCHI 2021 a 1:100.000; falta licencia de ese producto. La licencia del mapa 2024 o de los productos 2021 a 1:25.000 no se aplica automáticamente. No se preparan teselas ni se añade interruptor. Cuando se habilite, debe mostrar año y leyenda CLC, y aclarar que cobertura observada no equivale a uso permitido.
- **BIC_Declarados:** la declaratoria coincide con el registro nacional, pero no acredita por sí sola licencia de reutilización del punto suministrado ni publicabilidad sin reserva/sensibilidad. No se exportan sus coordenadas ni direcciones.
- **Distribucion_de_Poblacion:** fecha 2020 en ficha y DANE 2022 en descripción, sin época censal inequívoca ni licencia acreditada. El esquema incluye hogares, unidades finas y coordenadas. No se leen filas/geometrías ni se generan centroides, mapas o agregaciones. Se requiere una tabla autorizada de totales por unidades amplias, con año/unidad/licencia, para unir a la División publicada.

## Reproducción

```sh
python3 scripts/preparar_tanda6_29.py --gdb FUENTE_GDB --privado CARPETA_ANALISIS --gdal-library LIBGDAL --geos-library LIBGEOS
python3 scripts/preparar_tanda6_29.py --integrar CARPETA_ANALISIS
python3 scripts/preparar_tanda6_29.py --comprobar
npx playwright test tests/tanda6.spec.js
```

Los nombres de argumentos anteriores son simbólicos. El modo de comprobación funciona con Python estándar, sin GIS, red o disco externo, y rechaza archivos no autorizados aun si se recalcula el manifiesto. `SHA256SUMS` cubre todos los archivos del paquete excepto sí mismo. `auditoria_teselas.json` vuelve a leer todas las teselas y valida tipo lineal, FID y atributos públicos contra las referencias. Medidas, pesos exactos y vistas en `docs/tanda_6_29/LEEME.md`.
