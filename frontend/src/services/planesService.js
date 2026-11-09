import { fetchAPI } from './api';

export function listarPlanes(incluirInactivos = false) {
  return fetchAPI(incluirInactivos ? '/planes?incluirInactivos=true' : '/planes');
}

export function crearPlan(datos) {
  return fetchAPI('/planes', { method: 'POST', body: JSON.stringify(datos) });
}

export function actualizarPlan(id, datos) {
  return fetchAPI(`/planes/${id}`, { method: 'PATCH', body: JSON.stringify(datos) });
}

export function desactivarPlan(id) {
  return fetchAPI(`/planes/${id}`, { method: 'DELETE' });
}
