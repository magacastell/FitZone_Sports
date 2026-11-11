import { fetchAPI } from './api';

// Rutas existentes; las representaciones funcionales siguen siendo draft en OpenAPI.
export const listarClases = (sedeId) => fetchAPI(`/clases?sedeId=${encodeURIComponent(sedeId)}&page=0&size=20`);
export const crearClase = (datos) => fetchAPI('/clases', { method: 'POST', body: JSON.stringify(datos) });
export const actualizarClase = (id, datos) => fetchAPI(`/clases/${id}`, { method: 'PATCH', body: JSON.stringify(datos) });
export const cancelarClase = (id, motivo) => fetchAPI(`/clases/${id}/cancelacion`, { method: 'POST', body: JSON.stringify({ motivo }) });
export const reservarClase = (id) => fetchAPI(`/clases/${id}/reservas`, { method: 'POST' });
export const cancelarReservaClase = (id, reservaId) => fetchAPI(`/clases/${id}/reservas/${reservaId}`, { method: 'DELETE' });
export const listarAsistentes = (id) => fetchAPI(`/clases/${id}/reservas`);
export const entrarEnEspera = (id) => fetchAPI(`/clases/${id}/lista-espera`, { method: 'POST' });
export const salirDeEspera = (id) => fetchAPI(`/clases/${id}/lista-espera/me`, { method: 'DELETE' });

// Agenda con filtros (sedeId, desde y hasta en ISO con zona) y paginación. El servidor ordena por inicio.
export const listarAgenda = ({ sedeId, desde, hasta, page = 0, size = 12 } = {}) => {
  const params = new URLSearchParams({ page, size });
  if (sedeId) params.set('sedeId', sedeId);
  if (desde) params.set('desde', desde);
  if (hasta) params.set('hasta', hasta);
  return fetchAPI(`/clases?${params}`);
};
// Reservas vigentes, lista de espera y ofertas de lugar del usuario autenticado.
export const consultarMiActividadClases = () => fetchAPI('/clases/me');
export const responderOferta = (claseId, ofertaId, respuesta) => fetchAPI(`/clases/${claseId}/ofertas/${ofertaId}/respuesta`, { method: 'POST', body: JSON.stringify({ respuesta }) });
export const listarInstructores = () => fetchAPI('/instructores');
export const crearInstructor = (datos) => fetchAPI('/instructores', { method: 'POST', body: JSON.stringify(datos) });
export const listarTiposClase = () => fetchAPI('/tipos-clase');
export const crearTipoClase = (datos) => fetchAPI('/tipos-clase', { method: 'POST', body: JSON.stringify(datos) });
