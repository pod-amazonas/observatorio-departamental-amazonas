const {abrirFicha,errorDeCapa,sinConteo}=require('./helpers/fichas.cjs');
const {test, expect} = require('@playwright/test');
const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto');
const {spawnSync} = require('node:child_process');
const {abrirCapa} = require('./helpers/geovisor.cjs');
const root = path.resolve(__dirname, '..');
const folder = path.join(root, 'datos/tanda_5_29');
const catalog = require('../datos/tanda_5_29/catalogo_entrega.json');
const points = require('./fixtures/tanda5_puntos.json');
const card = (page, id) => page.locator('[data-tanda5-layer="' + id + '"]');
test.beforeEach(async ({page}) => {
  await page.route('**/*', route => {
    const u = new URL(route.request().url());
    if (u.hostname === '127.0.0.1') return u.pathname.endsWith('/config_supabase.js')
      ? route.fulfill({contentType: 'application/javascript', body: 'window.POD_CONFIG={url:"https://test.invalid",publishableKey:"sb_publishable_test"}'}) : route.continue();
    return route.fulfill({json: u.pathname.startsWith('/rest/v1/') ? [] : {}});
  });
});
test('tanda 5: fidelidad, campos públicos, niveles reales y exclusión de fuentes pendientes', () => {
  const result = spawnSync('python3', ['scripts/preparar_tanda5_29.py'], {cwd: root, encoding: 'utf8'});
  expect(result.status, result.stderr || result.stdout || result.error?.message).toBe(0);
  // Un manifiesto recalculado no debe autorizar un archivo de otra fuente.
  const exclusion = spawnSync('python3', ['-c', `
import sys,tempfile,shutil
from pathlib import Path
sys.path.insert(0,'scripts')
import preparar_tanda5_29 as m
with tempfile.TemporaryDirectory() as tmp:
 target=(Path(tmp)/'paquete').resolve();shutil.copytree(m.OUT,target);m.OUT=target
 (target/'capas').mkdir();(target/'capas/territorios_colectivos.geojson').write_text('{}')
 m.manifest()
 try:m.check()
 except AssertionError as e:
  assert 'fuera del alcance' in str(e)
 else:raise SystemExit('Se admitió un archivo de una fuente aplazada')
`], {cwd: root, encoding: 'utf8'});
  expect(exclusion.status, exclusion.stderr || exclusion.error?.message).toBe(0);

  const control = require('../datos/tanda_5_29/control_geometrias.json');
  expect(control.reparaciones).toEqual([]);
  expect(control.capas.map(c => c.entidades)).toEqual([2, 138]);
  for (const c of control.capas) for (const r of c.registros) {
    expect(r.sha256_wkb_usada).toBe(r.sha256_wkb_original);
    expect(r.wkb_gpkg_identica && r.valida_nativa && r.valida_copia_crs84).toBe(true);
  }
  expect(catalog.map(c => c.id_capa)).toEqual(['amenaza_incendios_forestales', 'amenaza_remocion_masa']);
  expect(fs.readdirSync(path.join(folder, 'teselas')).sort()).toEqual(catalog.map(c => c.id_capa + '.pmtiles').sort());
  for (const c of catalog) {
    expect(c.vector_tiles).toBe(true);
    expect(crypto.createHash('sha256').update(fs.readFileSync(path.join(folder, c.ruta_relativa))).digest('hex')).toBe(c.sha256);
    expect(c.campos_publicos).toEqual(c.id_capa.includes('incendios') ? ['fid_origen', 'Nivel_Amenaza'] : ['fid_origen', 'GRADO', 'CATEGORIA']);
    expect(c.leyenda.map(l => [l.valor, l.entidades])).toEqual(c.id_capa.includes('incendios') ? [['Baja', 1], ['Muy Baja', 1]] : [['Media', 2], ['Muy Baja', 136]]);
  }
  expect(catalog[0].anio_declarado_encargo).toBe(2010);
  expect(catalog[0].restricciones).toContain('No informa incendios activos');
  const pending = require('../datos/tanda_5_29/pendientes.json');
  expect(pending).toHaveLength(5);
  expect(pending.find(r => r.origen === 'Territorios_Colectivos').motivo).toContain('No se leyeron geometrías ni atributos de localización');
  const audit = require('../datos/tanda_5_29/auditoria_teselas.json');
  for (const a of audit) expect(a.por_zoom.find(z => z.zoom === 12).ids).toHaveLength(catalog.find(c => c.id_capa === a.id_capa).entidades);
});

