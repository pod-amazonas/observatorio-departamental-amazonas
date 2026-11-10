# Piloto #29: copia fiel para revisión

Contiene exclusivamente las tres capas aprobadas. **No es una publicación institucional ni un piloto optimizado aprobado.** Los tres GeoJSON superan la meta de 1 MB transferido y las variantes simplificadas no están adoptadas.

- GeoJSON RFC 7946, UTF-8, coordenadas longitud/latitud WGS84 (CRS84), sin miembro `crs` alternativo.
- 11 entidades administrativas, 202 registros de cuencas y 5 registros de áreas protegidas; se conservan identificadores de origen. Cinco registros no significan cinco parques distintos.
- No se recortan geometrías, disuelven partes, eliminan huecos, simplifican ni reducen decimales. Solo se reproyecta y se invierte el orden de los anillos que lo requieren para RFC 7946.
- `diccionario_campos.json` documenta los campos públicos y los excluidos, sin copiar valores excluidos. Los atributos completos y las geometrías nativas permanecen en custodia interna fuera de GitHub.
- `catalogo_entrega.json` contiene fuentes/años **declarados en el encargo**, rutas relativas, huellas, conteos, transformación, versiones y pesos. No acredita licencia, vigencia o aprobación institucional final.
- `validacion.json` registra comparación local con la fuente y validez GEOS. El residuo numérico de transformación inversa no mide exactitud geográfica en terreno.
- `SHA256SUMS` cubre exactamente los archivos de este paquete. La huella de los GeoJSON es independiente del compresor.
- Los bytes gzip son una medición con nivel 6 y versiones documentadas de Python/zlib. Distintas implementaciones producen tamaños distintos. No se entregan solo `.gz` ni se presupone que el alojamiento tenga compresión configurada.

La capa administrativa advierte que no es apropiada para ubicación exacta de puntos ni cálculos de áreas y distancias; se conserva el texto literal del atributo `Restriccion`. Cuencas incluye regiones fuera de Amazonas: no se ha recortado ni filtrado silenciosamente. La escala de áreas protegidas no está acreditada por valores como `1:1`/`Sin información` de la fuente; ese campo no se presenta como escala válida.

Detalles, evaluación no adoptada, vistas y red lenta: [informe de entrega](../../docs/piloto_29/README.md).

Verificación sin GDAL ni acceso al original:

```sh
python3 scripts/preparar_piloto_29.py --comprobar --salida datos/piloto_29
python3 scripts/preparar_piloto_29.py --comprobar --exigir-meta --salida datos/piloto_29
```

El primer comando comprueba integridad/RFC/esquema y declara los pesos excedidos. El segundo termina con código 2 mientras no se cumpla la meta; las pruebas no ocultan ese resultado. No sustituir esta copia por candidatos simplificados sin revisión de efectos y autorización de adopción.
