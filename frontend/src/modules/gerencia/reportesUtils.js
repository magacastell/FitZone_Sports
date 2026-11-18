// Utilidades de fechas y formato de los reportes de Gerencia. Todo se interpreta en hora argentina.
export const ZONA = 'America/Argentina/Buenos_Aires';
const OFFSET = '-03:00';
export const MAX_DIAS = 366;

const pesos = new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 2 });
const enteros = new Intl.NumberFormat('es-AR');
const decimal = new Intl.NumberFormat('es-AR', { minimumFractionDigits: 1, maximumFractionDigits: 1 });

export const formatearPesos = (valor) => pesos.format(valor ?? 0);
export const formatearEntero = (valor) => enteros.format(valor ?? 0);
export const formatearPorcentaje = (valor) => `${decimal.format(valor ?? 0)} %`;
export const formatearMinutos = (minutos) => {
  if (minutos === null || minutos === undefined) return 'Sin datos';
  const total = Math.round(minutos);
  return total < 60 ? `${total} min` : `${Math.floor(total / 60)} h ${String(total % 60).padStart(2, '0')} min`;
};

/** Fecha de hoy (AAAA-MM-DD) en Argentina. */
export const hoyArgentina = () => new Date().toLocaleDateString('sv-SE', { timeZone: ZONA });

/** Suma días a una fecha AAAA-MM-DD sin depender de la zona del navegador. */
export const sumarDias = (iso, dias) => {
  const [a, m, d] = iso.split('-').map(Number);
  return new Date(Date.UTC(a, m - 1, d + dias)).toISOString().slice(0, 10);
};

export const diasEntre = (desde, hasta) => {
  const [a1, m1, d1] = desde.split('-').map(Number);
  const [a2, m2, d2] = hasta.split('-').map(Number);
  return Math.round((Date.UTC(a2, m2 - 1, d2) - Date.UTC(a1, m1 - 1, d1)) / 86400000);
};

/** "17/11/2026" a partir de AAAA-MM-DD, sin pasar por Date para no correr el día por zona horaria. */
export const fechaLegible = (iso) => iso.split('-').reverse().join('/');
export const fechaCorta = (iso) => iso.split('-').reverse().slice(0, 2).join('/');

export const fechaHoraLegible = (instante) => new Date(instante).toLocaleString('es-AR', { timeZone: ZONA });

/**
 * El usuario elige un rango inclusivo (desde el día X hasta el día Y). El servidor trabaja con [desde, hasta):
 * se envía la medianoche argentina de X y la medianoche del día siguiente a Y.
 */
export const parametrosDeRango = ({ desde, hasta, sedeId }) => ({
  desde: `${desde}T00:00:00${OFFSET}`,
  hasta: `${sumarDias(hasta, 1)}T00:00:00${OFFSET}`,
  ...(sedeId && { sedeId }),
});

export const validarRango = ({ desde, hasta }) => {
  if (!desde || !hasta) return 'Indicá la fecha de inicio y la de fin.';
  if (desde > hasta) return 'La fecha de inicio no puede ser posterior a la de fin.';
  if (diasEntre(desde, hasta) + 1 > MAX_DIAS) return `El período no puede superar los ${MAX_DIAS} días.`;
  return '';
};

export const PERIODOS_RAPIDOS = [
  { id: '7', etiqueta: 'Últimos 7 días', rango: (hoy) => ({ desde: sumarDias(hoy, -6), hasta: hoy }) },
  { id: '30', etiqueta: 'Últimos 30 días', rango: (hoy) => ({ desde: sumarDias(hoy, -29), hasta: hoy }) },
  { id: 'mes', etiqueta: 'Este mes', rango: (hoy) => ({ desde: `${hoy.slice(0, 8)}01`, hasta: hoy }) },
];

export const mensajeDeError = (error) => {
  if (error?.status === 403) return 'No tenés autorización para consultar reportes.';
  if (error?.status === 401) return 'Tu sesión venció. Volvé a iniciar sesión.';
  if (error?.status === 404) return 'La sede elegida no existe.';
  if (error?.status === 400) return error.message || 'Revisá el período elegido.';
  return 'No pudimos obtener el reporte. Revisá tu conexión y reintentá.';
};