// Leer el píxel del lienzo en el punto consultado, sin mezclarlo con el mapa base.
async function pixel(page, point) {
  return page.evaluate(q => {
    const e = window.obs19Api.getLayers().find(e => e.idCitizen === q.id_capa);
    if (!e) return null;
    const m = window.obs19Api.getMap(), p = m.latLngToContainerPoint([q.lat, q.lng]), r = m.getContainer().getBoundingClientRect();
    for (const c of [...e.layer.getContainer().querySelectorAll('canvas')].reverse()) {
      const cr = c.getBoundingClientRect();
      if (!cr.width || !cr.height) continue;
      const x = Math.floor((r.left + p.x - cr.left) * c.width / cr.width), y = Math.floor((r.top + p.y - cr.top) * c.height / cr.height);
      if (x < 0 || y < 0 || x >= c.width || y >= c.height) continue;
      const rgba = [...c.getContext('2d').getImageData(x, y, 1, 1).data];
      if (rgba[3] > 15) return rgba;
    }
    return null;
  }, point);
}
for (const width of [1280, 390]) test('tanda 5: teclado, leyenda y color real de cada categoría a ' + width, async ({page}) => {
  test.setTimeout(120000);
  await page.setViewportSize({width, height: width === 390 ? 844 : 720});
  await page.emulateMedia({reducedMotion: 'reduce'});
  const requests = []; page.on('request', r => requests.push(r.url()));
  await page.goto('/#geovisor');
  await expect(page.locator('[data-tanda5-layer]')).toHaveCount(2);
  expect(requests.filter(u => new URL(u).pathname.endsWith('.pmtiles') || u.endsWith('/protomaps-leaflet.js'))).toEqual([]);
  await page.waitForFunction(() => window.obs19Api?.getMap?.());
  for (const row of catalog) {
    await page.evaluate(() => window.obs19Api.getMap().setView([-1.5, -71.5], 6, {animate: false}));
    const c = card(page, row.id_capa); await abrirCapa(c);
    await expect(c).toContainText(row.fuente_declarada_encargo);
    await expect(c).toContainText(String(row.anio_declarado_encargo));
    await expect(c).toContainText(row.restricciones);
    for (const l of row.leyenda) await expect(c.getByRole('list')).toContainText(l.valor);
    expect(JSON.parse(await c.locator('.obs53-metadata').textContent()).leyenda).toEqual(row.leyenda);
    const sw = c.getByRole('switch'); await sw.focus(); await sw.press('Space');
    await expect(sw).toHaveAttribute('aria-checked', 'true'); await expect(sw).toHaveAttribute('aria-busy', 'false');
    await expect(page.locator('#obs19-stat-detail')).toContainText(row.restricciones);
    await sinConteo(page);
    for (const p of points.filter(p => p.id_capa === row.id_capa)) {
      await page.evaluate(p => window.obs19Api.getMap().setView([p.lat, p.lng], 10, {animate: false}), p);
      const wanted = p.color.match(/[a-f0-9]{2}/gi).map(v => parseInt(v, 16));
      await expect.poll(async () => {
        const got = await pixel(page, p);
        return got ? Math.max(...wanted.map((v, i) => Math.abs(v - got[i]))) : 999;
      }, {message: row.id_capa + ' / ' + p.valor + ': el relleno debe coincidir con su leyenda'}).toBeLessThanOrEqual(10);
      const records = await page.evaluate(async p => window.obs19Api.getLayers().find(e => e.idCitizen === p.id_capa).layer.consultarPoligonos(L.latLng(p.lat, p.lng)), p);
      expect(records.some(r => r.fid_origen === p.fid && r[row.campo_leyenda] === p.valor)).toBe(true);
    }
    await c.getByRole('slider').fill('50');
    expect(await page.evaluate(id => window.obs19Api.getLayers().find(e => e.idCitizen === id).opacity, row.id_capa)).toBe(50);
    await c.locator('[data-layer-zoom]').click();
    expect(await page.evaluate(() => window.obs19Api.getMap().getZoom())).toBeGreaterThanOrEqual(5);
    await sw.focus(); await sw.press('Enter'); await expect(sw).toHaveAttribute('aria-checked', 'false');
    expect(await page.evaluate(() => window.obs19Api.getLayers().length)).toBe(0);
  }
  expect(new Set(requests.filter(u => u.includes('/tanda_5_29/') && new URL(u).pathname.endsWith('.pmtiles'))).size).toBe(2);
  expect(requests.filter(u => u.endsWith('.geojson'))).toEqual([]);
});
test('tanda 5: rangos inválidos producen error visible, reintento y limpieza', async ({page}) => {
  let fail = true;
  await page.route('**/tanda_5_29/teselas/amenaza_incendios_forestales.pmtiles*', r => fail ? r.fulfill({status: 200, body: Buffer.alloc(127)}) : r.continue());
  await page.goto('/#geovisor'); const c = card(page, catalog[0].id_capa); await abrirCapa(c);
  await c.getByRole('switch').click(); await errorDeCapa(c,'no sirve rangos HTTP 206');
  await expect(c.getByRole('switch')).toHaveAttribute('aria-checked', 'false');
  fail = false; await c.getByRole('switch').click(); await expect(c.getByRole('switch')).toHaveAttribute('aria-busy', 'false');
  await expect(c.getByRole('switch')).toHaveAttribute('aria-checked', 'true');
  await page.locator('#geojson-reset').click(); expect(await page.evaluate(() => window.obs19Api.getLayers().length)).toBe(0);
  await expect(c.getByRole('switch')).toHaveAttribute('aria-checked', 'false');
});
test('tanda 5: el lector rechaza colores no seguros de un catálogo alterado', async ({page}) => {
  await page.route('**/tanda_5_29/catalogo_entrega.json', r => {
    const data = structuredClone(catalog); data[0].teselas.clasificacion.clases[0].color = 'url(https://color.invalid/ejemplo)'; return r.fulfill({json: data});
  });
  const requests = []; page.on('request', r => requests.push(r.url()));
  await page.goto('/#geovisor'); const c = card(page, catalog[0].id_capa); await abrirCapa(c);
  await c.getByRole('switch').click(); await errorDeCapa(c,'Leyenda de teselas incorrecta');
  await expect(c.getByRole('switch')).toHaveAttribute('aria-checked', 'false');
  expect(requests.some(u => u.includes('color.invalid'))).toBe(false);
});
