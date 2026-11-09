import { useCallback,useEffect,useRef,useState } from 'react';
import { AppButton } from '../../components/ui/FitZoneUI';
import { prepararTerminal,hayConexion } from '../../services/offline/api';
import { db,copiaActual } from '../../services/offline/db';
import { registrarLocal } from '../../services/offline/movimientos';
import { sincronizar } from '../../services/offline/sync';

export default function TerminalOffline({autonomo=false,onMovimiento=()=>{}}) {
  const [vista,setVista]=useState({}),[mensaje,setMensaje]=useState(''),[conexion,setConexion]=useState('consultando');
  const [codigo,setCodigo]=useState(''),[tipo,setTipo]=useState('INGRESO'),[porId,setPorId]=useState(false),[ocupado,setOcupado]=useState(false);
  const vivo=useRef(false),enviando=useRef(false);
  const actualizar=useCallback(async()=>{
    try {
      let copia,error;
      try{copia=(await copiaActual(autonomo)).copia;}catch(e){error=e.message;}
      const pendientes=await db.movimientos.where('estado').equals('PENDIENTE').count();
      const conflictos=await db.movimientos.where('estado').anyOf('CONFLICTO','RECHAZADO').count();
      const aforo=copia?await db.presencias.filter(p=>p.sedeId===copia.datos.sedeId).count():null;
      const resultados=await db.movimientos.filter(m=>m.estado==='CONFLICTO'||m.estado==='RECHAZADO').toArray();
      if(vivo.current)setVista({copia,error,pendientes,conflictos,aforo,resultados});
    } catch(e){if(vivo.current)setVista({error:e.message});}
  },[autonomo]);
  useEffect(()=>{
    vivo.current=true;
    const revisar=async()=>{
      let disponible=false;
      try{await hayConexion();disponible=true;if(vivo.current)setConexion('disponible');}
      catch(e){if(vivo.current)setConexion(e.status===401||e.status===403?'sesión requerida':'sin comunicación');}
      if(disponible)try{await sincronizar();}catch(e){if(vivo.current)setMensaje(`Los pendientes se conservan: ${e.message}`);}
      await actualizar();
    };
    revisar();const timer=setInterval(revisar,10000);window.addEventListener('online',revisar);
    return()=>{vivo.current=false;clearInterval(timer);window.removeEventListener('online',revisar);};
  },[actualizar]);
  async function ejecutar(tarea) {
    if(enviando.current)return;enviando.current=true;setOcupado(true);setMensaje('');
    try{await tarea();}catch(e){if(vivo.current)setMensaje(e.message);}
    finally{enviando.current=false;if(vivo.current){setOcupado(false);await actualizar();}}
  }
  async function operar(e) {
    e.preventDefault();await ejecutar(async()=>{
      if(conexion==='sesión requerida')throw Error('Volvé a iniciar sesión antes de operar con el servidor disponible.');
      const movimiento=await registrarLocal(tipo,codigo.trim(),porId,autonomo);
      if(vivo.current){setCodigo('');setMensaje(`${tipo==='INGRESO'?'Ingreso':'Egreso'} provisional guardado. Visita ${movimiento.visitaId}. Pendiente de confirmación central.`);}
      if(conexion==='disponible') {
        try {
          const resultados=await sincronizar();const resultado=resultados.find(r=>r.id===movimiento.id);
          if(vivo.current)setMensaje(resultado?.estado==='CONFIRMADO'?'Movimiento confirmado por el servidor.':resultado?`${resultado.estado}: ${resultado.detalle}`:'Pendiente de confirmación central.');
        } catch(e){if(vivo.current)setMensaje(`Movimiento provisional guardado; sin confirmación central. ${e.message}`);}
      }
      onMovimiento();
    });
  }
  return <section className="panel" aria-label="Terminal offline"><h2>Terminal preparado · acceso de contingencia</h2>
    <p>Servidor: <strong>{conexion}</strong>. {vista.copia?'Terminal preparado':'Terminal no preparado o caducado'}.</p>
    {vista.error&&<p role="alert">{vista.error}</p>}
    <AppButton disabled={ocupado||conexion!=='disponible'||vista.pendientes>0} onClick={()=>ejecutar(async()=>{await prepararTerminal();setMensaje('Copia autorizada guardada por hasta dos horas.');})}>Preparar / actualizar terminal</AppButton>
    <AppButton disabled={ocupado||conexion!=='disponible'} onClick={()=>ejecutar(async()=>{await sincronizar();setMensaje('Respuesta central recibida. Revisá pendientes y conflictos.');onMovimiento();})}>Reintentar sincronización</AppButton>
    <p>Pendientes: <strong data-testid="pendientes">{vista.pendientes??'—'}</strong> · conflictos/rechazos: {vista.conflictos||0}.</p>
    {vista.resultados?.map(r=><p role="alert" key={r.id}>{r.id}: {r.estado} · {r.detalle}</p>)}
    <p><a href="/terminal-offline">Abrir terminal sin conexión</a> · <a href="/recepcion/acceso">Volver a Recepción</a></p>
    {vista.copia&&<><p>Sede: {vista.copia.sedeNombre}. Copia del {new Date(vista.copia.servidorAhora).toLocaleString()} · vence {new Date(vista.copia.datos.exp*1000).toLocaleString()}.</p>
      <p>Última respuesta de sincronización: {vista.copia.ultimaSincronizacion?new Date(vista.copia.ultimaSincronizacion).toLocaleString():'Sin confirmación todavía'}.</p>
      <p>Aforo local provisional: <strong data-testid="aforo-local">{vista.aforo}</strong> / {vista.copia.datos.capacidad}. Incluye presencia conocida y movimientos locales; puede diferir del central.</p>
      <form onSubmit={operar}><label>Movimiento<select aria-label="Movimiento offline" value={tipo} disabled={ocupado} onChange={e=>{setTipo(e.target.value);setPorId(false);}}><option value="INGRESO">Ingreso</option><option value="SALIDA">Egreso</option></select></label>
        {tipo==='SALIDA'&&<label><input type="checkbox" checked={porId} onChange={e=>setPorId(e.target.checked)}/>Usar ID de visita o número de ingreso central</label>}
        <label>{porId?'ID de visita o número central':'QR preparado para esta sede'}<input aria-label="Código offline" value={codigo} required disabled={ocupado} onChange={e=>setCodigo(e.target.value)} autoComplete="off"/></label>
        <AppButton type="submit" disabled={ocupado||!codigo.trim()}>Registrar movimiento preparado</AppButton>
      </form></>}
    <p role="status">{mensaje}</p>
  </section>;
}
