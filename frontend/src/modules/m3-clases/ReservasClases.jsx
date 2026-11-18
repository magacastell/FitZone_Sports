import { useEffect, useRef, useState } from 'react';
import { CalendarDays } from 'lucide-react';
import DialogoReserva from '../../components/ui/DialogoReserva';
import { AppButton, AppLink, DataCard, EmptyState, StatusBadge } from '../../components/ui/FitZoneUI';
import { cancelarReservaClase, consultarMiActividadClases, entrarEnEspera, reservarClase, responderOferta, salirDeEspera } from '../../services/m3Service';
import { formatearFechaHora } from './claseUtils';
import './AgendaClases.css';

const ACTIVIDAD_VACIA = { reservas: [], listaEspera: [], ofertas: [], estado: 'cargando' };

export function useActividadClases(habilitada, refresco) {
  const [actividad, setActividad] = useState(ACTIVIDAD_VACIA);

  useEffect(() => {
    if (!habilitada) return;
    let activo = true;
    consultarMiActividadClases().then((datos) => {
      if (activo) setActividad({ ...datos, estado: 'cargada' });
    }, () => {
      if (activo) setActividad((anterior) => ({ ...anterior, estado: 'error' }));
    });
    return () => { activo = false; };
  }, [habilitada, refresco]);

  return actividad;
}

export function useGestionReservasClase(onCambio) {
  const [aviso, setAviso] = useState(null);
  const [ocupada, setOcupada] = useState(false);
  const [modal, setModal] = useState(null);
  const operacionEnCurso = useRef(false);

  const ejecutar = async (accion, mensaje) => {
    if (operacionEnCurso.current) return false;
    operacionEnCurso.current = true;
    setOcupada(true);
    setAviso(null);
    try {
      await accion();
      if (mensaje) setAviso({ tipo: 'ok', texto: mensaje });
      return true;
    } catch (error) {
      setAviso({ tipo: 'error', texto: error.message === 'Failed to fetch'
        ? 'No pudimos confirmar la operación. Revisá tu conexión e intentá nuevamente.'
        : error.message || 'No se pudo completar la acción.' });
      return false;
    } finally {
      operacionEnCurso.current = false;
      setOcupada(false);
      onCambio();
    }
  };

  const confirmarReserva = (clase, reserva) => {
    if (reserva?.estado !== 'CONFIRMADA' || reserva.claseId !== clase.id) {
      throw new Error('No pudimos verificar la confirmación. Revisá Mis reservas.');
    }
    setModal({ tipo: 'confirmada', clase });
  };
  const reservar = (clase) => ejecutar(async () => confirmarReserva(clase, await reservarClase(clase.id)));
  const anotarse = (clase) => ejecutar(() => entrarEnEspera(clase.id), `Te anotaste en la lista de espera de ${clase.nombre}.`);
  const salirDeLaEspera = (clase) => ejecutar(() => salirDeEspera(clase.id), 'Saliste de la lista de espera.');
  const cancelarReserva = (clase, reserva) => {
    setAviso(null);
    setModal({ tipo: 'cancelar', clase, reserva });
  };
  const cerrarModal = () => setModal(null);
  const confirmarCancelacion = async () => {
    const { clase, reserva } = modal;
    const cancelada = await ejecutar(async () => {
      const resultado = await cancelarReservaClase(clase.id, reserva.id);
      if (resultado?.estado !== 'CANCELADA' || resultado.id !== reserva.id) {
        throw new Error('No pudimos verificar la cancelación. Revisá Mis reservas.');
      }
    }, 'Cancelaste tu reserva.');
    if (cancelada) cerrarModal();
  };
  const responder = (clase, oferta, respuesta) => ejecutar(async () => {
    const resultado = await responderOferta(clase.id, oferta.id, respuesta);
    if (respuesta === 'ACEPTAR') confirmarReserva(clase, resultado?.reserva);
  }, respuesta === 'RECHAZAR' ? 'Rechazaste el lugar.' : undefined);

  return { aviso, setAviso, ocupada, modal, ejecutar, reservar, anotarse, salirDeLaEspera, cancelarReserva, responder, cerrarModal, confirmarCancelacion };
}

export function AvisoReservaClase({ aviso }) {
  if (!aviso) return null;
  return <p className={`agenda-aviso agenda-aviso--${aviso.tipo}`} role={aviso.tipo === 'error' ? 'alert' : 'status'}>{aviso.texto}</p>;
}

