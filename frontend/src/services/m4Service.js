import { fetchAPI } from './api';

// No calcula precios ni inventa disponibilidad. DTOs objetivo todavía draft.
export const listarCanchas = (sedeId) => fetchAPI(`/canchas?sedeId=${encodeURIComponent(sedeId)}`);
export const listarTurnos = (id, desde, hasta) => fetchAPI(`/canchas/${id}/turnos?${new URLSearchParams({ desde, hasta })}`);
export const crearCancha = (datos) => fetchAPI('/canchas', { method: 'POST', body: JSON.stringify(datos) });
export const actualizarCancha = (id, datos) => fetchAPI(`/canchas/${id}`, { method: 'PATCH', body: JSON.stringify(datos) });
export const crearTurno = (id, datos) => fetchAPI(`/canchas/${id}/turnos`, { method: 'POST', body: JSON.stringify(datos) });
export const reservarCancha = (id, datos) => fetchAPI(`/canchas/${id}/reservas`, { method: 'POST', body: JSON.stringify(datos) });
export const cancelarReservaCancha = (id, reservaId) => fetchAPI(`/canchas/${id}/reservas/${reservaId}`, { method: 'DELETE' });
export const crearMantenimiento = (id, datos) => fetchAPI(`/canchas/${id}/mantenimientos`, { method: 'POST', body: JSON.stringify(datos) });
export const eliminarMantenimiento = (id, mantenimientoId) => fetchAPI(`/canchas/${id}/mantenimientos/${mantenimientoId}`, { method: 'DELETE' });
