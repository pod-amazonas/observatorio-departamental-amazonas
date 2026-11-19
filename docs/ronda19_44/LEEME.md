# Determinante 19 — integración y estado de comprobación

Decisión del equipo POD del 18 de noviembre, #29 y #44. Rama independiente `codex/44-ronda-19`, desde main `df1a50b`; no contiene los cambios del PR #51.

## Datos e integridad

OBJECTID 19 de Determinantes_Ambientales_CAR se conserva sin ajustes: 554 polígonos, 731 anillos y 470.634 posiciones, válida en GEOS. El WKB original y el de la copia nativa releída comparten SHA-256 `2c60f8a2a4c1ab72abe471654ae75169a301d422574bd662be6f733757d6436f`. No se ejecutó MakeValid ni se recortó, trasladó o simplificó la fuente. Se documenta la diferencia previa de unos 53 m con Rondas_Hidricas FID 1 sin corregirla.

Las doce rondas publicadas mantienen exactamente sus 96 huellas de geometría/atributos por zoom. Se agregan ocho controles de la 19, también iguales antes/después de unir: 104 pares en total. El archivo actual tiene 23.128.497 bytes y 1.823 teselas. La 19 no hereda fid_ronda, Fuente_hidrica ni Longitud_buffer del FID 1. Los campos ausentes no se inventan.

La nueva 19 usa simplificación 0 en todos los niveles 5–12; la cuantización y fragmentación propias de MVT se distinguen de la conservación exacta de la copia nativa. El [LEEME del paquete](../../datos/rondas_46/LEEME.md) detalla fuente, parámetros, observación y reproducción.

## Interfaz y pruebas

Un archivo y un interruptor para las trece rondas. La 19 aparece en la lista y en la consulta, con su norma. La observación técnica queda en la ficha. La ayuda indica 33 de 33 registros de determinantes disponibles, en 21 capas, sin pendientes. La regla POD se conserva en AGENTS.md para las próximas tandas.

Nueve pruebas unitarias Python aprobadas, incluyendo la unión de la 19 sin inventar atributos de la otra fuente. El comprobador verifica las huellas anteriores y nuevas, campos, manifiesto y estado del catálogo sin GIS ni disco externo. La sintaxis JavaScript y `git diff --check` son correctos.

La ventana mantiene un formato uniforme y la observación permanece en la ficha. La prueba espera la respuesta exacta de cada consulta antes de medir sus límites, sin relajar las aserciones. Los recorridos de las trece determinantes pasaron cinco repeticiones en cada tamaño: **10 pruebas aprobadas en 54,2 s**. La suite completa y Actions/Gitleaks se registran en el PR.

## Medición de conexión lenta

Seis observaciones locales con Chromium, 1280×720 y 390×844, red emulada de 1,6 Mbit/s y 150 ms, caché deshabilitada y lector frío. Se simula el mapa base para aislar la capa; las capturas usan el mapa real. No son mediciones de teléfono físico ni de Pages.

| Pantalla | Zoom inicial | Bytes PMTiles | Rangos | Tiempo observado |
|---|---:|---:|---:|---:|
| Escritorio | 7 | 645.442 | 7 | 4,052–4,102 s |
| Celular | 6 | 428.045 | 4 | 2,980–2,991 s |

Se suman 37.678 bytes del lector compartido frío. Los resultados están en `mediciones.json`. Las imágenes de `vistas/` corresponden a la interfaz final: [menú de escritorio](vistas/menu_1280.png), [menú móvil](vistas/menu_390.png), [consulta de la 19 en escritorio](vistas/consulta_1280.png) y [consulta de la 19 en celular](vistas/consulta_390.png). La observación técnica figura en la ficha, y la ventana identifica el polígono consultado.

Resultado local final: **npm test: 173 pruebas aprobadas en 3,8 min**. Sin pruebas omitidas ni aserciones debilitadas. Actions y Gitleaks se registran en el PR.
