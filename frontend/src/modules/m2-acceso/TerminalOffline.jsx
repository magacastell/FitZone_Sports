import { useCallback,useEffect,useRef,useState } from 'react';
import { AppButton } from '../../components/ui/FitZoneUI';
import { prepararTerminal,consultarConexionTerminal } from '../../services/offline/api';
import { db,copiaActual,cuentaActual } from '../../services/offline/db';
import { registrarLocal } from '../../services/offline/movimientos';
import { sincronizar } from '../../services/offline/sync';
import './OfflineAcceso.css';

const REVISION_CENTRAL = 'movimiento-central-en-revision';
const RECHAZOS_CENTRALES = [400,401,403,404,409,422];

export default function TerminalOffline({onMovimiento,onReconectar,lector,sedeId}) {
  const [vista,setVista]=useState({}),[mensaje,setMensaje]=useState(''),[conexion,setConexion]=useState('consultando');
  const [ocupado,setOcupado]=useState(false);
  const vivo=useRef(false),enviando=useRef(false);
  const revisando=useRef(false);
  const conectado=useRef(false);
  const reconectar=useRef(onReconectar);
  reconectar.current=onReconectar;
  const actualizar=useCallback(async()=>{
    try {
      let copia,error;
      try{
        copia=(await copiaActual()).copia;
        if(sedeId && copia.datos.sedeId!==sedeId) {
          copia=null;
          error='La copia pertenece a otra sede.';
        }
      }catch(e){error=e.message;}
      const cola=await db.movimientos.where('estado').equals('PENDIENTE').toArray();
      const conflictos=await db.movimientos.where('estado').anyOf('CONFLICTO','RECHAZADO').count();
      const aforo=copia?await db.presencias.filter(p=>p.sedeId===copia.datos.sedeId).count():null;
      const resultados=await db.movimientos.filter(m=>m.estado==='CONFLICTO'||m.estado==='RECHAZADO').toArray();
      const provisionales=copia?cola.filter(m=>m.revision===copia.datos.revision):[];
      const revisionCentral=await db.meta.get(REVISION_CENTRAL);
      if(vivo.current)setVista({copia,error,pendientes:cola.length,provisionales,conflictos,aforo,resultados,revisionCentral});
    } catch(e){if(vivo.current)setVista({error:e.message});}
  },[sedeId]);
  useEffect(()=>{
    vivo.current=true;
    const revisar=async()=>{
      if(revisando.current||enviando.current)return;
      revisando.current=true;
      try {
        const estado=await consultarConexionTerminal();
        if(!vivo.current||enviando.current)return;
        setConexion(estado);
        const recuperada=estado==='disponible' && !conectado.current;
        conectado.current=estado==='disponible';
        if(recuperada)reconectar.current?.();
        if(estado==='disponible')try{
          const resultados=await sincronizar();
          if(resultados.length && vivo.current)onMovimiento?.();
          const copia=await db.meta.get('copia');
          if(copia && Date.now()-copia.relojLocal>=60000 && !(await db.movimientos.where('estado').equals('PENDIENTE').count()))await prepararTerminal();
        }catch(e){if(vivo.current)setMensaje(`Los pendientes se conservan: ${e.message}`);}
        await actualizar();
      } finally {revisando.current=false;}
    };
    revisar();
    const timer=setInterval(revisar,10000);
    window.addEventListener('online',revisar);
    window.addEventListener('offline',revisar);
    return()=>{
      vivo.current=false;
      clearInterval(timer);
      window.removeEventListener('online',revisar);
      window.removeEventListener('offline',revisar);
    };
  },[actualizar,onMovimiento]);
  async function ejecutar(tarea,propagar=false) {
    if(enviando.current){
      if(propagar)throw rechazo(409,'Esperá a que termine la operación del terminal.');
      return;
    }
    enviando.current=true;setOcupado(true);setMensaje('');
    try{return await tarea();}catch(e){if(propagar)throw e;if(vivo.current)setMensaje(e.message);}
    finally{enviando.current=false;if(vivo.current){setOcupado(false);await actualizar();}}
  }
  function rechazo(status,detail){return Object.assign(new Error(detail),{status,data:{detail}});}
  async function confirmarRevision() {
    const token=localStorage.getItem('token');
    if(await consultarConexionTerminal()!=='disponible' || token!==localStorage.getItem('token'))
      throw Error('Verificá el resultado con el servidor disponible y con la cuenta original.');
    const cuenta=cuentaActual();
    await db.transaction('rw',db.meta,async()=>{
      const revision=await db.meta.get(REVISION_CENTRAL);
      if(!revision)return;
      if(cuenta!==revision.cuenta)throw Error('La verificación corresponde a la cuenta original de Recepción.');
      if(revision.enCurso && Date.now()-revision.enviadaEn<30000)throw Error('Todavía se está esperando la respuesta central.');
      await db.meta.delete(REVISION_CENTRAL);
    });
    setMensaje('Revisión registrada. Podés seguir operando.');
  }
  async function enviarCentral(enLinea) {
    const cuenta=cuentaActual();
    await db.transaction('rw',db.meta,async()=>{
      if(await db.meta.get(REVISION_CENTRAL))throw rechazo(423,'El movimiento anterior requiere verificación central.');
      await db.meta.add({id:REVISION_CENTRAL,cuenta,enCurso:true,enviadaEn:Date.now()});
    });
    let definitivo=false;
    try {
      const acceso=await enLinea();
      definitivo=true;
      return acceso;
    } catch(error) {
      definitivo=RECHAZOS_CENTRALES.includes(error.status);
      throw error;
    } finally {
      // Ante una respuesta desconocida un nuevo envío requiere revisar el registro central.
      const guardar=definitivo?db.meta.delete(REVISION_CENTRAL):db.meta.update(REVISION_CENTRAL,{enCurso:false});
      await guardar.catch(()=>{});
    }
  }
  async function procesar(tipo,lectura,enLinea) {
      const sesion=localStorage.getItem('token');
      const estado=await consultarConexionTerminal();
      if(!vivo.current || sesion!==localStorage.getItem('token'))throw rechazo(401,'Cambió la sesión.');
      setConexion(estado);
      if(estado==='sesión requerida')throw rechazo(401,'Volvé a iniciar sesión con la cuenta habilitada de Recepción.');
      if(estado==='respuesta no verificada')throw rechazo(423,'El servidor no confirmó que esta terminal pueda operar. Consultá el estado antes de registrar un movimiento.');
      if(await db.meta.get(REVISION_CENTRAL))throw rechazo(423,'El movimiento anterior requiere verificación central.');
      // Una falla del POST central se informa como resultado desconocido. No se reenvía al circuito local.
      if(estado==='disponible') {
        try { await sincronizar(); }
        catch { throw rechazo(423,'No se pudieron reconciliar los pendientes. Reintentá la sincronización antes de registrar otro movimiento.'); }
        if(await db.movimientos.where('estado').equals('PENDIENTE').count())
          throw rechazo(423,'Todavía hay movimientos pendientes. Esperá la confirmación antes de registrar otro movimiento.');
        if(!vivo.current || sesion!==localStorage.getItem('token'))throw rechazo(401,'Cambió la sesión.');
        return {acceso:await enviarCentral(enLinea)};
      }
      if(!vivo.current || sesion!==localStorage.getItem('token'))throw rechazo(401,'Cambió la sesión.');
      try { await registrarLocal(tipo,lectura,false,false,sedeId); }
      catch(error){
        if(error.code==='ERR_JWT_EXPIRED')throw rechazo(409,'El QR venció. Escaneá el código vigente.');
        if(/^ERR_(JWT|JWS|JOSE)_/.test(error.code || ''))
          throw rechazo(409,'El QR o la copia firmada no son válidos para esta operación.');
        throw rechazo(409,error.message);
      }
      const provisional=`${tipo==='INGRESO'?'Ingreso':'Egreso'} provisional guardado. Consultá el estado de sincronización en este panel.`;
      return {mensaje:provisional};
  }
  const capturar=(tipo,lectura,enLinea)=>ejecutar(()=>procesar(tipo,lectura,enLinea),true);
  const sinRed=conexion==='sin comunicación';
  const contingencia=sinRed && !!vista.copia;
  return <>{sinRed && <p className="access-connectivity-note" role="status">{contingencia
    ? 'Contingencia activa. Los movimientos son provisionales hasta que vuelvan a sincronizarse.'
    : 'Sin conexión con el servidor. El acceso offline requiere una terminal preparada con una copia vigente.'}</p>}
    {lector?.(capturar,{copia:contingencia?vista.copia:null,bloqueado:!!vista.revisionCentral||(conexion!=='disponible'&&!contingencia)})}
    <section className="panel offline-terminal" aria-label="Terminal offline"><h2>Conexión y contingencia</h2>
    <p role="status">Servidor: <strong>{conexion}</strong>. {vista.copia?'Terminal preparado':'Terminal no preparado o caducado'}.</p>
    {conexion==='sesión requerida'&&<p>Ingresá con la cuenta habilitada de Recepción para seguir operando.</p>}
    {conexion==='respuesta no verificada'&&<p>El servidor respondió con un error. La contingencia no está habilitada.</p>}
    {vista.revisionCentral&&<div>
      <p role="alert">Hay un movimiento central sin resultado verificado. Revisá los movimientos recientes antes de continuar.</p>
      <AppButton disabled={ocupado||conexion!=='disponible'} onClick={()=>ejecutar(confirmarRevision)}>Ya verifiqué el resultado</AppButton>
    </div>}
    {sinRed&&vista.error&&<p>{vista.error}</p>}
    <AppButton disabled={ocupado||conexion!=='disponible'||vista.pendientes>0} onClick={()=>ejecutar(async()=>{await prepararTerminal();setMensaje('Copia autorizada guardada por hasta dos horas.');})}>Preparar / actualizar terminal</AppButton>
    <AppButton disabled={ocupado||conexion!=='disponible'||!vista.pendientes} onClick={()=>ejecutar(async()=>{await sincronizar();setMensaje('Respuesta central recibida. Revisá pendientes y conflictos.');onMovimiento?.();})}>Reintentar sincronización</AppButton>
    <p>Pendientes: <strong data-testid="pendientes">{vista.pendientes??'—'}</strong> · conflictos/rechazos: {vista.conflictos||0}.</p>
    {vista.conflictos>0&&<p role="alert">Hay conflictos que requieren revisión: el aforo provisional puede incluir presencia no confirmada centralmente.</p>}
    {vista.resultados?.map(r=><p role="alert" key={r.id}>{r.id}: {r.estado} · {r.detalle}</p>)}
    {!!vista.provisionales?.length && <ul aria-label="Movimientos provisionales">{vista.provisionales.map(m=><li key={m.id}>
      {m.tipo==='INGRESO'?'Ingreso':'Egreso'} provisional · {new Date(m.instante).toLocaleString('es-AR')}
    </li>)}</ul>}
    {vista.copia&&<><p>Sede: {vista.copia.sedeNombre}. Copia del {new Date(vista.copia.servidorAhora).toLocaleString()} · vence {new Date(vista.copia.datos.exp*1000).toLocaleString()}.</p>
      <p>Última respuesta de sincronización: {vista.copia.ultimaSincronizacion?new Date(vista.copia.ultimaSincronizacion).toLocaleString():'Sin confirmación todavía'}.</p>
      {!vista.copia.persistente&&<p>El navegador no concedió persistencia protegida: no borres sus datos ni uses modo privado. Los pendientes se conservan al cerrar normalmente.</p>}
      {(sinRed || vista.pendientes>0) && <p>Aforo local provisional: <strong data-testid="aforo-local">{vista.aforo}</strong> / {vista.copia.datos.capacidad}. Incluye presencia conocida y movimientos locales; puede diferir del central.</p>}</>}

    <p role="status">{mensaje}</p>
  </section></>;
}
