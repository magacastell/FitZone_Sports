import { fetchAPI } from './api';

export const consultarAforo = (sedeId) => fetchAPI(`/accesos/sedes/${sedeId}/aforo`);
export const movimientosDeSede = (sedeId) => fetchAPI(`/accesos/sedes/${sedeId}/movimientos`);
export const misMovimientos = (inicio, signal) => fetchAPI(
  `/accesos/me/movimientos${inicio ? '?' + new URLSearchParams({ inicio }) : ''}`, { signal },
);
export { listarSedes as listarSedesAcceso } from './sedesService';

export function registrarIngreso(qrToken, sedeId) {
  return fetchAPI('/accesos/ingresos', {
    method: 'POST',
    body: JSON.stringify({ qrToken, ...(sedeId != null && { sedeId }) }),
  });
}

export function registrarSalida(qrToken, accesoId) {
  return fetchAPI('/accesos/salidas', { method: 'POST', body: JSON.stringify(accesoId != null ? { accesoId } : { qrToken }) });
}
