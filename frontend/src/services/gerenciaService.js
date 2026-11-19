import { fetchAPI } from './api';
export { listarSedes } from './sedesService';
export { consultarAforo } from './m2Service';

export const listarUsuarios = () => fetchAPI('/usuarios');
export const consultarMembresia = (id) => fetchAPI(`/membresias/${id}`);
// Desde el usuario: no hace falta conocer el ID de membresía.
export const consultarMembresiaDeUsuario = (usuarioId) => fetchAPI(`/membresias/usuarios/${usuarioId}`);
export const crearSede = (datos) => fetchAPI('/sedes', { method: 'POST', body: JSON.stringify(datos) });
export const actualizarSede = (id, datos) => fetchAPI(`/sedes/${id}`, { method: 'PATCH', body: JSON.stringify(datos) });
export const consultarReporte = (tipo, filtros) => fetchAPI(`/reportes/${tipo}?${new URLSearchParams(filtros)}`);

// Reportes consolidados (solo Gerente). Período [desde, hasta) con offset; sedeId opcional.
export const consultarReporteAccesos = (filtros) => consultarReporte('ocupacion', filtros);
export const consultarReporteFinanciero = (filtros) => consultarReporte('ingresos', filtros);

// Tarifas de cancha (solo Gerente define): precio por hora por tipo y recargo del horario pico por sede.
export const listarTiposCancha = () => fetchAPI('/tipos-cancha');
export const crearTipoCancha = (datos) => fetchAPI('/tipos-cancha', { method: 'POST', body: JSON.stringify(datos) });
export const actualizarTipoCancha = (id, datos) => fetchAPI(`/tipos-cancha/${id}`, { method: 'PUT', body: JSON.stringify(datos) });
export const actualizarRecargoPico = (sedeId, recargoPico) => fetchAPI(`/sedes/${sedeId}/recargo-pico`, { method: 'PUT', body: JSON.stringify({ recargoPico }) });
export const consultarRecargoPico = (sedeId) => fetchAPI(`/sedes/${sedeId}/recargo-pico`);
