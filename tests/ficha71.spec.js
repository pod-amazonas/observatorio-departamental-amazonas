const {test,expect}=require('@playwright/test');
const {abrirFicha}=require('./helpers/fichas.cjs');
test('ficha: no envía Enter al interruptor cuando el destino no puede recibir foco',async({page})=>{
 // Reproduce de forma determinista el foco retenido en el control anterior.
 // El summary es visible, pero inert impide trasladarle el foco nativo.
 await page.setContent('<button role="switch" aria-checked="true" onclick="this.setAttribute(\'aria-checked\',String(this.getAttribute(\'aria-checked\')!==\'true\'))">Capa ficticia</button><section><details data-ficha-tecnica><summary inert>Ficha técnica</summary><p>Contenido ficticio</p></details></section>');
 const sw=page.getByRole('switch');await sw.focus();
 await expect(abrirFicha(page.locator('section'))).rejects.toThrow('toBeFocused');
 await expect(sw).toHaveAttribute('aria-checked','true');
 await expect(sw).toBeFocused();
 await expect(page.locator('details')).not.toHaveAttribute('open','');
});
