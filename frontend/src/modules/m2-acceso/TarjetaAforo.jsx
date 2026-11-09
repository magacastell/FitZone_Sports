import { Clock3, RefreshCw, Users } from 'lucide-react';
import { AppButton } from '../../components/ui/FitZoneUI';

export default function TarjetaAforo({ aforo, refrescar, sedeNombre }) {
  const datos = aforo.datos;
  const porcentaje = datos?.capacidadMaxima > 0 ? Math.round(datos.ocupacionActual / datos.capacidadMaxima * 100) : null;
  return <section className="occupancy-card" aria-label={`Aforo actual de ${sedeNombre}`} aria-busy={!!aforo.actualizando}>
    <div className="occupancy-card__header"><span className="occupancy-card__icon"><Users aria-hidden="true" /></span><span className="occupancy-card__live">{aforo.estado === 'error' ? 'SIN ACTUALIZAR' : aforo.actualizando ? 'ACTUALIZANDO' : 'ACTUALIZACIÓN CADA 15 S'}</span></div>
    <h3 className="occupancy-card__eyebrow">Aforo actual</h3>
    {datos ? <>
      <div className="occupancy-count"><strong>{datos.ocupacionActual}</strong><span>/ {datos.capacidadMaxima}</span></div>
      <p className="occupancy-card__caption">personas dentro de {sedeNombre}</p>
      {porcentaje != null && <><div className="occupancy-meter" role="progressbar" aria-label="Ocupación de la sede" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.min(100, Math.max(0, porcentaje))} aria-valuetext={`${porcentaje}% de capacidad`}><span style={{ width: `${Math.min(100, Math.max(0, porcentaje))}%` }} /></div><div className="occupancy-card__summary"><strong>{porcentaje}% de capacidad</strong><span>{datos.ocupacionActual >= datos.capacidadMaxima ? 'Capacidad alcanzada' : 'Ocupación actual'}</span></div></>}
    </> : aforo.estado !== 'error' && <p role="status">Consultando aforo...</p>}
    {aforo.estado === 'error' && <p className="occupancy-error" role="alert">No pudimos actualizar el aforo.{datos && ' Se muestra el último dato disponible.'}</p>}
    <div className="occupancy-card__footer">{datos?.calculadoEn && <span><Clock3 aria-hidden="true" />Último dato: {new Date(datos.calculadoEn).toLocaleString('es-AR', { timeZone: 'America/Argentina/Buenos_Aires', hour12: false })}</span>}<span>El aforo es informativo; no bloquea movimientos.</span><AppButton variant="secondary" size="sm" disabled={!!aforo.actualizando} onClick={refrescar}><RefreshCw aria-hidden="true" />{aforo.estado === 'error' ? 'Reintentar aforo' : 'Actualizar aforo'}</AppButton></div>
  </section>;
}
