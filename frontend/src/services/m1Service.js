import { fetchAPI } from './api';
export { listarPlanes } from './planesService';
export { listarSedes } from './sedesService';

export function consultarMiPerfil() {
  return fetchAPI('/usuarios/me');
}

export function actualizarMiPerfil({ nombre, apellido }) {
  return fetchAPI('/usuarios/me', {
    method: 'PATCH',
    body: JSON.stringify({ nombre, apellido }),
  });
}

export function actualizarMiFoto(archivo) {
  const cuerpo = new FormData();
  cuerpo.append('foto', archivo);
  return fetchAPI('/usuarios/me/foto', { method: 'PUT', multipart: true, body: cuerpo });
}

export function configurarRenovacionAutomatica(membresiaId, habilitada) {
  return fetchAPI(`/membresias/${membresiaId}/renovacion-automatica`, {
    method: 'PUT',
    body: JSON.stringify({ habilitada }),
  });
}

export function consultarMiMembresia() {
  return fetchAPI('/membresias/me');
}

export function contratarMembresia(planId, idempotencyKey, sedeId) {
  return fetchAPI('/membresias', {
    method: 'POST',
    headers: { 'Idempotency-Key': idempotencyKey },
    body: JSON.stringify({ planId, sedeId }),
  });
}

export function renovarMembresia(membresiaId, planId, idempotencyKey) {
  return fetchAPI(`/membresias/${membresiaId}/renovaciones`, {
    method: 'POST',
    headers: { 'Idempotency-Key': idempotencyKey },
    body: JSON.stringify(planId == null ? {} : { planId }),
  });
}
