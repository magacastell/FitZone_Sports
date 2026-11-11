import { useState } from 'react';
import { CalendarDays, Users } from 'lucide-react';
import { AppButton, StatusBadge } from '../../components/ui/FitZoneUI';
import { ETIQUETA_ESTADO, TONO_ESTADO, formatearFechaHora, formatearHora, inscripcionAbierta } from './claseUtils';

export default function TarjetaClase({
  clase, situacion, puedeReservar, esStaff, ocupada,
  onReservar, onCancelarReserva, onAnotarse, onSalirEspera, onResponder, onCancelarClase, onEditar, onVerAsistentes,
}) {
  const [cancelando, setCancelando] = useState(false);
  const [motivo, setMotivo] = useState('');
  const programada = clase.estado === 'PROGRAMADA';
  const { reserva, espera, oferta } = situacion;

  const confirmarCancelacionDeClase = (e) => {
    e.preventDefault();
    onCancelarClase(clase, motivo.trim());
    setCancelando(false);
    setMotivo('');
  };

  return (
    <article className="clase-card" aria-label={`${clase.nombre}, ${formatearFechaHora(clase.inicio)}`}>
      <header className="clase-card__cabecera">
        <h3>{clase.nombre}</h3>
        <StatusBadge tone={TONO_ESTADO[clase.estado]}>{ETIQUETA_ESTADO[clase.estado]}</StatusBadge>
      </header>
      <p className="clase-card__dato"><CalendarDays aria-hidden="true" />{formatearFechaHora(clase.inicio)} a {formatearHora(clase.fin)}</p>
      <p className="clase-card__dato"><Users aria-hidden="true" />{programada ? `${clase.lugaresDisponibles} de ${clase.cupo} lugares disponibles` : `Cupo: ${clase.cupo}`}</p>
      <p className="clase-card__instructor">Instructor: {clase.instructorNombre ?? 'No informado'}</p>

      {programada && (reserva || espera || oferta) && (
        <p className="clase-card__situacion" role="status">
          {reserva && <StatusBadge tone="success">Tenés un lugar reservado</StatusBadge>}
          {oferta && <StatusBadge tone="warning">Se liberó un lugar para vos</StatusBadge>}
          {espera && !oferta && <StatusBadge tone="info">En lista de espera, posición {espera.posicion}</StatusBadge>}
        </p>
      )}

      {programada && puedeReservar && (
        <div className="clase-card__acciones">
          {reserva && <>
            <AppButton size="sm" variant="secondary" disabled={ocupada} onClick={() => onCancelarReserva(clase, reserva)}>Cancelar mi reserva</AppButton>
            <small>Cancelando con menos de 2 horas de anticipación queda como cancelación tardía.</small>
          </>}
          {oferta && <>
            <p>Tenés tiempo hasta el {formatearFechaHora(oferta.venceEn)} para aceptarlo.</p>
            <AppButton size="sm" disabled={ocupada} onClick={() => onResponder(clase, oferta, 'ACEPTAR')}>Aceptar el lugar</AppButton>
            <AppButton size="sm" variant="secondary" disabled={ocupada} onClick={() => onResponder(clase, oferta, 'RECHAZAR')}>Rechazar</AppButton>
          </>}
          {!reserva && !oferta && espera && (
            <AppButton size="sm" variant="secondary" disabled={ocupada} onClick={() => onSalirEspera(clase)}>Salir de la lista de espera</AppButton>
          )}
          {!reserva && !oferta && !espera && !inscripcionAbierta(clase) && <small>Las reservas y la lista de espera cerraron 48 horas antes del inicio.</small>}
          {!reserva && !oferta && !espera && inscripcionAbierta(clase) && (clase.lugaresDisponibles > 0
            ? <AppButton size="sm" disabled={ocupada} onClick={() => onReservar(clase)}>Reservar</AppButton>
            : <AppButton size="sm" variant="secondary" disabled={ocupada} onClick={() => onAnotarse(clase)}>Anotarme en la lista de espera</AppButton>)}
        </div>
      )}

      {esStaff && (
        <div className="clase-card__acciones clase-card__acciones--gestion">
          <AppButton size="sm" variant="secondary" onClick={() => onVerAsistentes(clase)}>Ver asistentes</AppButton>
          {programada && <AppButton size="sm" variant="secondary" disabled={ocupada} onClick={() => onEditar(clase)}>Editar</AppButton>}
          {programada && !cancelando && <AppButton size="sm" variant="danger" disabled={ocupada} onClick={() => setCancelando(true)}>Cancelar clase</AppButton>}
          {cancelando && (
            <form className="clase-card__cancelacion" onSubmit={confirmarCancelacionDeClase}>
              <label>Motivo de la cancelación
                <input value={motivo} onChange={(e) => setMotivo(e.target.value)} maxLength={255} required autoFocus />
              </label>
              <small>Se cancelan las reservas y se cierra la lista de espera. Nadie recibe una falta.</small>
              <div>
                <AppButton size="sm" variant="danger" type="submit" disabled={ocupada || !motivo.trim()}>Confirmar cancelación</AppButton>
                <AppButton size="sm" variant="secondary" type="button" onClick={() => setCancelando(false)}>Volver</AppButton>
              </div>
            </form>
          )}
        </div>
      )}
    </article>
  );
}
