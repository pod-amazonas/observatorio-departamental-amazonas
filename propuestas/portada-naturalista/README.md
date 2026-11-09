# Propuesta de portada naturalista

Vista previa independiente para el issue #27. Abrir `/propuestas/portada-naturalista/` desde el servidor de pruebas (`python3 tests/serve.py`). No sustituye la portada de `index.html` ni se enlaza desde ella.

## Dirección visual

Paisaje amazónico ilustrativo, paleta verde con luz cálida, río sinuoso y vegetación en planos. Ilustración SVG original incluida en el HTML, sin descargas de imágenes, fuentes ni librerías externas. Movimiento lento en bruma, reflejos, hojas, aves y embarcación. La elección de escena es manual, sin alternancia automática mientras se lee. Ríos muestra delfines rosados que saltan y se sumergen; Selva, dosel y vuelo de guacamayas y otras aves; Territorio, una panorámica distinta de bosque, claros y agua; Movilidad, un río abierto con dos botes en sentidos contrarios. Solo la escena visible se anima.

La ilustración no es un mapa ni representa límites, ubicaciones comunitarias o lugares reales. No consulta Supabase, datos cartográficos ni servicios externos. Los enlaces llevan al prototipo existente. Se conservan los logos del POD y del Amazonas, también en móvil.

## Accesibilidad y verificación

- Botones HTML con nombre, estado `aria-pressed`, foco visible y selección con teclado.
- Control para pausar todas las animaciones; conserva la pausa al cambiar de escena.
- `prefers-reduced-motion` inicial y dinámico; respaldo `addListener`. La pausa manual se conserva al cambiar la preferencia.
- Pruebas específicas en `tests/portada-propuesta.spec.js` a 1280 y 390 px. Comprueban tiempo real de animación, teclado, escenas, logos, desbordamiento, ausencia de solicitudes externas y de errores JavaScript.
- Ejecutar `npm test` antes de abrir el PR.

## Pendiente de decisión visual

Alejandro revisa la dirección visual antes de integrarla en la portada pública. No reemplaza los seis módulos ni la franja de entidades del portal: los tres accesos de esta maqueta solo muestran la propuesta de jerarquía. La integración deberá conservar todos los módulos, compatibilizarse con #22 y pasar las pruebas completas de foco y contraste. No incluye el inventario de capas, revisión cartográfica ni aprobación institucional.

## Resultado local de esta entrega

`npm test`: **73 pruebas aprobadas**, incluidas cinco de esta propuesta y la suite existente de la portada publicada. Capturas revisadas a 1280 y 390 px: logos cargados, sin desbordamiento horizontal. El HTML/SVG, CSS y JavaScript de la propuesta suman aproximadamente 47 KB sin comprimir, más los dos logos locales existentes. No se midió rendimiento en un dispositivo de gama baja real.
