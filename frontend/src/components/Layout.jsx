import { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { CalendarDays, ChartColumn, DoorOpen, Dumbbell, LayoutGrid, LogOut, QrCode, ReceiptText, UserRound, Wrench } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
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

export default function Layout() {
  // Simulación de rol activo para desarrollo: 'SOCIO', 'EXTERNO', 'RECEPCION', 'GERENTE'
  const [rolActivo, setRolActivo] = useState('SOCIO');
  const { logout, isAuthenticated } = useAuth();
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
            <select id="vista-desarrollo" value={rolActivo} onChange={(e) => setRolActivo(e.target.value)}>
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
                  <NavigationLink to="/mi-qr" icon={QrCode} module="M2">Mi QR dinámico</NavigationLink>
                </>
              )}
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
          <Outlet context={{ rolActivo }} />
        </div>
      </main>
    </div>
  );
}
