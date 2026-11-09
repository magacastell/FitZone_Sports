import { fetchAPI } from './api';

export function descargarComprobante(pagoId) {
  return fetchAPI(`/pagos/${pagoId}/comprobante`, { responseType: 'blob', headers: { Accept: 'application/pdf' } });
}
