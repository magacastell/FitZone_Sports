import { useEffect, useRef, useState } from 'react';
import { configurarRenovacionAutomatica, consultarMiMembresia, listarPlanes, renovarMembresia } from '../../services/m1Service';
import { ArrowRight } from 'lucide-react';
import { AppButton, StatusBadge } from '../../components/ui/FitZoneUI';
import CatalogoPlanes from './CatalogoPlanes';
import { disponibilidadRenovacion, mensajePortal } from './PortalSocioCards';

export default function RenovacionMembresia({ perfil, membresia, onRenovada }) {
  const [renovacion, setRenovacion] = useState({ estado: 'cargando' });
  const [automatica, setAutomatica] = useState({ estado: 'lista' });
  const [confirmarActivacion, setConfirmarActivacion] = useState(false);
  const [ahora, setAhora] = useState(Date.now);
  const dialogoActivacion = useRef(null);
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
    const timer = setInterval(() => setAhora(Date.now()), 60000);
    return () => { montado.current = false; clearInterval(timer); };
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
    if (enviando.current || !mismaSesion() || intento.current || disponibilidadRenovacion(membresia) !== 'disponible' || automatica.estado === 'incierta') return;
    enviando.current = true;
    setRenovacion({ estado: 'preparando' });
    try {
      const actual = await consultarMiMembresia();
      if (!montado.current || !mismaSesion()) return;
      validarCuenta(actual);
      onRenovada(actual);
      if (disponibilidadRenovacion(actual) !== 'disponible') {
        setRenovacion({ estado: 'lista', mensaje: 'Actualizamos tu membresía. Revisá su vigencia, períodos y renovación automática antes de continuar.' });
        return;
      }
      const planes = await listarPlanes();
      if (!montado.current || !mismaSesion()) return;
      setRenovacion(planes.length
        ? { estado: 'confirmar', planes, plan: planes.find((p) => p.id === actual.planId) || planes[0] }
        : { estado: 'lista', mensaje: 'No hay planes activos disponibles para renovar.' });
    } catch (error) {
      if (montado.current && mismaSesion()) setRenovacion({ estado: 'lista', mensaje: error.message });
    } finally {
      enviando.current = false;
    }
  };

  const validarCuenta = (datos) => {
    if (datos.id !== membresia.id || datos.usuarioId !== perfil.id) throw new Error('La respuesta no corresponde a esta cuenta. Recargá para verificar la sesión.');
  };

  const cambiarAutomatica = async (habilitada) => {
    if (enviando.current || intento.current || !mismaSesion()
      || !['lista', 'exito'].includes(renovacion.estado)
      || (habilitada && membresia.estado === 'SUSPENDIDA')) return;
    enviando.current = true;
    setAutomatica({ estado: 'guardando', habilitada });
    try {
      const datos = await configurarRenovacionAutomatica(membresia.id, habilitada);
      if (!montado.current || !mismaSesion()) return;
      validarCuenta(datos);
      onRenovada(datos);
      setAutomatica({ estado: 'lista', mensaje: habilitada ? 'Renovación automática habilitada.' : 'Renovación automática deshabilitada.' });
    } catch (error) {
      if (montado.current && mismaSesion()) setAutomatica({ estado: 'incierta', habilitada,
        mensaje: `${mensajePortal(error.message)} No confirmamos el cambio. Reintentá la misma preferencia antes de iniciar otra operación.` });
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
    setRenovacion({ ...renovacion, verificando: true });
    try {
      if (!anterior) {
        // La consulta evita operar con una preferencia automática o vigencia obsoleta.
        const actual = await consultarMiMembresia();
        if (!montado.current || !mismaSesion()) return;
        validarCuenta(actual);
        onRenovada(actual);
        if (disponibilidadRenovacion(actual) !== 'disponible') {
          setRenovacion({ estado: 'lista', mensaje: 'Tu membresía cambió. Revisá los períodos confirmados y la renovación automática.' });
          return;
        }
      }
    } catch (error) {
      if (montado.current && mismaSesion()) setRenovacion({ ...renovacion, mensaje: `No pudimos verificar tu membresía. ${mensajePortal(error.message)}` });
      return;
    } finally {
      // La verificación no deja el formulario bloqueado si falla o descarta el envío.
      enviando.current = false;
    }
    if (!montado.current || !mismaSesion()) return;
    enviando.current = true;
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
        if (sesionActual === sesion.current) { validarCuenta(datos); onRenovada(datos); }
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
  const disponibilidad = disponibilidadRenovacion(membresia, ahora);
  const puedeNueva = disponibilidad === 'disponible' && automatica.estado !== 'incierta';
  const planesPreparados = renovacion.estado === 'confirmar' && puedeNueva;
  const ultimo = (membresia.periodos || []).filter((p) => p.estado !== 'CANCELADA')
    .sort((a, b) => Date.parse(b.fin) - Date.parse(a.fin))[0];
  const activada = membresia.renovacionAutomatica;
  const suspendida = membresia.estado === 'SUSPENDIDA';
  const finUltimoPeriodo = Date.parse(ultimo?.fin);
  const fechaAutomatica = finUltimoPeriodo > ahora
    ? new Date(finUltimoPeriodo).toLocaleDateString('es-AR', {
      timeZone: 'America/Argentina/Buenos_Aires', day: 'numeric', month: 'short', year: 'numeric',
    })
    : null;
  const puedeAutomatica = ['lista', 'exito'].includes(renovacion.estado) && !intento.current
    && (activada || (!suspendida && ultimo));
  const mostrarConfirmacion = confirmarActivacion && puedeAutomatica && !activada && !suspendida;
  const mostrarManual = !['lista', 'exito'].includes(renovacion.estado) || puedeNueva || disponibilidad === 'suspendida';

  let resumenAutomatica = 'Renová al terminar tus períodos pagados.';
  if (suspendida) resumenAutomatica = 'Tu membresía está suspendida.';
  else if (!ultimo) resumenAutomatica = 'Renová manualmente para habilitar esta opción.';
  else if (activada) {
    resumenAutomatica = fechaAutomatica
      ? <>Desde <strong>{fechaAutomatica}</strong> · {ultimo.nombrePlan}</>
      : <>Puede renovarse en la próxima ejecución · {ultimo.nombrePlan}</>;
  }

  useEffect(() => {
    const dialogo = dialogoActivacion.current;
    if (mostrarConfirmacion && dialogo && !dialogo.open) dialogo.showModal();
  }, [mostrarConfirmacion]);

  const pedirCambioAutomatica = () => {
    if (!puedeAutomatica || enviando.current || !mismaSesion()) return;
    if (!activada && finUltimoPeriodo <= Date.now()) {
      setConfirmarActivacion(true);
      return;
    }
    return cambiarAutomatica(!activada);
  };

  const cerrarConfirmacion = () => {
    dialogoActivacion.current?.close();
    setConfirmarActivacion(false);
  };

  return (
    <div className="portal-renovacion" aria-busy={enviando.current || renovacion.estado === 'cargando'}>
      {mostrarManual && <section className={`panel portal-renovacion__manual${['lista', 'exito'].includes(renovacion.estado) && puedeNueva ? ' portal-renovacion__manual--lista' : ''}`} aria-labelledby="renovacion-titulo">
      <h3 id="renovacion-titulo">{disponibilidad === 'suspendida' ? 'Membresía suspendida' : membresia.estado === 'VENCIDA' ? 'Recuperá tus beneficios' : 'Tu próximo período'}</h3>
      {renovacion.mensaje && <p role="alert">{mensajePortal(renovacion.mensaje)}</p>}
      {renovacion.estado === 'cargando' && <p role="status">Buscando una renovación pendiente...</p>}
      {disponibilidad === 'suspendida' && <p>La membresía está suspendida. No se puede iniciar una nueva renovación. Consultá con administración.</p>}
      {['lista', 'exito'].includes(renovacion.estado) && puedeNueva && <AppButton type="button" disabled={enviando.current} onClick={prepararRenovacion}>{membresia.estado === 'VENCIDA' ? 'Renovar membresía' : 'Renovar plan'} <ArrowRight aria-hidden="true" /></AppButton>}
      {renovacion.estado === 'preparando' && <p role="status">Consultando membresía y planes activos...</p>}
      {renovacion.estado === 'confirmar' && renovacion.verificando && enviando.current && <p role="status">Verificando la membresía antes de renovar…</p>}
      {planesPreparados && (
        <>
          <p>Elegí tu siguiente plan. Conservás los días pagados; si tu membresía venció, la vigencia comienza al aprobar el pago, sin cobrar días anteriores.</p>
          <CatalogoPlanes planes={renovacion.planes} seleccionado={String(renovacion.plan.id)} bloqueado={enviando.current}
            onSeleccionar={(id) => { if (!enviando.current) setRenovacion({ ...renovacion, plan: renovacion.planes.find((p) => String(p.id) === id) }); }} />
          <p>{renovacion.plan.nombre} — {renovacion.plan.duracionMeses} {renovacion.plan.duracionMeses === 1 ? 'mes' : 'meses'} — {renovacion.plan.precio} ARS</p>
          <p className="renewal-secondary">Pago simulado al precio vigente. Tus períodos anteriores se conservan.</p>
          <AppButton type="button" disabled={enviando.current || typeof globalThis.crypto?.randomUUID !== 'function'} onClick={enviarRenovacion}>Confirmar renovación</AppButton>
          <AppButton type="button" variant="secondary" disabled={enviando.current} onClick={() => setRenovacion({ estado: 'lista' })}>Cancelar selección</AppButton>
          {typeof globalThis.crypto?.randomUUID !== 'function' && <p role="alert">Este navegador o conexión no permite iniciar la renovación.</p>}
        </>
      )}
      {renovacion.estado === 'confirmar' && !puedeNueva && <>
        <p>La membresía cambió mientras elegías el plan. Conservamos los períodos confirmados.</p>
        <AppButton type="button" variant="secondary" disabled={enviando.current} onClick={() => setRenovacion({ estado: 'lista' })}>Cerrar selección</AppButton>
      </>}
      {renovacion.estado === 'enviando' && <p role="status">Procesando renovación...</p>}
      {pendiente && (
        <>
          <p>{renovacion.estado === 'rechazada' ? 'El pago no fue aprobado.' : 'Existe una renovación pendiente de resolución.'}</p>
          <p>Solicitud iniciada: {new Date(intento.current.creadoEn).toLocaleString('es-AR', { timeZone: 'America/Argentina/Buenos_Aires', hour12: false })}.</p>
          <p>Plan elegido: referencia #{intento.current.planId}. Se conserva ese plan y la misma clave en todos los reintentos.</p>
          <p>El reintento usa la misma operación y puede completar un cobro que todavía no se haya aplicado. Resolvé este intento antes de cerrar la pestaña.</p>
          {renovacion.status === 403 && <p>No tenés autorización para renovar. Resolvé el acceso antes de reintentar.</p>}
          {renovacion.status === 400 && <p>La solicitud fue rechazada. No se iniciará otra renovación automáticamente.</p>}
          {renovacion.status === 402 && <p>El último pago no fue aprobado, pero el resultado anterior sigue sin resolverse. Conservamos la misma operación.</p>}
          {renovacion.status === 404 && <p>No se encontró la membresía o el plan. El intento se conserva para verificar su resultado.</p>}
          {renovacion.status === 409 && <p>Hay un conflicto de estado o de plan. No se iniciará otra renovación automáticamente.</p>}
          <AppButton variant="lime" type="button" onClick={enviarRenovacion}>Reintentar renovación pendiente</AppButton>
          {renovacion.estado === 'rechazada' && <AppButton variant="lime" type="button" onClick={abandonarRechazada}>Abandonar intención rechazada</AppButton>}
        </>
      )}
      {renovacion.estado === 'exito' && <p className="membership-renewed" role="status">Renovación confirmada</p>}
      {['error-storage', 'invalida'].includes(renovacion.estado) && <AppButton variant="lime" type="button" onClick={cargarPendiente}>Releer renovación pendiente</AppButton>}
      {renovacion.estado === 'invalida' && <AppButton variant="lime" type="button" onClick={descartarInvalida}>Descartar registro inválido tras verificar la operación</AppButton>}
      {renovacion.estado === 'limpieza-pendiente' && <AppButton variant="lime" type="button" onClick={limpiarConfirmada}>Reintentar limpieza de operación confirmada</AppButton>}
      </section>}
      {!mostrarManual && renovacion.estado === 'exito' && <p className="membership-renewed" role="status">Renovación confirmada</p>}
      {disponibilidad === 'programada' && <p className="renewal-secondary">Tus períodos futuros conservan sus fechas. Si hay un intervalo sin cobertura, consultá con administración.</p>}
      <section className="panel portal-automatica" aria-labelledby="automatica-titulo">
        <div className="portal-automatica__resumen">
          <div className="portal-automatica__heading">
            <h3 id="automatica-titulo">Renovación automática</h3>
            <StatusBadge tone={activada && !suspendida ? 'success' : 'neutral'}>
              {activada ? (suspendida ? 'Pausada' : 'Activada') : 'Desactivada'}
            </StatusBadge>
          </div>
          <p id="automatica-resumen">{resumenAutomatica}</p>
          {ultimo && !suspendida && <p className="renewal-secondary">Cobro simulado al precio vigente al renovar.</p>}
        </div>
        {puedeAutomatica && ['lista', 'guardando'].includes(automatica.estado) && (
          <AppButton type="button" variant={activada ? 'secondary' : 'primary'}
            aria-label={activada ? 'Desactivar renovación automática' : 'Activar renovación automática'}
            aria-describedby="automatica-resumen"
            disabled={automatica.estado === 'guardando' || enviando.current} onClick={pedirCambioAutomatica}>
            {activada ? 'Desactivar' : 'Activar'}
          </AppButton>
        )}
        {automatica.estado === 'incierta' && <AppButton type="button" variant="secondary" onClick={() => cambiarAutomatica(automatica.habilitada)}>Reintentar la misma preferencia</AppButton>}
        {automatica.mensaje && (automatica.estado === 'incierta'
          ? <p role="alert">{automatica.mensaje}</p>
          : <p className="sr-only" role="status">{automatica.mensaje}</p>)}
        {automatica.estado === 'guardando' && <p role="status">Guardando preferencia…</p>}
        {mostrarConfirmacion && (
          <dialog ref={dialogoActivacion} className="portal-automatica__dialogo"
            aria-labelledby="activar-automatica-titulo" aria-describedby="activar-automatica-aviso"
            onClose={() => setConfirmarActivacion(false)}>
            <h3 id="activar-automatica-titulo">¿Activar la renovación automática?</h3>
            <p id="activar-automatica-aviso">Tu membresía ya venció. El cobro simulado puede intentarse en la próxima ejecución con tu último plan, al precio vigente.</p>
            <div className="portal-automatica__acciones">
              <AppButton type="button" variant="secondary" autoFocus onClick={cerrarConfirmacion}>Volver</AppButton>
              <AppButton type="button" onClick={() => { cerrarConfirmacion(); return cambiarAutomatica(true); }}>Confirmar activación</AppButton>
            </div>
          </dialog>
        )}
      </section>
    </div>
  );
}
