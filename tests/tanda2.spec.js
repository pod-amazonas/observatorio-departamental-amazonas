const {test,expect}=require('@playwright/test');
const {readFileSync,readdirSync}=require('node:fs');
const path=require('node:path');
const {createHash}=require('node:crypto');
const {gzipSync}=require('node:zlib');
const {hint}=require('@mapbox/geojsonhint');
const dir=path.join(__dirname,'../datos/tanda_2_29');
const catalog=require('../datos/tanda_2_29/catalogo_entrega.json');
const dictionary=require('../datos/tanda_2_29/diccionario_campos.json');
const quality=require('../datos/tanda_2_29/validacion.json');
const sha=data=>createHash('sha256').update(data).digest('hex');

test('tanda 2: integridad, campos públicos, RFC 7946 y presupuesto de transferencia',()=>{
 const entries=readFileSync(path.join(dir,'SHA256SUMS'),'utf8').trim().split('\n').map(line=>line.split('  '));
 const actual=readdirSync(dir,{recursive:true,withFileTypes:true}).filter(entry=>entry.isFile()&&entry.name!=='SHA256SUMS')
  .map(entry=>path.relative(dir,path.join(entry.parentPath??entry.path,entry.name)).split(path.sep).join('/'));
 expect(entries.map(([,file])=>file).sort()).toEqual(actual.sort());
 for(const [hash,file] of entries)expect(sha(readFileSync(path.join(dir,file))),file).toBe(hash);
 for(const row of catalog){
  const data=readFileSync(path.join(dir,row.ruta_relativa)),geojson=JSON.parse(data);
  expect(sha(data)).toBe(row.sha256);
  expect(data.length).toBe(row.bytes);
  expect(row.bytes_gzip_6).toBeLessThanOrEqual(1_000_000);
  expect(gzipSync(data,{level:6}).length).toBeLessThanOrEqual(1_000_000);
  expect(hint(geojson,{precisionWarning:false}),row.id_capa).toEqual([]);
  expect(geojson.features).toHaveLength(row.entidades);
  const fields=dictionary[row.id_capa].filter(field=>field.publico).map(field=>field.origen).sort();
  for(const feature of geojson.features)expect(Object.keys(feature.properties).sort()).toEqual(fields);
  expect(quality[row.id_capa]).toMatchObject({validez_geos_origen_y_salida:true,recorte:false,simplificacion:false});
  if(row.id_capa==='puerto'){
   expect(quality.puerto).toMatchObject({total_origen:85,seleccion:85});
   expect(row.nombre_publico).toBe('Puertos y embarcaderos según IGAC 2022');
   expect(fields).toEqual(['NOMBRE_GEOGRAFICO']);
   expect(geojson.features.every(feature=>feature.geometry.type==='Point')).toBe(true);
  }
 }
});
