import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { consultarMiPerfil } from '../../services/m1Service';
import { AppButton, PageHeading } from '../../components/ui/FitZoneUI';
import useAforoSede from './useAforoSede';
import TarjetaAforo from './TarjetaAforo';
import './ControlAccesoSede.css';

export default function AforoSede() {
  const { user, token } = useAuth();
  if (!user) return <p role="status">Cargando sesión...</p>;
  if (user.rol !== 'RECEPCIONISTA') return <Navigate to="/perfil" replace />;
  return <AforoLocal key={token} />;
}

function AforoLocal() {
  const [perfil, setPerfil] = useState(null);
  const [error, setError] = useState(false);
  const [consulta, setConsulta] = useState(0);
  const { aforo, refrescar } = useAforoSede(perfil?.sedeId);
  useEffect(() => {
    let activo = true;
    setError(false);
    consultarMiPerfil().then((p) => { if (activo) setPerfil(p); }, () => { if (activo) setError(true); });
    return () => { activo = false; };
  }, [consulta]);
  return <div className="fitzone-ui recepcion"><div className="page-stack">
    <PageHeading eyebrow="ADMIN DE SEDE" title="Aforo" description="Ocupación actual de tu sede operativa. Información en tiempo real, sin historial ficticio." />
    {error ? <><p role="alert">No pudimos consultar tu sede.</p><AppButton onClick={() => setConsulta((v) => v + 1)}>Reintentar sede</AppButton></>
      : !perfil ? <p role="status">Consultando tu sede...</p> : perfil.sedeId ? <TarjetaAforo aforo={aforo} refrescar={() => refrescar(true)} sedeNombre={perfil.sedeNombre} /> : <p role="alert">Tu cuenta no tiene una sede operativa asignada.</p>}
  </div></div>;
}
