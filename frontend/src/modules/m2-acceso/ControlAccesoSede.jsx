import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { MapPin, ScanLine } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { consultarMiPerfil } from '../../services/m1Service';
import { listarSedesAcceso } from '../../services/m2Service';
import { AppButton, DataCard, PageHeading } from '../../components/ui/FitZoneUI';
import useAforoSede from './useAforoSede';
import LectorAcceso from './LectorAcceso';
import TarjetaAforo from './TarjetaAforo';
import './ControlAccesoSede.css';

export default function ControlAccesoSede() {
  const { user, token, loading } = useAuth();
  if (loading || !user) return <p role="status">Cargando sesión...</p>;
  if (!['RECEPCIONISTA', 'GERENTE'].includes(user.rol)) return <Navigate to="/perfil" replace />;
  return <PuestoAcceso key={token} />;
}

function PuestoAcceso() {
  const { user } = useAuth();
  const esGerente = user.rol === 'GERENTE';
  const [contexto, setContexto] = useState({ estado: 'cargando' });
  const [sedeId, setSedeId] = useState(null);
  const [consulta, setConsulta] = useState(0);
  const { aforo, refrescar } = useAforoSede(sedeId);
  useEffect(() => {
    let activo = true;
    setContexto({ estado: 'cargando' }); setSedeId(null);
    Promise.all([consultarMiPerfil(), esGerente ? listarSedesAcceso() : Promise.resolve([])]).then(
      ([perfil, sedes]) => {
        if (!activo) return;
        const disponibles = esGerente ? sedes : [{ id: perfil.sedeId, nombre: perfil.sedeNombre }];
        setContexto({ estado: 'cargado', sedes: disponibles });
        setSedeId(disponibles[0]?.id ?? null);
      },
      () => { if (activo) setContexto({ estado: 'error' }); },
    );
    return () => { activo = false; };
  }, [esGerente, consulta]);
  const sede = contexto.sedes?.find((item) => item.id === sedeId);
  return <div className="fitzone-ui recepcion"><div className="page-stack">
    <PageHeading eyebrow="OPERACIÓN DE SEDE" title="Control de acceso" description="Validá ingresos y salidas, y consultá el aforo actual de tu sede." actions={sede && <div className="access-site-meta"><MapPin aria-hidden="true" /><span><small>SEDE ACTUAL</small><strong>{sede.nombre}</strong></span></div>} />
    {contexto.estado === 'cargando' && <DataCard title="Preparando el puesto"><p role="status">Consultando tu sede...</p></DataCard>}
    {contexto.estado === 'error' && <DataCard title="No pudimos consultar tu sede"><p role="alert">Reintentá la consulta para preparar el control de acceso.</p><AppButton onClick={() => setConsulta((valor) => valor + 1)}>Reintentar sede</AppButton></DataCard>}
    {contexto.estado === 'cargado' && !sede && <p role="alert">No hay una sede disponible para operar. Consultá con administración.</p>}
    {sede && <>
      <div className="access-toolbar"><span><ScanLine aria-hidden="true" />Puesto de recepción</span>{esGerente && <label className="access-site-select">Sede<select value={sedeId} onChange={(event) => setSedeId(Number(event.target.value))}>{contexto.sedes.map((item) => <option key={item.id} value={item.id}>{item.nombre}</option>)}</select></label>}</div>
      <div className="access-overview-grid"><LectorAcceso key={sedeId} sedeId={sedeId} sedeNombre={sede.nombre} esGerente={esGerente} onMovimiento={() => refrescar(true)} /><TarjetaAforo aforo={aforo} refrescar={() => refrescar(true)} sedeNombre={sede.nombre} /></div>
    </>}
  </div></div>;
}
