import { cancelarReservaCancha } from '../../services/m4Service';
import { consultarPago } from '../../services/pagosService';

export function formatoFechaHora(valor) {
  if (!valor) return 'Fecha no disponible';

  return new Date(valor).toLocaleString('es-AR', {
    timeZone: 'America/Argentina/Buenos_Aires',
    dateStyle: 'short',
    timeStyle: 'short',
  });
}

export function formatoPrecio(valor) {
  if (valor == null || !Number.isFinite(Number(valor))) {
    return 'No disponible';
  }

  return Number(valor).toLocaleString('es-AR', {
    style: 'currency',
    currency: 'ARS',
  });
}

export function mensajeError(error, operacion) {
  if (error.status === 400) {
    return 'Los datos enviados no son válidos. Revisá la información e intentá nuevamente.';
  }

  if (error.status === 401) {
    return 'Tu sesión venció. Volvé a iniciar sesión.';
  }

  if (error.status === 403) {
    return 'Tu cuenta no tiene autorización para realizar esta operación.';
  }

  if (error.status === 404) {
    return 'El recurso solicitado ya no existe o no está disponible.';
  }

  if (error.status === 409) {
    return operacion === 'reserva'
      ? 'Ese horario acaba de cambiar o fue reservado por otra persona. Actualizamos la disponibilidad.'
      : 'La operación ya no puede realizarse porque cambió el estado de la reserva.';
  }

  return 'No pudimos completar la operación. Revisá tu conexión e intentá nuevamente.';
}

export function claveReserva(email, canchaId, turnoId) {
  return `fitzone:m4:intencion:${email}:${canchaId}:${turnoId}`;
}

export function limpiarClaveReserva(email, reserva) {
  if (!email || !reserva?.canchaId || !reserva?.turnoId) {
    return;
  }

  localStorage.removeItem(
    claveReserva(email, reserva.canchaId, reserva.turnoId),
  );
}

export function estadoReservaTexto(estado) {
  const nombres = {
    PENDIENTE_PAGO: 'Pendiente de pago',
    CONFIRMADA: 'Confirmada',
    RECHAZADA: 'Pago rechazado',
    EXPIRADA: 'Retención vencida',
    CANCELADA: 'Cancelada',
    CUMPLIDA: 'Cumplida',
  };

  return nombres[estado] || estado || 'Estado desconocido';
}

export function tonoReserva(estado) {
  if (['CONFIRMADA', 'CUMPLIDA'].includes(estado)) {
    return 'success';
  }

  if (estado === 'PENDIENTE_PAGO') {
    return 'warning';
  }

  if (['RECHAZADA', 'EXPIRADA'].includes(estado)) {
    return 'danger';
  }

  return 'neutral';
}

export function tiempoRestante(venceEn, ahora) {
  if (!venceEn) return null;

  const segundos = Math.max(
    0,
    Math.floor((Date.parse(venceEn) - ahora) / 1000),
  );

  const minutos = Math.floor(segundos / 60);
  const resto = segundos % 60;

  return `${minutos}:${String(resto).padStart(2, '0')}`;
}

export async function cancelarConDetalle(reserva, usuario) {
  const respuesta = await cancelarReservaCancha(reserva.canchaId, reserva.id);
  if (respuesta?.estado !== 'CANCELADA') throw new Error('No se pudo confirmar la cancelación.');
  limpiarClaveReserva(usuario.email, reserva);

  const mensaje = 'La reserva fue cancelada correctamente.';
  if (reserva.pagoId == null) return mensaje;
  if (usuario.rol === 'RECEPCIONISTA') {
    return `${mensaje} Estado del pago: ${respuesta.estadoPago || 'consultar con Gerencia'}.`;
  }

  try {
    const pago = await consultarPago(reserva.pagoId);
    const devolucion = Number(pago.montoReembolsado || 0);
    return devolucion > 0 ? `${mensaje} Devolución registrada: ${formatoPrecio(devolucion)}.` : mensaje;
  } catch {
    return `${mensaje} Consultá la devolución en Mis pagos.`;
  }
}
