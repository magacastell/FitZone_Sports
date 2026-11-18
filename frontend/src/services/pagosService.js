
import { fetchAPI } from './api';

// ============================================
// COBROS DE RESERVAS DE CANCHAS
// ============================================

export const pagarReservaCancha = (reservaId) =>
  fetchAPI('/pagos', {
    method: 'POST',
    body: JSON.stringify({
      concepto: 'RESERVA_CANCHA',
      recursoId: reservaId,
    }),
  });

// ============================================
// CONSULTAS DE PAGOS
// ============================================

export const listarMisPagos = (page = 0, size = 20) =>
  fetchAPI(`/pagos/me?${new URLSearchParams({ page, size })}`);

export const consultarPago = (pagoId) =>
  fetchAPI(`/pagos/${pagoId}`);

export const listarPagos = (sedeId, page = 0, size = 20) => {
  const parametros = new URLSearchParams({ page, size });

  if (sedeId != null && sedeId !== '') {
    parametros.set('sedeId', sedeId);
  }

  return fetchAPI(`/pagos?${parametros}`);
};

// ============================================
// DEVOLUCIONES
// ============================================

export const solicitarReembolso = (pagoId) =>
  fetchAPI(`/pagos/${pagoId}/reembolsos`, {
    method: 'POST',
  });

// ============================================
// COMPROBANTES PDF
// ============================================

export function descargarComprobante(pagoId) {
  return fetchAPI(`/pagos/${pagoId}/comprobante`, {
    responseType: 'blob',
    headers: {
      Accept: 'application/pdf',
    },
  });
}
