import { useEffect, useRef, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { consultarMiPerfil, listarPlanes, contratarMembresia, renovarMembresia } from '../../services/m1Service';

function RenovacionMembresia({ perfil, membresia, onRenovada }) {
  const [renovacion, setRenovacion] = useState({ estado: 'cargando' });
  const intento = useRef(null);
  const enviando = useRef(false);
  const montado = useRef(false);
  const sesion = useRef(null);
  const claveStorage = `fitzone:m1:renovacion:${perfil.id}:${membresia.id}`;

  const registroValido = (registro) => registro && registro.version === 1
    && registro.usuarioId === perfil.id && registro.membresiaId === membresia.id
    && perfil.id === membresia.usuarioId
    && Number.isInteger(registro.planId) && registro.planId > 0
    && typeof registro.idempotencyKey === 'string'
    && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(registro.idempotencyKey)
    && typeof registro.creadoEn === 'string' && !Number.isNaN(Date.parse(registro.creadoEn))
    && (registro.resultadoIncierto === undefined || typeof registro.resultadoIncierto === 'boolean');

  const cargarPendiente = () => {
    if (!mismaSesion()) return;
    try {
      const texto = sessionStorage.getItem(claveStorage);
      if (texto === null) {
        if (intento.current) {
          sessionStorage.setItem(claveStorage, JSON.stringify(intento.current));
          setRenovacion({ estado: intento.current.resultadoIncierto === false ? 'rechazada' : 'pendiente' });
        } else {
          setRenovacion({ estado: 'lista' });
        }
        return;
      }
      let registro;
      try { registro = JSON.parse(texto); } catch { /* Se conserva el registro inválido. */ }
      if (!registroValido(registro)) {
        setRenovacion({ estado: 'invalida', mensaje: 'El registro pendiente no se puede verificar. No se enviará otra renovación.' });
        return;
      }
      intento.current = registro;
      setRenovacion({ estado: registro.resultadoIncierto === false ? 'rechazada' : 'pendiente' });
    } catch {
      setRenovacion({ estado: 'error-storage', mensaje: 'No pudimos acceder al intento guardado. La renovación está bloqueada.' });
    }
  };

  useEffect(() => {
    montado.current = true;
    try {
      sesion.current = localStorage.getItem('token');
      cargarPendiente();
    } catch {
      setRenovacion({ estado: 'error-storage', mensaje: 'No pudimos comprobar la sesión para recuperar la renovación.' });
    }
    return () => { montado.current = false; };
  }, []);

  const mismaSesion = () => {
    try {
      if (perfil.id === membresia.usuarioId && sesion.current
        && localStorage.getItem('token') === sesion.current) return true;
    } catch { /* No enviar si no se puede comprobar la sesión. */ }
    setRenovacion({ estado: 'bloqueada', mensaje: 'La sesión cambió o no se pudo verificar. Recargá para continuar con tu cuenta.' });
    return false;
  };

  const prepararRenovacion = async () => {
    if (enviando.current || !mismaSesion() || intento.current || membresia.estado === 'SUSPENDIDA') return;
    enviando.current = true;
    setRenovacion({ estado: 'preparando' });
    try {
      const planes = await listarPlanes();
      if (!montado.current) return;
      const plan = planes.find((p) => p.id === membresia.planId);
      setRenovacion(plan
        ? { estado: 'confirmar', plan }
        : { estado: 'lista', mensaje: 'El último plan contratado no está disponible en el catálogo activo.' });
    } catch (error) {
      if (montado.current) setRenovacion({ estado: 'lista', mensaje: error.message });
    } finally {
      enviando.current = false;
    }
  };

  const limpiarConfirmada = () => {
    try {
      const texto = sessionStorage.getItem(claveStorage);
      if (texto !== null && JSON.parse(texto).idempotencyKey !== intento.current.idempotencyKey) {
        throw new Error('El registro pendiente cambió');
      }
      sessionStorage.removeItem(claveStorage);
      intento.current = null;
      if (montado.current) setRenovacion({ estado: 'exito' });
    } catch {
      if (montado.current) setRenovacion({ estado: 'limpieza-pendiente', mensaje: 'La renovación fue confirmada, pero no pudimos limpiar el registro local. No inicies otra operación.' });
    }
  };

  const enviarRenovacion = async () => {
    if (enviando.current || !['confirmar', 'pendiente', 'rechazada'].includes(renovacion.estado) || !mismaSesion()) return;
    enviando.current = true;
    const anterior = intento.current;
    const incertidumbrePrevia = anterior !== null && anterior.resultadoIncierto !== false;
    let registro;
    try {
      const guardado = sessionStorage.getItem(claveStorage);
      if ((anterior && (!guardado || JSON.parse(guardado).idempotencyKey !== anterior.idempotencyKey))
        || (!anterior && guardado !== null)) throw new Error('El pendiente cambió; volvé a leerlo antes de continuar.');
      registro = anterior || {
        version: 1, usuarioId: perfil.id, membresiaId: membresia.id,
        planId: renovacion.plan.id, idempotencyKey: globalThis.crypto.randomUUID(),
        creadoEn: new Date().toISOString(),
      };
      registro = { ...registro, resultadoIncierto: true };
      sessionStorage.setItem(claveStorage, JSON.stringify(registro));
      intento.current = registro;
    } catch {
      setRenovacion({ estado: 'error-storage', mensaje: 'No pudimos guardar o verificar el intento. No se envió la renovación. Volvé a leer el pendiente.' });
      enviando.current = false;
      return;
    }
    setRenovacion({ estado: 'enviando' });
    try {
      const datos = await renovarMembresia(registro.membresiaId, registro.planId, registro.idempotencyKey);
      if (montado.current) {
        let sesionActual;
        try { sesionActual = localStorage.getItem('token'); } catch { /* El resultado confirmado se limpia igualmente. */ }
        if (sesionActual === sesion.current) onRenovada(datos);
      }
      limpiarConfirmada();
    } catch (error) {
      // Solo un rechazo 402 sin incertidumbre previa permite abandonar la intención.
      if (error.status === 402 && !incertidumbrePrevia) {
        try {
          registro = { ...registro, resultadoIncierto: false };
          sessionStorage.setItem(claveStorage, JSON.stringify(registro));
          intento.current = registro;
          if (montado.current) setRenovacion({ estado: 'rechazada', mensaje: error.message });
        } catch {
          if (montado.current) setRenovacion({ estado: 'pendiente', mensaje: 'No pudimos guardar el rechazo. Conservamos la operación pendiente.' });
        }
      } else if (montado.current) {
        setRenovacion({ estado: 'pendiente', mensaje: error.message, status: error.status });
      }
    } finally {
      enviando.current = false;
    }
  };

  const abandonarRechazada = () => {
    if (enviando.current || renovacion.estado !== 'rechazada' || !mismaSesion()) return;
    try {
      const registro = JSON.parse(sessionStorage.getItem(claveStorage));
      if (!registroValido(registro) || registro.resultadoIncierto !== false
        || registro.idempotencyKey !== intento.current.idempotencyKey) throw new Error('El pendiente cambió');
      sessionStorage.removeItem(claveStorage);
      intento.current = null;
      setRenovacion({ estado: 'lista' });
    } catch {
      setRenovacion({ estado: 'error-storage', mensaje: 'No pudimos abandonar el intento. Volvé a leer el pendiente.' });
    }
  };

  const descartarInvalida = () => {
    if (enviando.current || !mismaSesion() || !window.confirm('Un registro inválido puede corresponder a un cobro ya realizado. ¿Verificaste la operación y confirmás descartar este registro local?')) return;
    try { sessionStorage.removeItem(claveStorage); intento.current = null; cargarPendiente(); } catch {
      setRenovacion({ estado: 'error-storage', mensaje: 'No pudimos eliminar el registro local.' });
    }
  };

  const pendiente = ['pendiente', 'rechazada'].includes(renovacion.estado);
  return (
    <section aria-labelledby="renovacion-titulo" aria-busy={['cargando', 'preparando', 'enviando'].includes(renovacion.estado)}>
      <h3 id="renovacion-titulo">Renovar último plan contratado</h3>
      {renovacion.mensaje && <p role="alert">{renovacion.mensaje}</p>}
      {renovacion.estado === 'cargando' && <p role="status">Buscando una renovación pendiente...</p>}
      {renovacion.estado === 'lista' && (membresia.estado === 'SUSPENDIDA'
        ? <p>La membresía está suspendida. No se puede iniciar una nueva renovación.</p>
        : <button type="button" onClick={prepararRenovacion}>Preparar renovación del último plan contratado</button>)}
      {renovacion.estado === 'preparando' && <p role="status">Consultando el último plan contratado...</p>}
      {renovacion.estado === 'confirmar' && (
        <>
          <p>{renovacion.plan.nombre} — {renovacion.plan.duracionMeses} meses — {renovacion.plan.precio} ARS</p>
          <p>Se utilizará el precio vigente al procesar el pago.</p>
          <button type="button" disabled={typeof globalThis.crypto?.randomUUID !== 'function'} onClick={enviarRenovacion}>Confirmar renovación</button>
          {typeof globalThis.crypto?.randomUUID !== 'function' && <p role="alert">Este navegador o conexión no permite iniciar la renovación.</p>}
        </>
      )}
      {renovacion.estado === 'enviando' && <p role="status">Procesando renovación...</p>}
      {pendiente && (
        <>
          <p>{renovacion.estado === 'rechazada' ? 'El pago no fue aprobado.' : 'Existe una renovación pendiente de resolución.'}</p>
          <p>Plan registrado: {intento.current.planId}. Intento creado: {intento.current.creadoEn}.</p>
          <p>El reintento usa la misma operación y puede completar un cobro que todavía no se haya aplicado. Resolvé este intento antes de cerrar la pestaña.</p>
          {renovacion.status === 403 && <p>El backend denegó la autorización. Resolvé el acceso antes de reintentar.</p>}
          {renovacion.status === 400 && <p>La petición fue rechazada. No se cambiará el plan ni la clave automáticamente.</p>}
          {renovacion.status === 402 && <p>El último pago no fue aprobado, pero el resultado anterior sigue sin resolverse. Conservamos la misma operación.</p>}
          {renovacion.status === 404 && <p>No se encontró la membresía o el plan. El intento se conserva para verificar su resultado.</p>}
          {renovacion.status === 409 && <p>Hay un conflicto de estado o de plan. No se iniciará otra renovación automáticamente.</p>}
          <button type="button" onClick={enviarRenovacion}>Reintentar renovación pendiente</button>
          {renovacion.estado === 'rechazada' && <button type="button" onClick={abandonarRechazada}>Abandonar intención rechazada</button>}
        </>
      )}
      {renovacion.estado === 'exito' && <p role="status">Renovación confirmada.</p>}
      {['error-storage', 'invalida'].includes(renovacion.estado) && <button type="button" onClick={cargarPendiente}>Releer renovación pendiente</button>}
      {renovacion.estado === 'invalida' && <button type="button" onClick={descartarInvalida}>Descartar registro inválido tras verificar la operación</button>}
      {renovacion.estado === 'limpieza-pendiente' && <button type="button" onClick={limpiarConfirmada}>Reintentar limpieza de operación confirmada</button>}
      {membresia.periodos?.some((p) => p.estado === 'PROGRAMADA') && (
        <>
          <p>Períodos programados según el backend:</p>
          <ul>{membresia.periodos.filter((p) => p.estado === 'PROGRAMADA').map((p) => (
            <li key={p.id}>{p.nombrePlan}: {new Date(p.inicio).toLocaleString('es-AR', { timeZone: 'America/Argentina/Buenos_Aires', hour12: false })} a {new Date(p.fin).toLocaleString('es-AR', { timeZone: 'America/Argentina/Buenos_Aires', hour12: false })} (hora Argentina)</li>
          ))}</ul>
        </>
      )}
    </section>
  );
}

export default function PerfilUsuario() {
  const [perfil, setPerfil] = useState({ estado: 'cargando' });
  const { membresia, actualizarMembresia: setMembresia, refrescarMembresia } = useOutletContext();
  const [planes, setPlanes] = useState({ estado: 'inicial' });
  const [planSeleccionado, setPlanSeleccionado] = useState('');
  const [contratacion, setContratacion] = useState({ estado: 'inicial' });
  const intento = useRef(null);
  const enviando = useRef(false);
  const montado = useRef(false);

  useEffect(() => {
    let activo = true;
    montado.current = true;

    consultarMiPerfil().then(
      (datos) => {
        if (activo) setPerfil({ estado: 'cargado', datos });
      },
      (error) => {
        if (activo) setPerfil({ estado: 'error', mensaje: error.message });
      },
    );

    return () => { activo = false; montado.current = false; };
  }, []);

  useEffect(() => {
    if (membresia.estado !== 'sin-membresia') return;
    let activo = true;
    setPlanes({ estado: 'cargando' });
    listarPlanes().then(
      (datos) => {
        if (activo) setPlanes({ estado: 'cargados', datos });
      },
      (error) => {
        if (activo) setPlanes({ estado: 'error', mensaje: error.message });
      },
    );
    return () => { activo = false; };
  }, [membresia.estado]);

  const uuidDisponible = typeof globalThis.crypto?.randomUUID === 'function';
  const puedeCambiarPlan = contratacion.estado === 'error' && contratacion.status === 402;
  const puedeActualizarPlanes = contratacion.estado === 'error'
    && (contratacion.status === 404 || (contratacion.status === 409 && contratacion.reconciliada));
  const puedeReintentar = contratacion.estado === 'error'
    && (contratacion.status === 402 || !contratacion.status || contratacion.status >= 500);
  const envioBloqueado = contratacion.estado !== 'inicial' && !puedeReintentar;

  const reconciliarMembresia = async (mensajeConflicto) => {
    setContratacion({ estado: 'reconciliando' });
    const estado = await refrescarMembresia();
    if (!montado.current) return;
    if (estado.estado === 'cargada') {
      setContratacion({ estado: 'actualizada' });
      intento.current = null;
    } else if (estado.estado === 'sin-membresia') {
      setContratacion({ estado: 'error', status: 409, mensaje: mensajeConflicto, reconciliada: true });
    } else {
      setContratacion({ estado: 'error', status: 409, mensaje: 'No pudimos verificar la membresía después del conflicto.', mensajeConflicto });
    }
  };

  const reintentarReconciliacion = async () => {
    if (enviando.current || contratacion.estado !== 'error'
      || contratacion.status !== 409 || contratacion.reconciliada) return;
    enviando.current = true;
    try {
      await reconciliarMembresia(contratacion.mensajeConflicto);
    } finally {
      enviando.current = false;
    }
  };

  const contratar = async (event) => {
    event.preventDefault();
    if (enviando.current || membresia.estado !== 'sin-membresia' || envioBloqueado) return;
    if (!intento.current) {
      const plan = planes.estado === 'cargados'
        ? planes.datos.find((p) => String(p.id) === planSeleccionado) : null;
      if (!plan || !uuidDisponible) return;
      intento.current = { planId: plan.id, clave: globalThis.crypto.randomUUID() };
    }
    enviando.current = true;
    setContratacion({ estado: 'enviando' });
    try {
      const datos = await contratarMembresia(intento.current.planId, intento.current.clave);
      if (!montado.current) return;
      setMembresia({ estado: 'cargada', datos });
      setContratacion({ estado: 'exito' });
      intento.current = null;
    } catch (error) {
      if (!montado.current) return;
      if (error.status === 409) {
        await reconciliarMembresia(error.message);
      } else {
        setContratacion({ estado: 'error', status: error.status, mensaje: error.message });
      }
    } finally {
      enviando.current = false;
    }
  };

  const cambiarPlan = () => {
    if (enviando.current || !puedeCambiarPlan) return;
    intento.current = null;
    setPlanSeleccionado('');
    setContratacion({ estado: 'inicial' });
  };

  const actualizarPlanes = async () => {
    if (enviando.current || !puedeActualizarPlanes) return;
    enviando.current = true;
    setContratacion({ estado: 'actualizando-planes' });
    setPlanes({ estado: 'cargando' });
    try {
      const datos = await listarPlanes();
      if (!montado.current) return;
      setPlanes({ estado: 'cargados', datos });
      intento.current = null;
      setPlanSeleccionado('');
      setContratacion({ estado: 'inicial' });
    } catch (error) {
      if (montado.current) {
        setPlanes({ estado: 'error', mensaje: error.message });
        setContratacion(contratacion);
      }
    } finally {
      enviando.current = false;
    }
  };

  const periodoVigente = membresia.estado === 'cargada' ? membresia.datos.periodoVigente : null;

  return (
    <div style={{ maxWidth: '600px', background: '#fff', padding: '1.5rem', borderRadius: '8px' }}>
      <h2>M1 — Perfil y Membresía</h2>

      <section aria-labelledby="perfil-titulo" aria-busy={perfil.estado === 'cargando'}>
        <h3 id="perfil-titulo">Mi perfil</h3>
        {perfil.estado === 'cargando' && <p role="status">Cargando perfil...</p>}
        {perfil.estado === 'error' && <p role="alert">No pudimos cargar tu perfil. {perfil.mensaje}</p>}
        {perfil.estado === 'cargado' && (
          <>
            <p><strong>Nombre:</strong> {perfil.datos.nombre} {perfil.datos.apellido}</p>
            <p><strong>Email:</strong> {perfil.datos.email}</p>
            <p><strong>DNI:</strong> {perfil.datos.dni}</p>
            <p><strong>Sede:</strong> {perfil.datos.sedeNombre}</p>
          </>
        )}
      </section>

      <section aria-labelledby="membresia-titulo" aria-busy={membresia.estado === 'cargando'} style={{ border: '1px solid #e2e8f0', padding: '1rem', borderRadius: '6px', marginTop: '1rem' }}>
        <h3 id="membresia-titulo">Mi membresía</h3>
        {membresia.estado === 'cargando' && <p role="status">Cargando membresía...</p>}
        {membresia.estado === 'sin-membresia' && contratacion.estado !== 'reconciliando' && <p>No tenés una membresía.</p>}
        {contratacion.estado === 'reconciliando' && <p role="status">Verificando el estado actual de tu membresía...</p>}
        {membresia.estado === 'sin-membresia' && (
          <>
            {planes.estado === 'cargando' && <p role="status">Cargando planes...</p>}
            {planes.estado === 'error' && <p role="alert">No pudimos cargar los planes. {planes.mensaje}</p>}
            {planes.estado === 'cargados' && (planes.datos.length === 0 ? (
              <p>No hay planes disponibles para contratar.</p>
            ) : (
              <form onSubmit={contratar} aria-busy={contratacion.estado === 'enviando'}>
                <label htmlFor="plan-membresia">Elegí un plan</label>
                <select id="plan-membresia" required value={planSeleccionado}
                  disabled={contratacion.estado === 'enviando' || intento.current !== null}
                  onChange={(event) => setPlanSeleccionado(event.target.value)}>
                  <option value="">Seleccioná un plan</option>
                  {planes.datos.map((plan) => (
                    <option key={plan.id} value={String(plan.id)}>
                      {plan.nombre} — {plan.duracionMeses} meses — {plan.precio} ARS
                    </option>
                  ))}
                </select>
                <button type="submit" disabled={!planSeleccionado || !uuidDisponible || envioBloqueado}>
                  {contratacion.estado === 'enviando' ? 'Contratando...' : intento.current ? 'Reintentar contratación' : 'Confirmar contratación'}
                </button>
                {!uuidDisponible && <p role="alert">No se puede iniciar la contratación en este navegador o conexión.</p>}
              </form>
            ))}
          </>
        )}
        {contratacion.estado === 'error' && (
          <>
            <p role="alert">No pudimos completar la contratación. {contratacion.mensaje}</p>
            {contratacion.status === 400 && <p>La petición fue rechazada. Cambiar de plan no corrige necesariamente este problema.</p>}
            {contratacion.status === 403 && <p>No tenés autorización para contratar. Cambiar de plan no modifica los permisos de tu cuenta.</p>}
            {[400, 403].includes(contratacion.status) && <p>Podés recargar la página o volver a entrar después de resolver el problema.</p>}
            {contratacion.status === 409 && !contratacion.reconciliada && (
              <button type="button" onClick={reintentarReconciliacion}>Reintentar verificación de membresía</button>
            )}
            {puedeCambiarPlan && (
              <>
                <p>El pago no fue aprobado. Podés reintentar o iniciar otra contratación; otro plan no garantiza la aprobación.</p>
                <button type="button" onClick={cambiarPlan}>Iniciar nueva contratación</button>
              </>
            )}
            {puedeActualizarPlanes && <button type="button" onClick={actualizarPlanes}>Actualizar planes para elegir nuevamente</button>}
            {puedeReintentar && contratacion.status !== 402 && <p>No se pudo confirmar el resultado. Reintentá con el mismo plan, sin cerrar esta pantalla.</p>}
          </>
        )}
        {membresia.estado === 'error' && contratacion.estado !== 'reconciliando' && (
          <>
            <p role="alert">No pudimos cargar tu membresía. {membresia.mensaje}</p>
            <button type="button" onClick={refrescarMembresia}>Reintentar consulta de membresía</button>
          </>
        )}
        {contratacion.estado === 'exito' && <p role="status">Contratación confirmada.</p>}
        {contratacion.estado === 'actualizada' && <p role="status">Se actualizó el estado de tu membresía.</p>}
        {membresia.estado === 'cargada' && (
          <>
            <p><strong>Estado de Membresía:</strong> {membresia.datos.estado}</p>
            {periodoVigente ? (
              <>
                <p><strong>Plan vigente:</strong> {periodoVigente.nombrePlan}</p>
                <p><strong>Fin del período vigente (hora Argentina):</strong> {new Date(periodoVigente.fin).toLocaleString('es-AR', {
                  timeZone: 'America/Argentina/Buenos_Aires',
                  hour12: false,
                })}</p>
              </>
            ) : <p>No hay un período vigente.</p>}
          </>
        )}
        {perfil.estado === 'cargado' && membresia.estado === 'cargada' && (
          perfil.datos.id === membresia.datos.usuarioId
            ? <RenovacionMembresia key={`${perfil.datos.id}:${membresia.datos.id}`}
                perfil={perfil.datos} membresia={membresia.datos}
                onRenovada={(datos) => setMembresia({ estado: 'cargada', datos })} />
            : <p role="alert">No se puede renovar: el perfil y la membresía no corresponden a la misma cuenta.</p>
        )}
      </section>
    </div>
  );
}
