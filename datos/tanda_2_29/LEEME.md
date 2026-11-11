# Tanda 2 del Geovisor

## Puerto

Alejandro autorizó publicar los puntos de IGAC 2022 que intersectan el límite departamental publicado de Amazonas (código 91). GEOS Intersects seleccionó 2 de los 85 registros. Se conservaron íntegros los registros seleccionados, con sus coordenadas y rótulo original.

Peso: 376 bytes brutos y 232 bytes gzip nivel 6. El menú advierte que el dato no garantiza acceso público, operación actual ni seguridad de navegación.

## Capas revisadas pendientes

La geodatabase se abrió en solo lectura. El peso se midió en copias de análisis con los campos de consulta; el presupuesto del encargo es 1 MB transferido. La fecha de creación del archivo cartográfico y el año de medición se documentan por separado.

| Capa | Resultado de la revisión | Peso gzip de análisis |
|---|---|---:|
| Esquemas asociativos territoriales | Cinco registros POD 2022 con un solo rótulo genérico. Falta identificación de los esquemas y el registro 11 falla la validación GEOS en origen. | No se mide una entrega incompleta |
| Coberturas de servicios públicos | Once entidades válidas. DD07 y DD08 documentan las categorías del POD 2022 según SGP y documentos oficiales. DD13 atribuye acceso a internet al CNPV 2018 sin indicar la unidad ni el denominador. | 2.533.581 bytes |
| Índice de pobreza multidimensional | Once entidades válidas. DG12 confirma que IPM son rangos porcentuales de incidencia de pobreza multidimensional de 2018, atribuidos a Prosperidad Social y CEPAL (2021). PM y PE requieren definición independiente. | 2.533.294 bytes |
| Índice de salud y educación | Once entidades válidas. DD04 indica 2020 para ambos índices; la ficha cartográfica corresponde a 2022. La unidad y la fórmula no figuran en esas referencias. | 2.532.337 bytes |

Las tres capas de indicadores quedan pendientes de una decisión sobre el peso. También quedan pendientes las definiciones y unidades indicadas en la tabla. El paquete público de esta revisión contiene Puerto.

## Inundación

La ficha cartográfica 084 del POD fecha la capa departamental en 2022, cita IDEAM 2010 y menciona interpretación de imágenes de 1988, 2000, 2011 y 2012. El catálogo de IDEAM ofrece [susceptibilidad a inundación de 2010 a escala 1:500.000](https://visualizador.ideam.gov.co/CatalogoObjetos/geo-open-data?group=&page=71&search=&size=9&theme=). Su [guía metodológica](https://www.ideam.gov.co/file-download/download/public/2879) describe tres clases, Alta, Media y Baja. Los [servicios de amenaza a escala 1:2.000 por período de retorno](https://visualizador.ideam.gov.co/gisserver/rest/services/Amenaza_Ambiental/MapServer) devolvieron cero registros para Amazonas en cinco consultas por departamento y por envolvente. La capa TR2 aparece publicada el [4 de agosto de 2025](https://www.ideam.gov.co/transparencia/datos-abiertos/seccion-de-datos-abiertos?page=3).

El [archivo oficial de susceptibilidad IDEAM 2010](https://bart.ideam.gov.co/cneideam/capasgeoAlt_New/Zonas_Susceptibles_Inundacion_IDEAM_2010.zip) figura fechado el 28 de mayo de 2024 en el directorio. Se inspeccionó en memoria: 120 entidades, todas válidas según GEOS. El atributo SUSCEPTIBL contiene «Inundación». No existe una correspondencia acreditada con el polígono «Muy baja» del POD, por lo que el resultado no permite confirmar que se haya corregido ese anillo. No se exportó ni incorporó geometría de inundación al paquete.