export function DialogoReservaClase({ gestion, onVerReservas, enReservas = false }) {
  const { modal, cerrarModal, confirmarCancelacion, aviso, ocupada: ocupado } = gestion;
  if (!modal) return null;
  const cancela = modal.tipo === 'cancelar';

  return (
    <DialogoReserva titulo={cancela ? '¿Cancelar tu reserva?' : 'Tu reserva está confirmada'}
      detalle={<>
        <p><strong>{modal.clase.nombre}</strong> · {formatearFechaHora(modal.clase.inicio)}</p>
        {cancela && <p>Vas a liberar tu lugar. Si faltan menos de 2 horas, la cancelación queda registrada como tardía.</p>}
      </>} ocupado={ocupado} onCerrar={cerrarModal} textoCerrar={cancela ? 'Mantener reserva' : 'Cerrar'}
      accion={cancela ? (
        <AppButton type="button" variant="danger" disabled={ocupado} onClick={confirmarCancelacion}>
          {ocupado ? 'Cancelando…' : 'Confirmar cancelación'}
        </AppButton>
      ) : !enReservas && (onVerReservas
        ? <AppButton type="button" onClick={onVerReservas}>Ir a mis reservas</AppButton>
        : <AppLink variant="primary" to="/mis-reservas#clases">Ir a mis reservas</AppLink>)}>
      {aviso?.tipo === 'error' && <AvisoReservaClase aviso={aviso} />}
    </DialogoReserva>
  );
}

export function ActividadClasesPanel({ actividad, gestion, actualizar, personal = false }) {
  const { ocupada, responder, cancelarReserva, salirDeLaEspera } = gestion;
  const espera = actividad.listaEspera.filter(({ entrada }) => entrada.estado === 'EN_ESPERA');
  const hayActividad = actividad.reservas.length + espera.length + actividad.ofertas.length > 0;

  return (
    <DataCard title={personal ? 'Clases' : 'Mis reservas'} description="Reservas, listas de espera y ofertas de lugar."
      action={personal && <AppLink to="/clases">Ver clases</AppLink>}>
      {actividad.estado === 'cargando' && <p role="status">Consultando tus clases…</p>}
      {actividad.estado === 'error' && <>
        <p role="alert">No pudimos actualizar tus clases.</p>
        <AppButton type="button" variant="secondary" onClick={actualizar}>Reintentar</AppButton>
      </>}
      {actividad.estado === 'cargada' && !hayActividad && (
        <EmptyState icon={CalendarDays} title="Todavía no tenés clases reservadas" />
      )}
      {hayActividad && (
        <ul className="mis-clases">
          {actividad.ofertas.map(({ oferta, clase }) => (
            <li key={`o${oferta.id}`} className="mis-clases__oferta">
              <div><strong>{clase.nombre}</strong><span>{formatearFechaHora(clase.inicio)}</span>
                <StatusBadge tone="warning">Se liberó un lugar: aceptalo antes del {formatearFechaHora(oferta.venceEn)}</StatusBadge></div>
              <div>
                <AppButton size="sm" disabled={ocupada} onClick={() => responder(clase, oferta, 'ACEPTAR')}>Aceptar</AppButton>
                <AppButton size="sm" variant="secondary" disabled={ocupada} onClick={() => responder(clase, oferta, 'RECHAZAR')}>Rechazar</AppButton>
              </div>
            </li>
          ))}
          {actividad.reservas.map(({ reserva, clase }) => (
            <li key={`r${reserva.id}`}>
              <div><strong>{clase.nombre}</strong><span>{formatearFechaHora(clase.inicio)}</span><StatusBadge tone="success">Reservada</StatusBadge></div>
              <AppButton size="sm" variant="secondary" disabled={ocupada} onClick={() => cancelarReserva(clase, reserva)}>Cancelar reserva</AppButton>
            </li>
          ))}
          {espera.map(({ entrada, clase }) => (
            <li key={`e${entrada.id}`}>
              <div><strong>{clase.nombre}</strong><span>{formatearFechaHora(clase.inicio)}</span><StatusBadge tone="info">En espera, posición {entrada.posicion}</StatusBadge></div>
              <AppButton size="sm" variant="secondary" disabled={ocupada} onClick={() => salirDeLaEspera(clase)}>Salir de la lista</AppButton>
            </li>
          ))}
        </ul>
      )}
    </DataCard>
  );
}

export default function ReservasClases() {
  const [refresco, setRefresco] = useState(0);
  const actualizar = () => setRefresco((valor) => valor + 1);
  const actividad = useActividadClases(true, refresco);
  const gestion = useGestionReservasClase(actualizar);

  return (
    <div className="agenda-clases">
      {!gestion.modal && <AvisoReservaClase aviso={gestion.aviso} />}
      <ActividadClasesPanel actividad={actividad} gestion={gestion} actualizar={actualizar} personal />
      <DialogoReservaClase gestion={gestion} enReservas />
    </div>
  );
}
