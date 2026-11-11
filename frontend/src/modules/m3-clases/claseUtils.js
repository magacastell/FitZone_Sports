export const ZONA = 'America/Argentina/Buenos_Aires';
const HORAS_CIERRE_RESERVAS = 48;

export const formatearFechaHora = (iso) => new Date(iso).toLocaleString('es-AR', {
  timeZone: ZONA, weekday: 'long', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit',
});
export const formatearHora = (iso) => new Date(iso).toLocaleTimeString('es-AR', { timeZone: ZONA, hour: '2-digit', minute: '2-digit' });

// Argentina no tiene horario de verano: un valor de <input type="datetime-local"> se interpreta siempre como UTC-3.
export const aIsoArgentina = (valorLocal) => `${valorLocal}:00-03:00`;
export const aValorLocal = (iso) => new Date(iso).toLocaleString('sv-SE', { timeZone: ZONA }).slice(0, 16).replace(' ', 'T');

// Rango [00:00, 00:00 del día siguiente) de una fecha YYYY-MM-DD, para filtrar la agenda de un día.
export function rangoDelDia(fecha) {
  const siguiente = new Date(`${fecha}T00:00:00Z`);
  siguiente.setUTCDate(siguiente.getUTCDate() + 1);
  return { desde: `${fecha}T00:00:00-03:00`, hasta: `${siguiente.toISOString().slice(0, 10)}T00:00:00-03:00` };
}

// Las reservas y la lista de espera cierran 48 horas antes del inicio (el servidor lo valida igual).
export const inscripcionAbierta = (clase, ahora = Date.now()) => ahora < new Date(clase.inicio).getTime() - HORAS_CIERRE_RESERVAS * 3600000;

// Qué tiene el usuario en una clase, a partir de lo que devuelve GET /clases/me.
export function situacionEnClase(claseId, actividad) {
  return {
    reserva: actividad.reservas.find((r) => r.reserva.claseId === claseId)?.reserva,
    espera: actividad.listaEspera.find((e) => e.entrada.claseId === claseId)?.entrada,
    oferta: actividad.ofertas.find((o) => o.oferta.claseId === claseId)?.oferta,
  };
}

export const ETIQUETA_ESTADO = { PROGRAMADA: 'Programada', CANCELADA: 'Cancelada', FINALIZADA: 'Finalizada' };
export const TONO_ESTADO = { PROGRAMADA: 'info', CANCELADA: 'danger', FINALIZADA: 'neutral' };
