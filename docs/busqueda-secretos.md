# Búsqueda de secretos

El workflow `Búsqueda de secretos` se ejecuta en cada PR. Descarga todo el
historial (`fetch-depth: 0`) y analiza las referencias disponibles, incluido el
commit de prueba de fusión del PR, con `gitleaks git --log-opts="--all"`.
Solo necesita `contents: read`; no conserva credenciales del checkout ni
modifica protecciones. Alejandro decide si convierte este trabajo en obligatorio.

Se usa Gitleaks CLI 8.30.1 sin licencia ni token adicional. La acción de checkout
está fijada por SHA y el binario por versión y SHA-256 de la
[publicación oficial](https://github.com/gitleaks/gitleaks/releases/tag/v8.30.1).
Al actualizarlo, verificar nuevamente ambos valores.

## Lista permitida

`.gitleaks.toml` extiende todas las reglas predeterminadas. La única excepción
afecta a `generic-api-key`: valores con formato `sb_publishable_…` exclusivamente
en `V20_FORMULARIO_BORRADORES/config_supabase.js`. Deben coincidir **ruta y
formato**; no se excluye el archivo completo ni claves `sb_secret_…`, JWT o
`service_role`. No se admiten excepciones mediante comentarios `gitleaks:allow`.

La clave publicable de Supabase identifica al cliente web y está diseñada para
ser visible en el navegador; no es un secreto. La autorización depende de las
políticas del servidor, que este trabajo no valida ni modifica. No se accede a
Supabase durante el análisis.

## Verificación local y respuesta a fallos

Instalar el binario de la misma versión y verificar su checksum oficial. Ejecutar
desde una copia con historial completo:

```sh
gitleaks git --config .gitleaks.toml --log-opts="--all" \
  --ignore-gitleaks-allow --redact=100 --no-banner --log-level error
```

CI conserva la salida solo en el directorio temporal del ejecutor, sin subir
informes, autores ni fragmentos a logs o artefactos. El fallo muestra un aviso
genérico: puede ser una detección o un error del escáner. Alejandro debe repetir
el análisis en un entorno privado para distinguirlos. No copiar resultados con
secretos o datos personales a GitHub. Si se confirma un secreto real, avisarle
por un canal privado para revocarlo o rotarlo; no basta con borrarlo del archivo.
Documentar un falso positivo con una excepción mínima y justificada en un PR.

El análisis por patrones no garantiza ausencia de secretos, no revisa contenido
fuera de Git ni sustituye una revisión humana.
