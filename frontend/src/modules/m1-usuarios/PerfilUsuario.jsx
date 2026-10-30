import { useOutletContext } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { consultarMiPerfil } from '../../services/m1Service';
import { DatosPersonales } from './PortalSocioCards';
import { AppLink, PageHeading } from '../../components/ui/FitZoneUI';
import './PortalSocio.css';

export default function PerfilUsuario() {
  const { user } = useAuth();
  const { membresia } = useOutletContext();
  const [perfil, setPerfil] = useState({ estado: 'cargando' });
  useEffect(() => {
    let activo = true;
    consultarMiPerfil().then(
      (datos) => { if (activo) setPerfil({ estado: 'cargado', datos }); },
      (error) => { if (activo) setPerfil({ estado: 'error', mensaje: error.message }); },
    );
    return () => { activo = false; };
  }, []);
  const esCliente = user?.rol === 'USUARIO';
  return (
    <div className="fitzone-ui portal-perfil">
      <PageHeading eyebrow="MI CUENTA" title="Perfil" description="Tu identidad y los datos de tu cuenta FitZone." />
      <DatosPersonales perfil={perfil} mostrarEnlace={false} rol={user?.rol} membresia={membresia} />
      {esCliente && <AppLink variant="primary" to="/membresia">Ir a mi membresía</AppLink>}
    </div>
  );
}
