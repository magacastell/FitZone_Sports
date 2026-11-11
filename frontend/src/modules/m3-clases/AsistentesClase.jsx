import { useEffect, useState } from 'react';
import { Users } from 'lucide-react';
import { AppButton, DataCard, EmptyState, StatusBadge } from '../../components/ui/FitZoneUI';
import { listarAsistentes } from '../../services/m3Service';
import { formatearFechaHora } from './claseUtils';

const ETIQUETA = { CONFIRMADA: 'Confirmada', CANCELADA: 'Cancelada', ASISTIDA: 'Asistió', AUSENTE: 'Ausente' };
const TONO = { CONFIRMADA: 'success', CANCELADA: 'neutral', ASISTIDA: 'success', AUSENTE: 'danger' };
const TIPO_CANCELACION = { A_TIEMPO: 'a tiempo', TARDIA: 'tardía' };

export default function AsistentesClase({ clase, refresco, onCerrar }) {
  const [estado, setEstado] = useState({ estado: 'cargando' });

  useEffect(() => {
    let activo = true;
    setEstado({ estado: 'cargando' });
    listarAsistentes(clase.id).then(
      (datos) => { if (activo) setEstado({ estado: 'cargado', items: datos.items, total: datos.totalElements }); },
      (error) => { if (activo) setEstado({ estado: 'error', mensaje: error.message }); },
    );
    return () => { activo = false; };
  }, [clase.id, refresco]);

  return (
    <DataCard title={`Asistentes: ${clase.nombre}`} description={formatearFechaHora(clase.inicio)}
      action={<AppButton size="sm" variant="secondary" onClick={onCerrar}>Cerrar</AppButton>}>
      {estado.estado === 'cargando' && <p role="status">Consultando asistentes...</p>}
      {estado.estado === 'error' && <p role="alert">{estado.mensaje}</p>}
      {estado.estado === 'cargado' && (estado.items.length === 0
        ? <EmptyState icon={Users} title="Sin reservas" description="Todavía nadie reservó esta clase." />
        : <>
          <ul className="asistentes-lista">
            {estado.items.map((r) => (
              <li key={r.id}>
                <span>{r.titular ? `${r.titular.nombre} ${r.titular.apellido}` : `Usuario ${r.usuarioId}`}</span>
                <StatusBadge tone={TONO[r.estado]}>{ETIQUETA[r.estado]}{r.estado === 'CANCELADA' && TIPO_CANCELACION[r.tipoCancelacion] ? ` ${TIPO_CANCELACION[r.tipoCancelacion]}` : ''}</StatusBadge>
              </li>
            ))}
          </ul>
          {estado.total > estado.items.length && <p className="agenda-nota">Se muestran {estado.items.length} de {estado.total} reservas.</p>}
        </>)}
    </DataCard>
  );
}
