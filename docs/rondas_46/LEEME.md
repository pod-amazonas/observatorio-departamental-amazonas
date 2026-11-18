> Registro histórico del #47 (doce rondas). La entrega actual incluye la 19: [comprobaciones actualizadas](../ronda19_44/LEEME.md).

# Verificación de la capa única de rondas

Comprobación del 17 de noviembre de 2026, Chromium / Leaflet 1.9.4. Se reúnen las determinantes 20–31 en una capa; la 19 estaba pendiente entonces (#44). [Método y trazabilidad](../../datos/rondas_46/LEEME.md).

## Integridad y comportamiento

La comparación SHA-256 de comandos geométricos, IDs y atributos tipados coincide en los **96 pares determinante/nivel** (12 × niveles 5–12). No se vuelve a teselar. Ocho pruebas unitarias Python pasan, incluidos colisiones de diccionario, UTF-8, cambio de comandos y directorios PMTiles. La entrega única tiene **22.093.851 bytes**, 844.359 menos que las doce anteriores; la mayor tesela comprimida mide 365.897 bytes.

Las nueve pruebas de rondas pasan en escritorio 1280×720 y celular 390×844, este último con toque emulado. Comprueban un solo interruptor, fuente/año/leyenda, doce identificadores informativos, transparencia, zoom, error/reintento, cancelación sin encendido tardío, prefijo de Pages y lector único compartido con drenaje. Las rondas ocupan una sola plaza: junto a siete capas adicionales caben, y una novena se rechaza.

Se toca un punto interior de cada una de las doce determinantes y se verifica su número y norma; un punto dentro de un hueco no devuelve polígonos. Los puntos provienen exclusivamente del MVT público. Las consultas se prueban con zoom de pantalla 16 utilizando los comandos del nivel 12: aumenta el tamaño en pantalla, sin generar detalle nuevo. Para franjas más estrechas que un píxel hay que acercar el mapa. También se comprueba la consulta con teclado y el cierre al apagar.

Se reutiliza una única ventana para evitar duplicados durante el desvanecimiento de Leaflet. Su ancho y altura se adaptan al mapa y se centra con un único desplazamiento sin animación. Cada una de las doce consultas exige que toda la ventana permanezca dentro del mapa, también en celular. Se descartan resultados tardíos al apagar, cambiar de vista o iniciar otra consulta.

La ayuda visible indica **32 de 33 registros disponibles en 21 capas de determinantes**, y una pendiente (19). No se cuentan los fragmentos como entidades ni se calculan superficies a partir de teselas.

## Conexión lenta simulada

Tres cargas frías por tamaño, **1,6 Mbit/s y 150 ms**, sin limitar CPU, DPR 1. Cada carga usa un contexto nuevo, caché HTTP deshabilitada y lector frío. Los tiempos van desde iniciar la pulsación del interruptor hasta acabar la carga de teselas y dos cuadros del navegador; se confirma que haya píxeles azules realmente pintados. No representan un teléfono físico ni una garantía de velocidad de producción.

Para aislar la capa, **OSM se simula con una imagen mínima durante los tiempos**. Supabase está simulado, sin producción. El HTML, CSS, catálogos y módulo de interfaz se cargan antes de iniciar la medición. Los bytes son cuerpos codificados PMTiles y lector, sin cabeceras, recursos iniciales ni costo real del mapa base. El servidor local aplica gzip a JS/JSON y sirve rangos HTTP 206; las teselas ya llevan compresión interna.

| Pantalla | Mediana | Mínimo–máximo | Bytes PMTiles | Bytes lector | Total al activar | Rangos |
|---|---:|---:|---:|---:|---:|---:|
| Escritorio 1280×720 | 3,886 s | 3,874–3,924 s | 597.941 | 37.678 | 635.619 | 7 |
| Celular 390×844 | 2,882 s | 2,853–2,884 s | 400.472 | 37.678 | 438.150 | 4 |

Las seis mediciones completas están en [mediciones.json](mediciones.json). La activación centra la extensión conjunta (zoom 7 en escritorio, 6 en celular); no es una descarga de los 22,09 MB completos. No se registran errores JavaScript. Estos tiempos corresponden a las doce determinantes visibles juntas; los documentos históricos del #45 medían cada archivo individual por separado.

## Capturas

Las capturas se toman en una ejecución separada, con **OSM real y red sin limitar**, conservando fuente, año, leyenda, estado y aviso de la 19. La captura de menú muestra el panel desplazable, no expande artificialmente su contenido; los controles y la lista completa son accesibles al desplazarlo. La consulta muestra la determinante 20 como ejemplo; las doce se verifican automáticamente.

| Pantalla | Menú | Vista general | Consulta |
|---|---|---|---|
| Escritorio | [Ver](vistas/menu_1280.png) | [Ver](vistas/mapa_1280.png) | [Ver](vistas/consulta_1280.png) |
| Celular | [Ver](vistas/menu_390.png) | [Ver](vistas/mapa_390.png) | [Ver](vistas/consulta_390.png) |

A zoom de pantalla 16 se amplía la representación del nivel 12; no se acredita una precisión mayor. La disponibilidad del mapa base externo puede dejar zonas grises mientras llega una tesela; no se incluye su tiempo en la tabla ni se certifica alineación contra OSM.

## Pruebas y publicación

`npm test`: **160 pruebas aprobadas en 4,3 min**. La batería local completa verifica foco real con Tab, contraste y regresiones del sitio sin modificar los archivos reservados del PR #22. El resultado final y los enlaces de Actions/Gitleaks se registran en el PR. Los manifiestos se comprueban sin QGIS mediante `python3 scripts/preparar_rondas43.py --comprobar`; los casos del empaquetador se ejecutan con `python3 -m unittest discover -s tests -p 'test_*rondas*.py'`.

Los nuevos archivos aún no se han desplegado mientras el PR siga abierto. Después de fusionar debe verificarse HTTP 206/Content-Range de la URL nueva en Pages. No se modifica infraestructura ni se presenta el resultado como portal oficial. Las teselas mantienen los límites de cuantización del #45 y se usan para consulta visual, no reconstrucción, superficies oficiales o navegación. La discrepancia de la ronda 19 permanece en #44.
