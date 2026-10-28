import { fetchAPI } from './api';

export function consultarMiPerfil() {
  return fetchAPI('/usuarios/me');
}

export function consultarMiMembresia() {
  return fetchAPI('/membresias/me');
}

export function listarPlanes() {
  return fetchAPI('/planes');
}

export function contratarMembresia(planId, idempotencyKey) {
  return fetchAPI('/membresias', {
    method: 'POST',
    headers: { 'Idempotency-Key': idempotencyKey },
    body: JSON.stringify({ planId }),
  });
}

export function renovarMembresia(membresiaId, planId, idempotencyKey) {
  return fetchAPI(`/membresias/${membresiaId}/renovaciones`, {
    method: 'POST',
    headers: { 'Idempotency-Key': idempotencyKey },
    body: JSON.stringify(planId == null ? {} : { planId }),
  });
}
