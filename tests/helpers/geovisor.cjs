// Abre solo los grupos necesarios, sin mover el foco ni simular el scroll de Tab.
async function abrirCapa(card){
 await card.waitFor({state:'attached'});
 await card.evaluate(el=>{for(let p=el.parentElement;p;p=p.parentElement)if(p.tagName==='DETAILS')p.open=true});
}
module.exports={abrirCapa};
