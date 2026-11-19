import { useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { CalendarDays, LayoutGrid } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { AppLink, PageHeading } from '../../components/ui/FitZoneUI';
import ReservasClases from '../m3-clases/ReservasClases';
import ReservasCanchas from '../m4-canchas/ReservasCanchas';
import './MisReservas.css';

export default function MisReservas() {
  const { user, token } = useAuth();
  return user?.rol === 'USUARIO' ? <MisReservasContenido key={token} /> : <Navigate to="/perfil" replace />;
}

function MisReservasContenido() {
  const { hash, key } = useLocation();

  useEffect(() => {
    if (hash === '#canchas' || hash === '#clases') {
      document.getElementById(hash.slice(1))?.focus();
    }
  }, [hash, key]);

  return (
    <div className="fitzone-ui mis-reservas-page">
      <div className="page-stack">
        <PageHeading eyebrow="MI ESPACIO" title="Mis reservas" description="Revisá tus turnos de cancha y tus reservas de clases." />
        <nav className="mis-reservas-page__accesos" aria-label="Secciones de Mis reservas">
          <AppLink to="#canchas"><LayoutGrid aria-hidden="true" />Canchas</AppLink>
          <AppLink to="#clases"><CalendarDays aria-hidden="true" />Clases</AppLink>
        </nav>
        <div className="mis-reservas-page__secciones">
          <section id="canchas" aria-label="Reservas de canchas" tabIndex={-1}><ReservasCanchas /></section>
          <section id="clases" aria-label="Reservas de clases" tabIndex={-1}><ReservasClases /></section>
        </div>
      </div>
    </div>
  );
}
