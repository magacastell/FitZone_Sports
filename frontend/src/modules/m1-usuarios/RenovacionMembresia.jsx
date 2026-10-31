import { useEffect, useRef, useState } from 'react';
import { listarPlanes, renovarMembresia } from '../../services/m1Service';
import { ArrowRight } from 'lucide-react';
import { AppButton } from '../../components/ui/FitZoneUI';
import { mensajePortal } from './PortalSocioCards';

export default function RenovacionMembresia({ perfil, membresia, onRenovada }) {
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
    <section className="portal-renovacion" aria-labelledby="renovacion-titulo" aria-busy={['cargando', 'preparando', 'enviando'].includes(renovacion.estado)}>
      <h3 id="renovacion-titulo">Renovar último plan contratado</h3>
      {renovacion.mensaje && <p role="alert">{mensajePortal(renovacion.mensaje)}</p>}
      {renovacion.estado === 'cargando' && <p role="status">Buscando una renovación pendiente...</p>}
      {renovacion.estado === 'lista' && (membresia.estado === 'SUSPENDIDA'
        ? <p>La membresía está suspendida. No se puede iniciar una nueva renovación.</p>
        : <AppButton variant="lime" type="button" onClick={prepararRenovacion}>{membresia.estado === 'VENCIDA' ? 'Renovar membresía' : 'Renovar plan'} <ArrowRight aria-hidden="true" /></AppButton>)}
      {renovacion.estado === 'preparando' && <p role="status">Consultando el último plan contratado...</p>}
      {renovacion.estado === 'confirmar' && (
        <>
          <p>{renovacion.plan.nombre} — {renovacion.plan.duracionMeses} meses — {renovacion.plan.precio} ARS</p>
          <p>Se utilizará el precio vigente al procesar el pago.</p>
          <AppButton variant="lime" type="button" disabled={typeof globalThis.crypto?.randomUUID !== 'function'} onClick={enviarRenovacion}>Confirmar renovación</AppButton>
          {typeof globalThis.crypto?.randomUUID !== 'function' && <p role="alert">Este navegador o conexión no permite iniciar la renovación.</p>}
        </>
      )}
      {renovacion.estado === 'enviando' && <p role="status">Procesando renovación...</p>}
      {pendiente && (
        <>
          <p>{renovacion.estado === 'rechazada' ? 'El pago no fue aprobado.' : 'Existe una renovación pendiente de resolución.'}</p>
          <p>Solicitud iniciada: {new Date(intento.current.creadoEn).toLocaleString('es-AR', { timeZone: 'America/Argentina/Buenos_Aires', hour12: false })}.</p>
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

    </section>
  );
}
