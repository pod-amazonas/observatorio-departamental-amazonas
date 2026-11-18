const {expect}=require('@playwright/test');
async function abrirFicha(card){
 const ficha=card.locator(':scope > details[data-ficha-tecnica]');
 await expect(ficha).toHaveCount(1);
 if(await ficha.getAttribute('open')===null){const summary=ficha.locator(':scope > summary');await summary.focus();await summary.press('Enter')}
 await expect(ficha).toHaveAttribute('open','');return ficha;
}
async function errorDeCapa(card,text){
 await expect(card.locator('[role="status"]')).toContainText('No se pudo cargar la capa');
 const f=await abrirFicha(card);await expect(f.locator('[data-technical-error]')).toContainText(text);
}
async function sinConteo(page){
 const overview=page.locator('#obs19-stat-overview');await expect(overview.locator('.obs19-metric').filter({hasText:'Registros cargados'}).locator('strong')).toHaveText('—');
 await expect(overview).toContainText('Esta capa se consulta por zonas y no permite contar registros');
}
module.exports={abrirFicha,errorDeCapa,sinConteo};
