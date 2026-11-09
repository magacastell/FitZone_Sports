import { fetchAPI } from './api';
export { listarSedes } from './sedesService';
export { consultarAforo } from './m2Service';

export const listarUsuarios = () => fetchAPI('/usuarios');
export const consultarMembresia = (id) => fetchAPI(`/membresias/${id}`);
export const crearSede = (datos) => fetchAPI('/sedes', { method: 'POST', body: JSON.stringify(datos) });
export const actualizarSede = (id, datos) => fetchAPI(`/sedes/${id}`, { method: 'PATCH', body: JSON.stringify(datos) });
export const consultarReporte = (tipo, filtros) => fetchAPI(`/reportes/${tipo}?${new URLSearchParams(filtros)}`);
