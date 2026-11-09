import { db,cuentaActual } from './db.js';
import { fetchAPI } from '../api.js';

async function enviarPendientes() {
  const copia=await db.meta.get('copia');
  if(!copia)return [];
  if(cuentaActual()!==copia.cuenta)throw Error('Los pendientes pertenecen a otra cuenta. Iniciá la sesión original.');
  // La sincronización de eventos históricos no exige que la copia siga vigente ahora.
  const actuales=(await db.movimientos.where('estado').equals('PENDIENTE').toArray()).sort((a,b)=>(a.ultimoIntento||0)-(b.ultimoIntento||0)||a.secuencia-b.secuencia).slice(0,100);
  if(!actuales.length)return [];
  const enviados=new Set(actuales.map(e=>e.id));
  const eventos=actuales.map(({id,visitaId,usuarioId,tipo,instante,qrToken,revision,secuencia})=>({id,visitaId,usuarioId,tipo,instante,qrToken,revision,secuencia}));
  const cuenta=copia.cuenta,token=localStorage.getItem('token');
  const resultados=await fetchAPI('/accesos/offline/sincronizacion',{method:'POST',body:JSON.stringify({terminalId:copia.datos.terminalId,eventos})});
  if(localStorage.getItem('token')!==token)throw Error('Cambió la sesión; se conserva la cola para reconciliar otra vez.');
  await db.transaction('rw',db.movimientos,db.meta,async()=>{
    if((await db.meta.get('copia'))?.cuenta!==cuenta)throw Error('Cambió la cuenta del terminal.');
    for(const r of resultados) {
      const existente=await db.movimientos.get(r.id);
      if(!existente || (!enviados.has(r.id) && existente.estado!=='PENDIENTE'))continue;
      if(!['CONFIRMADO','CONFLICTO','RECHAZADO','EN_ESPERA'].includes(r.estado))throw Error('Respuesta central no reconocida; se conserva el pendiente.');
      await db.movimientos.update(r.id,{estado:r.estado==='EN_ESPERA'?'PENDIENTE':r.estado,detalle:r.detalle,accesoId:r.accesoId,ultimoIntento:Date.now()});
    }
    await db.meta.update('copia',{ultimaSincronizacion:Date.now()});
  });
  return resultados;
}
let pendiente;
export function sincronizar() {
  if(pendiente)return pendiente;
  const ejecutar=()=>enviarPendientes();
  pendiente=(globalThis.navigator?.locks?navigator.locks.request('fitzone-m2-sync',ejecutar):ejecutar()).finally(()=>{pendiente=null;});
  return pendiente;
}
