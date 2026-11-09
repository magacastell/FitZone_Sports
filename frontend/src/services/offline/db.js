import Dexie from 'dexie';
import { verificar, ahoraAutorizado, tokenActual } from './crypto.js';

export const db = new Dexie('fitzone-m2-offline');
db.version(1).stores({ meta:'id', movimientos:'id,estado,usuarioId,visitaId', presencias:'usuarioId,visitaId', usos:'id' });

export function cuentaActual() {
  try { return JSON.parse(atob(localStorage.getItem('token').split('.')[1].replace(/-/g,'+').replace(/_/g,'/'))).sub; }
  catch { throw Error('Iniciá sesión antes de preparar el modo offline.'); }
}
export async function idTerminal() {
  return db.transaction('rw',db.meta,async()=>{
    const actual=await db.meta.get('terminalId');
    if(actual)return actual.valor;
    const valor=crypto.randomUUID();await db.meta.put({id:'terminalId',valor});return valor;
  });
}
export async function guardarCopia(respuesta) {
  const datos=await verificar(respuesta.evidencia,respuesta.jwk,'m2-copia',respuesta.servidorAhora);
  const cuenta=cuentaActual();const relojLocal=Date.now();
  if(datos.cuenta!==cuenta)throw Error('La copia corresponde a otro operador.');
  const copia={id:'copia',...respuesta,datos,cuenta,relojLocal,ultimoReloj:relojLocal,desfase:respuesta.servidorAhora-relojLocal};
  await db.transaction('rw',db.meta,db.movimientos,db.presencias,async()=>{
    if(await db.movimientos.where('estado').equals('PENDIENTE').count())throw Error('Sincronizá los pendientes antes de reemplazar la copia.');
    await db.presencias.clear();
    for(const p of datos.presencias)await db.presencias.put(p);
    await db.meta.put(copia);
  });
  return copia;
}
export async function copiaActual(autonoma = false) {
  const copia=await db.meta.get('copia');
  let cuenta;
  try { cuenta=cuentaActual(); } catch { if(autonoma)cuenta=copia?.cuenta; }
  if(!copia || copia.cuenta!==cuenta)throw Error('Este operador no tiene un terminal preparado.');
  const ahora=ahoraAutorizado(copia);
  copia.datos=await verificar(copia.evidencia,copia.jwk,'m2-copia',ahora);
  if(copia.datos.cuenta!==cuenta)throw Error('La autorización corresponde a otro operador.');
  return {copia,ahora};
}
export async function guardarLote(respuesta) {
  const relojLocal=Date.now();
  await db.meta.put({id:'qr:'+cuentaActual(),...respuesta,relojLocal,ultimoReloj:relojLocal,desfase:respuesta.servidorAhora-relojLocal});
  localStorage.setItem('fitzone:offline:socio',cuentaActual());
}
export async function qrPreparado(autonomo=false) {
  let cuenta;
  try { cuenta=cuentaActual(); } catch { if(autonomo)cuenta=localStorage.getItem('fitzone:offline:socio'); }
  const lote=await db.meta.get('qr:'+cuenta);
  if(!lote)throw Error('No preparaste credenciales offline. Conectate para generar una autorización.');
  const ahora=ahoraAutorizado(lote);
  const token=tokenActual(lote.tokens,ahora);
  if(!token)throw Error('Las credenciales offline caducaron. Volvé a prepararlas con conexión.');
  const datos=await verificar(token,lote.jwk,'m2-qr',ahora);
  await db.meta.update(lote.id,{ultimoReloj:Date.now()});
  return {token,venceEn:new Date(datos.exp*1000).toISOString(),duracion:datos.exp*1000-ahora};
}
