import { useCallback, useEffect, useRef, useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { CalendarDays, ChartColumn, DoorOpen, Dumbbell, LayoutGrid, LogOut, QrCode, ReceiptText, UserRound, Wrench } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { consultarMiMembresia } from '../services/m1Service';
import './Layout.css';

function NavigationLink({ to, icon: Icon, children, module }) {
  return (
    <li>
      <NavLink to={to} end className={({ isActive }) => `app-nav__link${isActive ? ' app-nav__link--active' : ''}`}>
        <Icon className="app-icon" size={20} strokeWidth={1.75} aria-hidden="true" />
        <span className="app-nav__label">{children}</span>
        {module && <span className="app-nav__module">{module}</span>}
      </NavLink>
    </li>
  );
}

// Rol del JWT (nombre en backend) -> clave de vista que usa el menú
const VISTA_POR_ROL = {
  SOCIO_ACTIVO: 'SOCIO',
  CLIENTE_EXTERNO: 'EXTERNO',
  RECEPCIONISTA: 'RECEPCION',
  GERENTE: 'GERENTE',
};

export default function Layout() {
  const { token } = useAuth();
  return <LayoutAutenticado key={token} />;
}

function LayoutAutenticado() {
  const { user, logout, isAuthenticated } = useAuth();
  const [membresia, setMembresia] = useState({ estado: 'cargando' });
  const ultimaMembresia = useRef(membresia);
  const consulta = useRef(null);
  const revision = useRef(0);
  const montado = useRef(false);

  const actualizarMembresia = useCallback((estado) => {
    if (!montado.current) return;
    revision.current++;
    consulta.current = null;
    ultimaMembresia.current = estado;
    setMembresia(estado);
  }, []);

  const refrescarMembresia = useCallback(() => {
    if (consulta.current) return consulta.current;
    if (ultimaMembresia.current.estado === 'error') {
      ultimaMembresia.current = { estado: 'cargando' };
      if (montado.current) setMembresia(ultimaMembresia.current);
    }
    const version = revision.current;
    const tarea = consultarMiMembresia().then(
      (datos) => ({ estado: 'cargada', datos }),
      (error) => error.status === 404
        ? { estado: 'sin-membresia' }
        : { estado: 'error', mensaje: error.message, status: error.status },
    ).then((estado) => {
      if (montado.current && version === revision.current) {
        ultimaMembresia.current = estado;
        setMembresia(estado);
      }
      return ultimaMembresia.current;
    }).finally(() => {
      if (consulta.current === tarea) consulta.current = null;
    });
    consulta.current = tarea;
    return tarea;
  }, []);

  useEffect(() => {
    montado.current = true;
    refrescarMembresia();
    const alRecuperarFoco = () => {
      if (document.visibilityState === 'visible') refrescarMembresia();
    };
    window.addEventListener('focus', alRecuperarFoco);
    return () => {
      montado.current = false;
      revision.current++;
      consulta.current = null;
      window.removeEventListener('focus', alRecuperarFoco);
    };
  }, [refrescarMembresia]);

  const puedeAbrirQr = membresia.estado === 'cargada' && membresia.datos.estado === 'ACTIVA';
  // Por defecto se muestra la vista del rol real; el desplegable de desarrollo
  // permite previsualizar otro rol sin cambiar de sesión.
  const [vistaForzada, setVistaForzada] = useState(null);
  const rolActivo = vistaForzada ?? VISTA_POR_ROL[user?.rol] ?? 'SOCIO';
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="app-layout">
      <a className="skip-link" href="#contenido">Ir al contenido</a>

      <aside className="app-sidebar" aria-label="Menú de FitZone Sports">
        <div className="app-sidebar__header">
          <div className="app-brand">
            <Dumbbell size={26} strokeWidth={1.75} aria-hidden="true" />
            <div>
              <p className="app-brand__name">FitZone Sports</p>
              <p className="app-brand__description">Gestión de gimnasio</p>
            </div>
          </div>

          <div className="actor-preview">
            <label htmlFor="vista-desarrollo">Vista de desarrollo</label>
            <select id="vista-desarrollo" value={rolActivo} onChange={(e) => setVistaForzada(e.target.value)}>
              <option value="SOCIO">Socio Activo</option>
              <option value="EXTERNO">Cliente Externo</option>
              <option value="RECEPCION">Recepcionista / Admin Sede</option>
              <option value="GERENTE">Gerente Central</option>
            </select>
          </div>
        </div>

        <nav className="app-nav" aria-label="Navegación principal">
          <div className="app-nav__group">
            <p className="app-nav__heading" id="nav-usuario">Módulos del usuario</p>
            <ul className="app-nav__list" aria-labelledby="nav-usuario">
              <NavigationLink to="/canchas" icon={LayoutGrid} module="M4">Canchas</NavigationLink>
              {rolActivo === 'SOCIO' && (
                <>
                  <NavigationLink to="/clases" icon={CalendarDays} module="M3">Clases grupales</NavigationLink>
                </>
              )}
              {puedeAbrirQr && <NavigationLink to="/mi-qr" icon={QrCode} module="M2">Mi QR</NavigationLink>}
              <NavigationLink to="/perfil" icon={UserRound} module="M1">Perfil y membresía</NavigationLink>
              <NavigationLink to="/comprobantes" icon={ReceiptText} module="M5">Mis comprobantes</NavigationLink>
            </ul>
          </div>

          {(rolActivo === 'RECEPCION' || rolActivo === 'GERENTE') && (
            <div className="app-nav__group">
              <p className="app-nav__heading" id="nav-gestion">Operación y gestión</p>
              <ul className="app-nav__list" aria-labelledby="nav-gestion">
                <NavigationLink to="/recepcion/acceso" icon={DoorOpen} module="M2">Control de acceso y aforo</NavigationLink>
                <NavigationLink to="/admin/canchas/mantenimiento" icon={Wrench} module="M4">Mantenimiento de canchas</NavigationLink>
                {rolActivo === 'GERENTE' && (
                  <NavigationLink to="/admin/reportes-consolidados" icon={ChartColumn}>Reportes consolidados</NavigationLink>
                )}
              </ul>
            </div>
          )}
        </nav>

        {isAuthenticated && (
          <button type="button" className="button button--secondary app-sidebar__logout" onClick={handleLogout}>
            <LogOut size={18} strokeWidth={1.75} aria-hidden="true" />
            Cerrar sesión
          </button>
        )}
      </aside>

      <main id="contenido" className="app-main" tabIndex={-1}>
        <div className="app-content">
          <p className="demo-notice">Vista de demostración: datos simulados. Las reservas, pagos y validaciones todavía no están implementados.</p>
          <Outlet context={{ rolActivo, membresia, actualizarMembresia, refrescarMembresia, puedeAbrirQr }} />
        </div>
      </main>
    </div>
  );
}
