# Correcciones de la revisión del PR #59

Revisión de Claude sobre `682809b`, atendida en la misma rama. Se incorpora main `be8d973` (incluye #51). No hay diferencias respecto a main en datos cartográficos, catálogo de determinantes ni vendor.

## Redacción revisada

Se revisaron las diferencias de las frases completas, sin sustituciones globales de palabras. Los cambios públicos se redactaron según su función:

| Área | Resultado |
|---|---|
| Búsquedas | «Intenta con otra palabra o selecciona una carpeta diferente» y «Intenta con otro filtro…». Se ejercitan búsquedas reales sin resultados. |
| Biblioteca y documentos | Explican el acceso mediante Google Drive y sus permisos; no prometen una revisión futura previa a una publicación que ya existe. El enlace no concede derechos de reutilización. |
| Informes | «Consultar informe» y explicación del enlace autorizado, sin guardar ni cambiar su publicación. |
| Seguimiento | Los registros del navegador se identifican como cálculos no oficiales; no se convierten en reportes publicados. No se cambia la matriz ni el cálculo. |
| Certificados | Página informativa redactada completa; ya no expone textos ni controles del simulador. |
| Geovisor y avisos | Versión inicial y cifras del navegador no oficiales; recuento de 33 determinantes. Archivos agregados por la persona se identifican como cargados en este navegador. |
| Oportunidades | «No hay oportunidades publicadas en este momento». Los borradores conservan su condición de no publicados. |

Los cuatro scripts antiguos de edición de certificados, V16 y roles se restauran exactamente desde main; también sus textos y códigos internos originales. No se renombran estados, claves de almacenamiento ni prefijos para aparentar un trámite real. Su HTML se conserva dentro de contenedores ocultos e inertes, con `aria-hidden`; CSS mantiene ocultos los accesos y el panel local. Estos módulos no están en la navegación ni en el recorrido de teclado. La matriz de 57 indicadores y el catálogo documental embebido son idénticos a main.

## Información de Certificados

Incluye propósito del certificado, información para orientar la consulta, normativa general y `pod@amazonas.gov.co`, con «La solicitud en línea estará disponible próximamente». No tiene formulario ni carga de archivos. No inventa documentos obligatorios, tarifas o plazos: los requisitos y la competencia deben confirmarse con la entidad responsable.

Las referencias enlazan a fuentes oficiales: [Ley 99 de 1993](https://www.minambiente.gov.co/documento-normativa/ley-99-de-1993/), [Ley 388 de 1997](https://www.funcionpublica.gov.co/eva/gestornormativo/norma.php?i=339) y [Decreto 1076 de 2015](https://bpm.minambiente.gov.co/index.php/normativa/decretos?id=2093). Se presentan como marco ambiental y territorial, no como regulación específica de este trámite.

Capturas revisadas: [1280×720](vistas/certificados_info_1280.png) y [390×844](vistas/certificados_info_390.png), página completa y sin desbordamiento horizontal. No se usaron datos personales reales.

## Pruebas e integración

- `npm test -- --workers=2`: **194 aprobadas, 3,5 minutos**. Las cuatro nuevas pruebas verifican información, navegación, contenedores inertes, búsquedas y registros locales ficticios rotulados como no oficiales; también comprueban que no se envían solicitudes.
- Las pruebas de foco de las etapas antiguas se conservan. Solo en su entorno aislado se muestra el formulario archivado para comprobar el anillo y contraste originales. Las pruebas de la página pública recorren ahora sus enlaces informativos. No se reducen las aserciones de contraste, visibilidad ni píxeles.
- Tanda 6: se mantienen dibujo, atribución, teclado, errores y carga diferida. Se comprueba que las peticiones de teselas llevan el SHA publicado y se adapta la comparación de rutas al parámetro de versión.
- Main y esta rama conservan idénticos datos, geometrías y dependencias. La resolución de `v19.js` añade la revalidación del catálogo de tanda 6 y conserva el menú de main.

## Red lenta: capas incorporadas de #51

Una medición por capa y tamaño, con el mismo entorno local del LEEME: Chromium, 1,6 Mbit/s, latencia de 150 ms, caché HTTP deshabilitada, contextos nuevos, servidor con rangos reales. Mapa base y servicios externos sustituidos; no es una medición de teléfono físico ni de GitHub Pages. Se mide desde activar la capa hasta comprobar la carga y el dibujo. El lector frío añade 37.678 bytes.

| Capa | Pantalla | Bytes de capa | Tiempo (s) |
|---|---|---:|---:|
| Drenaje sencillo | 1280×720 | 1.267.267 | 7,992 |
| Vías y caminos | 1280×720 | 34.123 | 0,921 |
| Drenaje sencillo | 390×844 | 1.267.267 | 7,976 |
| Vías y caminos | 390×844 | 34.123 | 1,936 |

Las cuatro mediciones dibujaron sin errores JavaScript y con todos los rangos HTTP 206 y el SHA esperado. [Resultados completos](revision59-red.json). Se conservan por separado las doce mediciones previas de las otras seis capas.
