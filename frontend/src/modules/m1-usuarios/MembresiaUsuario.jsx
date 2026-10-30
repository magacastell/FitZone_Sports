import { useEffect, useRef, useState } from 'react';
import { Navigate, useOutletContext } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { consultarMiPerfil, listarPlanes, contratarMembresia } from '../../services/m1Service';
import RenovacionMembresia from './RenovacionMembresia';
import { ResumenMembresia, DatosPersonales, AccesoRapido, ComprobantesPendientes, mensajePortal } from './PortalSocioCards';
import { QrCode } from 'lucide-react';
import { AppButton, AppLink, PageHeading } from '../../components/ui/FitZoneUI';
import './PortalSocio.css';

export default function MembresiaUsuario() {
  const { user } = useAuth();
  if (!user) return <p role="status">Cargando sesión...</p>;
  if (!['CLIENTE_EXTERNO', 'SOCIO_ACTIVO'].includes(user.rol)) return <Navigate to="/perfil" replace />;
  return <MembresiaContenido />;
}

function MembresiaContenido() {
  const { user } = useAuth();
  const esCliente = user?.rol === 'CLIENTE_EXTERNO' || user?.rol === 'SOCIO_ACTIVO';
  const [perfil, setPerfil] = useState({ estado: 'cargando' });
  const { membresia, actualizarMembresia: setMembresia, refrescarMembresia, puedeAbrirQr } = useOutletContext();
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
    return () => { activo = false; };
  }, [membresia.estado, esCliente]);

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
    if (!esCliente || enviando.current || membresia.estado !== 'sin-membresia' || envioBloqueado) return;
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

  return (
    <div className="fitzone-ui">
      <div className="page-stack">
        <PageHeading eyebrow="MI CUENTA" title="Mi membresía" description="Consultá tu plan, vigencia y datos personales desde un mismo lugar."
          actions={puedeAbrirQr && <AppLink to="/mi-qr"><QrCode aria-hidden="true" />Mostrar mi QR</AppLink>} />
        <div className="membership-layout">
          <div className="portal-membership-column">
            <ResumenMembresia membresia={membresia} puedeAbrirQr={puedeAbrirQr}>
              {perfil.estado === 'cargado' && membresia.estado === 'cargada' && (
                perfil.datos.id === membresia.datos.usuarioId
                  ? <RenovacionMembresia key={`${perfil.datos.id}:${membresia.datos.id}`}
                      perfil={perfil.datos} membresia={membresia.datos}
                      onRenovada={(datos) => setMembresia({ estado: 'cargada', datos })} />
                  : <p role="alert">No se puede renovar: el perfil y la membresía no corresponden a la misma cuenta.</p>
              )}
            </ResumenMembresia>
            {(membresia.estado === 'sin-membresia' || membresia.estado === 'error' || contratacion.estado !== 'inicial') && (
              <section className="panel portal-contratacion" aria-labelledby="contratacion-titulo">
                <h3 id="contratacion-titulo">Contratación de membresía</h3>
                {contratacion.estado === 'reconciliando' && <p role="status">Verificando el estado actual de tu membresía...</p>}
                {esCliente && membresia.estado === 'sin-membresia' && (
                  <>
                    {planes.estado === 'cargando' && <p role="status">Cargando planes...</p>}
                    {planes.estado === 'error' && <p role="alert">No pudimos cargar los planes. {mensajePortal(planes.mensaje)}</p>}
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
                        <AppButton type="submit" disabled={!planSeleccionado || !uuidDisponible || envioBloqueado}>
                          {contratacion.estado === 'enviando' ? 'Contratando...' : intento.current ? 'Reintentar contratación' : 'Confirmar contratación'}
                        </AppButton>
                        {!uuidDisponible && <p role="alert">No se puede iniciar la contratación en este navegador o conexión.</p>}
                      </form>
                    ))}
                  </>
                )}
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
                    {puedeReintentar && contratacion.status !== 402 && <p>No se pudo confirmar el resultado. Reintentá con el mismo plan, sin cerrar esta pantalla.</p>}
                  </>
                )}
                {membresia.estado === 'error' && contratacion.estado !== 'reconciliando' && (
                  <>
                    <p role="alert">No pudimos cargar tu membresía. {mensajePortal(membresia.mensaje)}</p>
                    <AppButton type="button" onClick={refrescarMembresia}>Reintentar consulta de membresía</AppButton>
                  </>
                )}
                {contratacion.estado === 'exito' && <p role="status">Contratación confirmada.</p>}
                {contratacion.estado === 'actualizada' && <p role="status">Se actualizó el estado de tu membresía.</p>}
              </section>
            )}
          </div>
          <AccesoRapido puedeAbrirQr={puedeAbrirQr} membresia={membresia} />
        </div>
        <div className="member-details-grid">
          <DatosPersonales perfil={perfil} rol={user?.rol} />
          <ComprobantesPendientes />
        </div>
      </div>
    </div>
  );
}
