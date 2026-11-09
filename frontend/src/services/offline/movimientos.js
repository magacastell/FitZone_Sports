import { db,copiaActual } from './db.js';
import { verificar } from './crypto.js';

export async function registrarLocal(tipo,codigo,porId=false,autonomo=false) {
  if(!['INGRESO','SALIDA'].includes(tipo))throw Error('Movimiento inválido');
  const {copia,ahora}=await copiaActual(autonomo);
  const datos=copia.datos;
  let qr=null;
  if(!porId) {
    qr=await verificar(codigo,copia.jwk,'m2-qr',ahora);
    if(qr.sid!==datos.sedeId)throw Error('El QR fue preparado para otra sede.');
  } else if(tipo!=='SALIDA')throw Error('El ingreso requiere QR rotativo.');
  return db.transaction('rw',db.meta,db.presencias,db.movimientos,db.usos,async()=>{
    const actual=await db.meta.get('copia');
    if(actual?.evidencia!==copia.evidencia)throw Error('La copia cambió; verificá nuevamente.');
    const captura=Date.now()+copia.desfase;
    if(captura>=datos.exp*1000 || captura<datos.nbf*1000)throw Error('La autorización del terminal caducó.');
    let presencia;
    if(porId)presencia=await db.presencias.where('visitaId').equals(/^\d+$/.test(codigo)?'central:'+codigo:codigo).first();
    else presencia=await db.presencias.get(qr.uid);
    const miembro=qr && datos.miembros.find(m=>m.id===qr.uid && m.lotes.includes(qr.bid));
    if(!porId && !miembro)throw Error('Socio no incluido en esta copia. Actualizala con conexión.');
    if(tipo==='INGRESO') {
      if(!miembro.habilitado || miembro.suspendido || !miembro.periodos.some(p=>p.inicio<=captura && captura<p.fin))
        throw Error('La copia no autoriza una membresía vigente y habilitada.');
      if(presencia)throw Error('Ya existe presencia conocida de este socio.');
      if(await db.usos.get(qr.jti))throw Error('Este QR ya se utilizó para un ingreso; esperá la próxima rotación.');
    } else if(!presencia || presencia.sedeId!==datos.sedeId)throw Error('No hay una visita abierta en esta sede.');
    const secuencia=(actual.secuencia||0)+1;
    const evento={id:crypto.randomUUID(),visitaId:tipo==='INGRESO'?crypto.randomUUID():presencia.visitaId,
      usuarioId:qr?.uid??presencia.usuarioId,sedeId:datos.sedeId,tipo,instante:captura,qrToken:porId?null:codigo,
      revision:datos.revision,terminalId:datos.terminalId,operadorId:datos.operadorId,secuencia,estado:'PENDIENTE'};
    await db.movimientos.add(evento);
    if(tipo==='INGRESO') {
      await db.presencias.put({usuarioId:evento.usuarioId,visitaId:evento.visitaId,sedeId:datos.sedeId,ingreso:captura});
      await db.usos.put({id:qr.jti,hasta:qr.exp*1000});
    } else await db.presencias.delete(evento.usuarioId);
    await db.meta.update('copia',{secuencia,ultimoReloj:Date.now()});
    return evento;
  });
}
