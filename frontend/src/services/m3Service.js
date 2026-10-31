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
