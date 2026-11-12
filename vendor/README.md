# Dependencias locales del navegador

Copias sin modificar de los paquetes oficiales npm. Leaflet 1.9.4 (BSD-2-Clause) y @supabase/supabase-js 2.118.0 (MIT, última versión estable 2.x consultada el 2026-11-03). Las licencias completas se incluyen junto a cada distribución. El UMD de Supabase incorpora sus dependencias de navegador. La POC añade protomaps-leaflet 5.1.0 (BSD-3-Clause), con avisos de sus dependencias permisivas; el sitio lo solicita solo al activar el drenaje en teselas.

Origen de los paquetes:
- https://registry.npmjs.org/protomaps-leaflet/-/protomaps-leaflet-5.1.0.tgz
- https://registry.npmjs.org/leaflet/-/leaflet-1.9.4.tgz
- https://registry.npmjs.org/@supabase/supabase-js/-/supabase-js-2.118.0.tgz

Las URLs por archivo identifican el mismo contenido publicado en npm; el sitio no las solicita. Se conservan todas las imágenes de Leaflet y su mapa de fuentes para evitar recursos locales faltantes.

| Archivo (relativo a vendor/) | Versión | Licencia | Origen | SHA-256 |
| --- | --- | --- | --- | --- |
| `leaflet-1.9.4/LICENSE` | 1.9.4 | BSD-2-Clause | [origen](https://unpkg.com/leaflet@1.9.4/LICENSE) | `53e8dc25862014e4324741ca18fbe3611e11d42ef69f59f86ea8c5389647d4cb` |
| `leaflet-1.9.4/images/layers-2x.png` | 1.9.4 | BSD-2-Clause | [origen](https://unpkg.com/leaflet@1.9.4/dist/images/layers-2x.png) | `066daca850d8ffbef007af00b06eac0015728dee279c51f3cb6c716df7c42edf` |
| `leaflet-1.9.4/images/layers.png` | 1.9.4 | BSD-2-Clause | [origen](https://unpkg.com/leaflet@1.9.4/dist/images/layers.png) | `1dbbe9d028e292f36fcba8f8b3a28d5e8932754fc2215b9ac69e4cdecf5107c6` |
| `leaflet-1.9.4/images/marker-icon-2x.png` | 1.9.4 | BSD-2-Clause | [origen](https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png) | `00179c4c1ee830d3a108412ae0d294f55776cfeb085c60129a39aa6fc4ae2528` |
| `leaflet-1.9.4/images/marker-icon.png` | 1.9.4 | BSD-2-Clause | [origen](https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png) | `574c3a5cca85f4114085b6841596d62f00d7c892c7b03f28cbfa301deb1dc437` |
| `leaflet-1.9.4/images/marker-shadow.png` | 1.9.4 | BSD-2-Clause | [origen](https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png) | `264f5c640339f042dd729062cfc04c17f8ea0f29882b538e3848ed8f10edb4da` |
| `leaflet-1.9.4/leaflet.css` | 1.9.4 | BSD-2-Clause | [origen](https://unpkg.com/leaflet@1.9.4/dist/leaflet.css) | `a7837102824184820dfa198d1ebcd109ff6d0ff9a2672a074b9a1b4d147d04c6` |
| `leaflet-1.9.4/leaflet.js` | 1.9.4 | BSD-2-Clause | [origen](https://unpkg.com/leaflet@1.9.4/dist/leaflet.js) | `db49d009c841f5ca34a888c96511ae936fd9f5533e90d8b2c4d57596f4e5641a` |
| `leaflet-1.9.4/leaflet.js.map` | 1.9.4 | BSD-2-Clause | [origen](https://unpkg.com/leaflet@1.9.4/dist/leaflet.js.map) | `600a10dc5cd110de0699510d322afcbe01c7ca90b4c5f48adc20314c70aac753` |
| `supabase-2.118.0/LICENSE` | 2.118.0 | MIT | [origen](https://unpkg.com/@supabase/supabase-js@2.118.0/LICENSE) | `334dd6820e2eaeab2064e7c59001b810566728a28a41a7c1dbf69bbee17d0936` |
| `supabase-2.118.0/supabase.js` | 2.118.0 | MIT | [origen](https://unpkg.com/@supabase/supabase-js@2.118.0/dist/umd/supabase.js) | `ee3be8de192b97cb1d73d1e95d6b82bb1f6b658c0f97c4ef757fc331996ed3d3` |

| `protomaps-leaflet-5.1.0/LICENSE` | 5.1.0 | BSD-3-Clause / avisos permisivos | [npm 5.1.0](https://registry.npmjs.org/protomaps-leaflet/5.1.0) | `a2ada548aa25012e833b71364a402d6924f2afcf5f8f146e2989a377290ab3ad` |
| `protomaps-leaflet-5.1.0/README.md` | 5.1.0 | BSD-3-Clause / avisos permisivos | Documentación local y avisos de redistribución | `5281447081a0efe8f3ea84540cfb4f8b9866fba7bd8d2ece253a00598eca681e` |
| `protomaps-leaflet-5.1.0/SHA256SUMS` | 5.1.0 | BSD-3-Clause / avisos permisivos | Documentación local y avisos de redistribución | `c46dd6c99a5162847121b69de032f8037c51a9b12cc386e5393c2520bded5d45` |
| `protomaps-leaflet-5.1.0/THIRD_PARTY_NOTICES.txt` | 5.1.0 | BSD-3-Clause / avisos permisivos | Documentación local y avisos de redistribución | `3a9a8f40254579a5eb635da39789f0fae8aadd20c2ef7ff883f5fa022d18f56b` |
| `protomaps-leaflet-5.1.0/protomaps-leaflet.js` | 5.1.0 | BSD-3-Clause / avisos permisivos | [npm 5.1.0](https://registry.npmjs.org/protomaps-leaflet/5.1.0) | `26af014f7b1af308ec120b791cff76657bb9c3383633b52033e6edf9e5e4cdb5` |
| `protomaps-leaflet-5.1.0/protomaps-leaflet.js.map` | 5.1.0 | BSD-3-Clause / avisos permisivos | [npm 5.1.0](https://registry.npmjs.org/protomaps-leaflet/5.1.0) | `e935835304b66a82eed27132f3a7eca433349cb3f327963d14e5580442936f80` |

## Actualización

1. Consultar `npm view @supabase/supabase-js dist-tags --json` y verificar la última versión estable 2.x (sin beta, canary ni next). Elegir explícitamente la versión de Leaflet.
2. Descargar los tarballs del registro npm con versiones exactas indicadas arriba, extraerlos en un directorio temporal y copiar `dist/leaflet.js`, `dist/leaflet.css`, `dist/leaflet.js.map`, `dist/images/` y `LICENSE` de Leaflet; copiar `dist/umd/supabase.js` y `LICENSE` de Supabase. No recompilar ni modificar los archivos.
3. Crear directorios con la nueva versión y actualizar las rutas relativas en index.html, pod_reportes_publicos.js y las dos páginas administrativas (desde ellas usar `../vendor/`). Actualizar las rutas de las pruebas.
4. Renovar versiones, licencias, orígenes y todos los hashes de esta tabla con `shasum -a 256 vendor/leaflet-*/* vendor/leaflet-*/images/* vendor/supabase-*/*` (omitir directorios). Revisar el diff de la tabla y de las licencias.
5. Ejecutar `npm ci`, `npx playwright install --no-shell chromium` y `npm test`. Las pruebas sirven estas copias reales y simulan las respuestas de Supabase, sin acceder a producción. Abrir PR para revisión; no fusionar automáticamente.
