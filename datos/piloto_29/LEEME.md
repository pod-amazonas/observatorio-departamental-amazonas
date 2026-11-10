# Piloto #29: publicación autorizada e integración bajo demanda

Alejandro autorizó el 10 de noviembre de 2026 el uso de IGAC, IDEAM y RUNAP para el piloto y las decisiones de cobertura/representación del PR #31. El sitio conserva su condición de prototipo; esta autorización no convierte sus cálculos en cifras oficiales ni acredita una licencia distinta de las fuentes.

| Capa | Entidades | Tratamiento | Fuente / año del encargo | MB gzip6 |
|---|---:|---|---|---:|
| División político-administrativa | 11 | **Representación simplificada**, parámetro 10 m, bordes compartidos conservados | IGAC / 2022 | 0,756 |
| Cuencas que intersectan Amazonas | 19 | Entidades completas, sin recortar ni simplificar | IDEAM / 2022 | 1,190 |
| Áreas protegidas | 5 | Copia fiel, sin cambios | RUNAP / 2021 | 1,365 |

Cuencas y Áreas protegidas superan la meta de 1 MB transferido: son excepciones aceptadas expresamente por Alejandro. gzip6 es una medición local, no una garantía del alojamiento. No se distribuyen solo archivos comprimidos.

- GeoJSON RFC 7946 UTF-8, longitud/latitud WGS84 (CRS84), sin `crs` alternativo. Sin reducción adicional de decimales.
- La selección de cuencas usa GEOS Intersects en el SRC nativo contra la unión de las **11 unidades originales**, no contra la representación simplificada. Incluye contactos de borde y preserva cada entidad completa y sus atributos; las cuencas pueden extenderse fuera del departamento. No son rondas hídricas.
- División es exactamente el candidato evaluado de 10 m: se conservan 11 polígonos y anillos; disminuyen los vértices. Hausdorff discreta de bordes máxima de 9,173 m, sin certificar máximo continuo o precisión normativa. No usar para ubicación exacta, delimitación legal o cálculo de superficies/distancias. Se conserva la advertencia original `Restriccion`.
- Áreas protegidas conserva exactamente la huella del archivo fiel revisado. Cinco registros no equivalen a cinco parques distintos. La escala y vigencia no están acreditadas.
- `adopcion.json` documenta autorización, hashes de entrada/salida y huellas por entidad. `validacion.json` refleja los conteos finales; el diccionario describe solo campos públicos y nombres de los excluidos, sin sus valores. No se incluyen centroides, URLs de atributos ni datos de aislamiento voluntario.
- `SHA256SUMS` cubre exactamente el paquete. La comprobación detecta alteraciones, tratamientos ajenos y conteos incorrectos. La validez GEOS y selección espacial se verifican localmente sin llevar el original a CI.

Verificar con Python 3.9+, sin instalar dependencias ni abrir la geodatabase:

```sh
python3 scripts/preparar_piloto_29.py --comprobar --salida datos/piloto_29
python3 scripts/preparar_piloto_29.py --comprobar --exigir-meta --salida datos/piloto_29
```

El primer comando debe aprobar la integridad; el segundo sigue devolviendo 2 para declarar las dos excepciones de peso. Las pruebas comprueban ambos resultados; no se oculta el sobrepeso para obtener CI verde.

[Informe, reproducción, vistas y red lenta](../../docs/piloto_29/README.md).
