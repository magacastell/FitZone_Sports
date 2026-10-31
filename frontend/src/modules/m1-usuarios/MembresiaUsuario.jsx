import { useEffect, useState } from 'react';
import { Navigate, useOutletContext } from 'react-router-dom';
import { QrCode } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { consultarMiPerfil } from '../../services/m1Service';
import { AppLink, PageHeading, StatusBadge } from '../../components/ui/FitZoneUI';
import RenovacionMembresia from './RenovacionMembresia';
import ContratacionMembresia from './ContratacionMembresia';
import { ResumenMembresia, DatosPersonales, AccesoRapido, ResumenComprobantes } from './PortalSocioCards';
import './PortalSocio.css';

export default function MembresiaUsuario() {
  const { user } = useAuth();
  if (!user) return <p role="status">Cargando sesión...</p>;
  if (user.rol !== 'USUARIO') return <Navigate to="/perfil" replace />;
  return <MembresiaContenido />;
}

function MembresiaContenido() {
  const { user } = useAuth();
  const [perfil, setPerfil] = useState({ estado: 'cargando' });
  const [consultaPerfil, setConsultaPerfil] = useState(0);
  const { membresia, actualizarMembresia, puedeAbrirQr } = useOutletContext();
  useEffect(() => {
    let activo = true;
    setPerfil({ estado: 'cargando' });
    consultarMiPerfil().then(
      (datos) => { if (activo) setPerfil({ estado: 'cargado', datos }); },
      (error) => { if (activo) setPerfil({ estado: 'error', mensaje: error.message }); },
    );
    return () => { activo = false; };
  }, [consultaPerfil]);
  const sinMembresia = membresia.estado === 'sin-membresia';
  const estado = membresia.estado === 'cargada' ? membresia.datos.estado : null;
  return <div className={`fitzone-ui${sinMembresia ? ' portal-cliente' : ''}`}><div className="page-stack">
    <PageHeading eyebrow={sinMembresia ? 'EMPEZÁ EN FITZONE' : 'MI CUENTA'} title={sinMembresia ? 'Elegí tu plan' : estado === 'VENCIDA' ? 'Membresía vencida' : estado === 'SUSPENDIDA' ? 'Membresía suspendida' : 'Mi membresía'}
      description={sinMembresia ? 'Compará duración y precio antes de iniciar tu membresía.' : 'Tu plan, vigencia y datos personales desde un mismo lugar.'}
      actions={sinMembresia ? <StatusBadge tone="neutral">Sin membresía</StatusBadge> : puedeAbrirQr && <AppLink to="/mi-qr"><QrCode aria-hidden="true" />Mostrar mi QR</AppLink>} />
    {membresia.estado === 'cargando' && <p role="status">Consultando tu cuenta...</p>}
    <ContratacionMembresia perfil={perfil} onContratada={() => setConsultaPerfil((valor) => valor + 1)} />
    {membresia.estado === 'cargada' && <>
      <div className={`membership-layout${puedeAbrirQr ? '' : ' membership-layout--sin-acceso'}`}><div className="portal-membership-column">
        <ResumenMembresia membresia={membresia} puedeAbrirQr={puedeAbrirQr} perfil={perfil}>
          {perfil.estado === 'cargado' && (perfil.datos.id === membresia.datos.usuarioId
            ? <RenovacionMembresia key={`${perfil.datos.id}:${membresia.datos.id}`} perfil={perfil.datos} membresia={membresia.datos} onRenovada={(datos) => actualizarMembresia({ estado: 'cargada', datos })} />
            : <p role="alert">El perfil y la membresía no corresponden a la misma cuenta.</p>)}
        </ResumenMembresia>
      </div>{puedeAbrirQr && <AccesoRapido puedeAbrirQr={puedeAbrirQr} membresia={membresia} />}</div>
      <div className="member-details-grid"><DatosPersonales perfil={perfil} rol={user.rol} membresia={membresia} /><ResumenComprobantes membresia={membresia} /></div>
    </>}
  </div></div>;
}
