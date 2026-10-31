import { useEffect, useRef, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { listarPlanes, listarSedes, contratarMembresia } from '../../services/m1Service';
import { AppButton, StatusBadge } from '../../components/ui/FitZoneUI';
import { mensajePortal } from './PortalSocioCards';
import CatalogoPlanes from './CatalogoPlanes';

export default function ContratacionMembresia({ perfil, onContratada }) {
  const { user, token } = useAuth();
  const esCliente = user?.rol === 'USUARIO';
  const { membresia, actualizarMembresia: setMembresia, refrescarMembresia } = useOutletContext();
  const [consultaPlanes, setConsultaPlanes] = useState(0);
  const [planes, setPlanes] = useState({ estado: 'inicial' });
  const [planSeleccionado, setPlanSeleccionado] = useState('');
  const [sedes, setSedes] = useState({ estado: 'inicial' });
  const [sedeSeleccionada, setSedeSeleccionada] = useState('');
  const [contratacion, setContratacion] = useState({ estado: 'inicial' });
  const intento = useRef(null);
  const enviando = useRef(false);
  const montado = useRef(false);
  const claveStorage = `fitzone:m1:contratacion:${user.email}`;
  const sesion = useRef(token);
  const mismaSesion = () => {
    try { return localStorage.getItem('token') === sesion.current; } catch { return false; }
  };

  const descartarIntento = () => {
    try {
      sessionStorage.removeItem(claveStorage);
      intento.current = null;
      return true;
    } catch {
      setContratacion({ estado: 'error-local', mensaje: 'No pudimos limpiar la contratación guardada. Recargá antes de continuar.' });
      return false;
    }
  };

  useEffect(() => {
    montado.current = true;
    try {
      const texto = sessionStorage.getItem(claveStorage);
      if (texto !== null) {
        const registro = JSON.parse(texto);
        if (registro.version !== 1 || registro.email !== user.email
          || !Number.isInteger(registro.planId) || registro.planId <= 0
          || !Number.isInteger(registro.sedeId) || registro.sedeId <= 0
          || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(registro.clave)) throw new Error();
        intento.current = registro;
        setPlanSeleccionado(String(registro.planId)); setSedeSeleccionada(String(registro.sedeId));
        setContratacion({ estado: 'error', mensaje: 'Hay una contratación pendiente. Podés reintentar la misma operación.' });
      }
    } catch {
      setContratacion({ estado: 'error-local', mensaje: 'No pudimos recuperar la contratación guardada. No enviaremos una nueva operación.' });
    }
    return () => { montado.current = false; };
  }, []);
  useEffect(() => {
    if (membresia.estado === 'cargada' && intento.current && mismaSesion() && descartarIntento()) {
      setContratacion({ estado: 'actualizada' });
      onContratada?.();
    }
  }, [membresia.estado]);
  useEffect(() => {
    if (!esCliente || membresia.estado !== 'sin-membresia') return;
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
    setSedes({ estado: 'cargando' });
    listarSedes().then(
      (datos) => { if (activo) setSedes({ estado: 'cargadas', datos }); },
      (error) => { if (activo) setSedes({ estado: 'error', mensaje: error.message }); },
    );
    return () => { activo = false; };
  }, [membresia.estado, esCliente, consultaPlanes]);

  const sedeActual = perfil?.estado === 'cargado' ? perfil.datos.sedeId : null;
  const sedeElegida = sedeActual ?? (sedeSeleccionada ? Number(sedeSeleccionada) : null);
  const sedeVisible = sedes.datos?.find((sede) => sede.id === sedeElegida);
  const planVisible = planes.datos?.find((plan) => String(plan.id) === planSeleccionado);

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
      descartarIntento();
      onContratada?.();
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
    if (!esCliente || enviando.current || !mismaSesion() || membresia.estado !== 'sin-membresia' || envioBloqueado) return;
    if (!intento.current) {
      const plan = planes.estado === 'cargados'
        ? planes.datos.find((p) => String(p.id) === planSeleccionado) : null;
      if (!plan || !uuidDisponible || perfil?.estado !== 'cargado' || !sedeVisible) return;
      const nueva = { version: 1, email: user.email, planId: plan.id, sedeId: sedeVisible.id, clave: globalThis.crypto.randomUUID() };
      try { sessionStorage.setItem(claveStorage, JSON.stringify(nueva)); } catch {
        setContratacion({ estado: 'error-local', mensaje: 'No pudimos guardar la contratación. No se envió el pago.' });
        return;
      }
      intento.current = nueva;
    }
    enviando.current = true;
    setContratacion({ estado: 'enviando' });
    try {
      const datos = await contratarMembresia(intento.current.planId, intento.current.clave, intento.current.sedeId);
      if (!montado.current || !mismaSesion()) return;
      setMembresia({ estado: 'cargada', datos });
      if (descartarIntento()) setContratacion({ estado: 'exito' });
      onContratada?.();
    } catch (error) {
      if (!montado.current || !mismaSesion()) return;
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
    if (!descartarIntento()) return;
    setPlanSeleccionado('');
    setSedeSeleccionada('');
    setContratacion({ estado: 'inicial' });
  };

  const actualizarPlanes = async () => {
    if (enviando.current || !puedeActualizarPlanes) return;
    enviando.current = true;
    setContratacion({ estado: 'actualizando-planes' });
    setPlanes({ estado: 'cargando' });
    try {
      const [datos, opciones] = await Promise.all([listarPlanes(), listarSedes()]);
      if (!montado.current) return;
      setPlanes({ estado: 'cargados', datos });
      setSedes({ estado: 'cargadas', datos: opciones });
      if (!descartarIntento()) return;
      setPlanSeleccionado('');
      setSedeSeleccionada('');
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

  if (membresia.estado === 'cargando' || (membresia.estado === 'cargada' && contratacion.estado === 'inicial')) return null;
  if (contratacion.estado === 'exito') return <p role="status">Contratación confirmada. Tu membresía ya está disponible.</p>;
  if (contratacion.estado === 'actualizada') return <p role="status">Se actualizó el estado de tu membresía.</p>;
  return (
    <section className="portal-contratacion" aria-labelledby="contratacion-titulo">
      <h3 id="contratacion-titulo" className="sr-only">Planes disponibles</h3>
      {contratacion.estado === 'reconciliando' && <p role="status">Verificando el estado actual de tu membresía...</p>}
      {esCliente && membresia.estado === 'sin-membresia' && (
        <>
          {planes.estado === 'cargando' && <p role="status">Cargando planes...</p>}
          {planes.estado === 'error' && <><p role="alert">No pudimos cargar los planes. {mensajePortal(planes.mensaje)}</p>{contratacion.estado === 'inicial' && <AppButton type="button" onClick={() => setConsultaPlanes((actual) => actual + 1)}>Reintentar catálogo</AppButton>}</>}
          {perfil?.estado === 'error' && <p role="alert">No pudimos consultar tu cuenta. Recargá para continuar.</p>}
          {planes.estado === 'cargados' && (planes.datos.length === 0 ? (
            <p>No hay planes disponibles para contratar.</p>
          ) : (
            <form onSubmit={contratar} aria-busy={contratacion.estado === 'enviando'}>
              <CatalogoPlanes planes={planes.datos} seleccionado={planSeleccionado} bloqueado={contratacion.estado === 'enviando' || intento.current !== null} onSeleccionar={setPlanSeleccionado} />
              {(planSeleccionado || intento.current) && <section className="panel contratacion-confirmacion" aria-labelledby="plan-seleccionado-titulo">
                <div className="contratacion-plan">
                  <div>
                    <p className="eyebrow">PLAN SELECCIONADO</p>
                    <h4 id="plan-seleccionado-titulo">{planVisible?.nombre || 'Tu contratación pendiente'}</h4>
                    {planVisible && <p>{planVisible.duracionMeses} {planVisible.duracionMeses === 1 ? 'mes' : 'meses'}</p>}
                  </div>
                  <div className="contratacion-plan__precio">
                    {planVisible && <strong>{Number(planVisible.precio).toLocaleString('es-AR', { style: 'currency', currency: 'ARS' })}</strong>}
                    <StatusBadge tone="success">Seleccionado</StatusBadge>
                  </div>
                </div>
                {sedes.estado === 'cargando' && <p role="status">Cargando sedes...</p>}
                {sedes.estado === 'error' && <><p role="alert">No pudimos cargar las sedes. {mensajePortal(sedes.mensaje)}</p>{contratacion.estado === 'inicial' && <AppButton type="button" onClick={() => setConsultaPlanes((actual) => actual + 1)}>Reintentar sedes</AppButton>}</>}
                {sedes.estado === 'cargadas' && <div className="contratacion-sede"><label htmlFor="sede-habitual">{sedeActual ? 'Tu sede habitual' : 'Elegí tu sede habitual'}</label>
                <p id="sede-habitual-ayuda">Será tu sede principal. Tu membresía seguirá permitiéndote acceder a las demás sedes.</p>
                {sedes.datos.length ? <select id="sede-habitual" aria-describedby="sede-habitual-ayuda" value={intento.current ? String(intento.current.sedeId) : sedeElegida == null ? '' : String(sedeElegida)} disabled={!!sedeActual || intento.current !== null || contratacion.estado === 'enviando'} onChange={(event) => setSedeSeleccionada(event.target.value)}>
                  <option value="">Seleccioná una sede</option>{sedes.datos.map((sede) => <option key={sede.id} value={sede.id}>{sede.nombre}{sede.direccion ? ` — ${sede.direccion}` : ''}</option>)}
                </select> : <p>No hay sedes disponibles para contratar.</p>}
                {sedeActual && <p>Se conserva la sede habitual de tu cuenta.</p>}
                </div>}
                {(!intento.current || contratacion.estado === 'enviando') && <div className="contratacion-confirmacion__footer"><p>Al confirmar se procesa el pago simulado, sin cargos reales.</p><AppButton type="submit" disabled={!planSeleccionado || !sedeVisible || perfil?.estado !== 'cargado' || !uuidDisponible || envioBloqueado}>{contratacion.estado === 'enviando' ? 'Contratando...' : 'Confirmar contratación'}</AppButton></div>}
              </section>}
              {!planSeleccionado && !intento.current && <div className="contratacion-siguiente"><p>Elegí un plan para continuar con tu sede habitual.</p><AppButton type="submit" disabled>Confirmar contratación</AppButton></div>}
              {!uuidDisponible && <p role="alert">No se puede iniciar la contratación en este navegador o conexión.</p>}
            </form>
          ))}
        </>
      )}
      {contratacion.estado === 'error-local' && <p role="alert">{contratacion.mensaje}</p>}
      {intento.current && puedeReintentar && <AppButton type="button" onClick={contratar}>Reintentar contratación</AppButton>}
      {contratacion.estado === 'error' && (
        <>
          <p role="alert">No pudimos completar la contratación. {mensajePortal(contratacion.mensaje)}</p>
          {contratacion.status === 400 && <p>La petición fue rechazada. Cambiar de plan no corrige necesariamente este problema.</p>}
          {contratacion.status === 403 && <p>No tenés autorización para contratar. Cambiar de plan no modifica los permisos de tu cuenta.</p>}
          {[400, 403].includes(contratacion.status) && <p>Podés recargar la página o volver a entrar después de resolver el problema.</p>}
          {contratacion.status === 409 && !contratacion.reconciliada && (
            <AppButton type="button" onClick={reintentarReconciliacion}>Reintentar verificación de membresía</AppButton>
          )}
          {puedeCambiarPlan && (
            <>
              <p>El pago no fue aprobado. Podés reintentar o iniciar otra contratación; otro plan no garantiza la aprobación.</p>
              <AppButton type="button" onClick={cambiarPlan}>Iniciar nueva contratación</AppButton>
            </>
          )}
          {puedeActualizarPlanes && <AppButton type="button" onClick={actualizarPlanes}>Actualizar planes para elegir nuevamente</AppButton>}
          {puedeReintentar && contratacion.status !== 402 && <p>No se pudo confirmar el resultado. El reintento conserva el mismo plan y sede.</p>}
        </>
      )}
      {membresia.estado === 'error' && contratacion.estado !== 'reconciliando' && (
        <>
          <p role="alert">No pudimos cargar tu membresía. {mensajePortal(membresia.mensaje)}</p>
          <AppButton type="button" onClick={refrescarMembresia}>Reintentar consulta de membresía</AppButton>
        </>
      )}
    </section>
  );
}
