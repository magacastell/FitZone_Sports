import { fetchAPI } from './api';

export const consultarAforo = (sedeId) => fetchAPI(`/accesos/sedes/${sedeId}/aforo`);
export const listarSedesAcceso = () => fetchAPI('/sedes');

export function registrarIngreso(qrToken, sedeId) {
  return fetchAPI('/accesos/ingresos', {
    method: 'POST',
    body: JSON.stringify({ qrToken, ...(sedeId != null && { sedeId }) }),
  });
}

export function registrarSalida(qrToken) {
  return fetchAPI('/accesos/salidas', { method: 'POST', body: JSON.stringify({ qrToken }) });
}
