# observatorio-departamental-amazonas
Prototipo web del Observatorio Departamental del Amazonas — Secretaría de Planeación y Desarrollo Territorial.

## Pruebas automáticas

Requisitos: Node.js 22, npm y Python 3. Desde la raíz, una sola orden instala las dependencias fijadas, Chromium y ejecuta las pruebas:

```sh
npm run test:local
```

La primera ejecución requiere red para descargar dependencias y navegador. En Linux puede ser necesario `npx playwright install --with-deps chromium` para las bibliotecas del sistema. Con todo instalado, `npm test` repite la suite.

Playwright levanta un servidor HTTP exclusivo en `127.0.0.1:8765` y lo cierra al terminar. Comprueba las diez vistas, errores JavaScript, creación del mapa Leaflet, las 33 entradas y la activación/desactivación real de la capa 1. Valida los 20 archivos GeoJSON declarados; las 13 entradas 19–31 no declaran archivo y siguen pendientes de preparación web.

El navegador usa Leaflet 1.9.4 instalado localmente. Todas las solicitudes externas se interceptan: Supabase devuelve un conjunto vacío simulado, la configuración real se sustituye y no se descargan teselas de OpenStreetMap. Esto no valida permisos de Supabase, mapas base ni servicios externos.

GitHub Actions ejecuta la misma suite en cada PR; las acciones están fijadas por SHA y el token tiene solo lectura. Los fallos conocidos se marcan individualmente con `test.fail` y una explicación: si dejan de fallar, Playwright exige retirar la marca. Nunca se ignoran globalmente errores de consola o de geometría.

Resultado local (Chromium, 1280×720): 32 pruebas correctas y 1 fallo esperado. El clic sobre la casilla de la capa 1 queda interceptado por `geo-sidebar`; la activación y desactivación por teclado sí pasan. El fallo tiene una prueba independiente con `test.fail`, sin `force` ni cambios del sitio. También se simula `/api/public/dashboard` con una respuesta vacía.
