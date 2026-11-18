
import { fetchAPI } from './api';

// ============================================
// CATÁLOGO DE CANCHAS Y TIPOS
// ============================================

export const listarCanchas = (sedeId) =>
  fetchAPI(`/canchas?sedeId=${encodeURIComponent(sedeId)}`);

export const consultarCancha = (id) =>
  fetchAPI(`/canchas/${id}`);

export const listarTiposCancha = () =>
  fetchAPI('/tipos-cancha');

// ============================================
// TURNOS Y DISPONIBILIDAD
// ============================================

export const listarTurnos = (id, desde, hasta) =>
  fetchAPI(`/canchas/${id}/turnos?${new URLSearchParams({ desde, hasta })}`);

export const crearTurno = (id, datos) =>
  fetchAPI(`/canchas/${id}/turnos`, {
    method: 'POST',
    body: JSON.stringify(datos),
  });

// ============================================
// RESERVAS
// ============================================

export const reservarCancha = (id, datos, clave) => {
  if (!clave) {
    throw new Error('Falta la clave de idempotencia de la reserva.');
  }

  return fetchAPI(`/canchas/${id}/reservas`, {
    method: 'POST',
    headers: {
      'Idempotency-Key': clave,
    },
    body: JSON.stringify(datos),
  });
};

export const consultarReserva = (reservaId) =>
  fetchAPI(`/reservas/${reservaId}`);

export const listarMisReservas = (page = 0, size = 20) =>
  fetchAPI(`/reservas/me?${new URLSearchParams({ page, size })}`);

export const listarReservas = (sedeId, page = 0, size = 20) => {
  const parametros = new URLSearchParams({ page, size });

  if (sedeId != null && sedeId !== '') {
    parametros.set('sedeId', sedeId);
  }

  return fetchAPI(`/reservas?${parametros}`);
};

export const cancelarReservaCancha = (id, reservaId, porcentajeReembolso) =>
  fetchAPI(`/canchas/${id}/reservas/${reservaId}`, {
    method: 'DELETE',
    ...(porcentajeReembolso == null
      ? {}
      : { body: JSON.stringify({ porcentajeReembolso }) }),
  });

// ============================================
// ADMINISTRACIÓN DE CANCHAS
// ============================================

export const crearCancha = (datos) =>
  fetchAPI('/canchas', {
    method: 'POST',
    body: JSON.stringify(datos),
  });

export const actualizarCancha = (id, datos) =>
  fetchAPI(`/canchas/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(datos),
  });

export const crearMantenimiento = (id, datos) =>
  fetchAPI(`/canchas/${id}/mantenimientos`, {
    method: 'POST',
    body: JSON.stringify(datos),
  });

export const listarMantenimientos = (id) =>
  fetchAPI(`/canchas/${id}/mantenimientos`);

export const eliminarMantenimiento = (id, mantenimientoId) =>
  fetchAPI(`/canchas/${id}/mantenimientos/${mantenimientoId}`, {
    method: 'DELETE',
  });

// ============================================
// ADMINISTRACIÓN DE TARIFAS
// ============================================

export const crearTipoCancha = (datos) =>
  fetchAPI('/tipos-cancha', {
    method: 'POST',
    body: JSON.stringify(datos),
  });

export const actualizarTipoCancha = (id, datos) =>
  fetchAPI(`/tipos-cancha/${id}`, {
    method: 'PUT',
    body: JSON.stringify(datos),
  });

export const actualizarRecargoPico = (sedeId, recargoPico) =>
  fetchAPI(`/sedes/${sedeId}/recargo-pico`, {
    method: 'PUT',
    body: JSON.stringify({ recargoPico }),
  });
