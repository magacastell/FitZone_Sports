import { useEffect, useRef, useState } from 'react';
import { consultarMiPerfil, consultarMiMembresia, listarPlanes, contratarMembresia } from '../../services/m1Service';

export default function PerfilUsuario() {
  const [perfil, setPerfil] = useState({ estado: 'cargando' });
  const [membresia, setMembresia] = useState({ estado: 'cargando' });
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

    consultarMiMembresia().then(
      (datos) => {
        if (activo) setMembresia({ estado: 'cargada', datos });
      },
      (error) => {
        if (activo) setMembresia(error.status === 404
          ? { estado: 'sin-membresia' }
          : { estado: 'error', mensaje: error.message });
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
    try {
      const datos = await consultarMiMembresia();
      if (!montado.current) return;
      setMembresia({ estado: 'cargada', datos });
      setContratacion({ estado: 'actualizada' });
      intento.current = null;
    } catch (errorConsulta) {
      if (!montado.current) return;
      if (errorConsulta.status === 404) {
        setMembresia({ estado: 'sin-membresia' });
        setContratacion({ estado: 'error', status: 409, mensaje: mensajeConflicto, reconciliada: true });
      } else {
        setMembresia({ estado: 'error', mensaje: errorConsulta.message });
        setContratacion({ estado: 'error', status: 409, mensaje: 'No pudimos verificar la membresía después del conflicto.', mensajeConflicto });
      }
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
        {membresia.estado === 'error' && contratacion.estado !== 'reconciliando' && <p role="alert">No pudimos cargar tu membresía. {membresia.mensaje}</p>}
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
        <button type="button" disabled aria-describedby="renovacion-pendiente" style={{ padding: '0.5rem 1rem', background: '#64748b', color: '#fff', border: 'none', borderRadius: '4px', marginTop: '1rem', cursor: 'not-allowed' }}>
          Renovar Membresía
        </button>
        <p id="renovacion-pendiente">La renovación desde esta pantalla todavía no está disponible.</p>
      </section>
    </div>
  );
}
