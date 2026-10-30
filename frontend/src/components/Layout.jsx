import { useCallback, useEffect, useRef, useState } from 'react';
import { Outlet, NavLink, Link, useLocation, useNavigate } from 'react-router-dom';
import { CalendarDays, DoorOpen, Dumbbell, LayoutGrid, LogOut, QrCode, ReceiptText, UserRound, List, Menu, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { consultarMiMembresia, consultarMiPerfil } from '../services/m1Service';
import { nombreActor, periodosConPago } from '../modules/m1-usuarios/estadoCuenta';
import './Layout.css';

function NavigationLink({ to, icon: Icon, children }) {
  return (
    <li>
      <NavLink to={to} end className={({ isActive }) => `app-nav__link${isActive ? ' app-nav__link--active' : ''}`}>
        <Icon className="app-icon" size={20} strokeWidth={1.75} aria-hidden="true" />
        <span className="app-nav__label">{children}</span>
      </NavLink>
    </li>
  );
}

// Rol del JWT (nombre en backend) -> clave de vista que usa el menú
const VISTA_POR_ROL = {
  USUARIO: 'USUARIO',
  RECEPCIONISTA: 'RECEPCION',
  GERENTE: 'GERENTE',
};

const TITULO_POR_RUTA = {
  '/perfil': 'Perfil', '/membresia': 'Mi membresía', '/gestion/planes': 'Planes de membresía',
  '/recepcion/acceso': 'Control de acceso', '/mi-qr': 'Mi QR',
  '/comprobantes': 'Comprobantes', '/canchas': 'Canchas', '/clases': 'Clases',
};

export default function Layout() {
  const { token } = useAuth();
  return <LayoutAutenticado key={token} />;
}

function LayoutAutenticado() {
  const { user, logout, isAuthenticated } = useAuth();
  const { pathname } = useLocation();
  const [perfilCuenta, setPerfilCuenta] = useState(null);
  const [menuAbierto, setMenuAbierto] = useState(false);
  const menuRef = useRef(null);
  const botonMenuRef = useRef(null);

  useEffect(() => {
    let activo = true;
    setPerfilCuenta(null);
    if (user?.email) consultarMiPerfil().then(
      (datos) => { if (activo) setPerfilCuenta(datos); },
      () => { /* El enlace a Perfil conserva el email real de la sesión como alternativa. */ },
    );
    return () => { activo = false; };
  }, [user?.email]);

  useEffect(() => { setMenuAbierto(false); }, [pathname]);
  useEffect(() => {
    if (menuAbierto) menuRef.current?.querySelector('a')?.focus();
  }, [menuAbierto]);

  const nombreCuenta = perfilCuenta
    ? `${perfilCuenta.nombre} ${perfilCuenta.apellido}`.trim()
    : user?.email || 'Mi cuenta';
  const iniciales = nombreCuenta.split(/\s+/).map((parte) => parte[0]).slice(0, 2).join('').toUpperCase();
  const rolActivo = VISTA_POR_ROL[user?.rol];
  const esCliente = rolActivo === 'USUARIO';
  const [membresia, setMembresia] = useState({ estado: esCliente ? 'cargando' : 'no-aplica' });
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
    if (!esCliente) return Promise.resolve(ultimaMembresia.current);
    if (consulta.current) return consulta.current;
    if (ultimaMembresia.current.estado === 'error' || ultimaMembresia.current.estado === 'no-aplica') {
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
  }, [esCliente]);

  useEffect(() => {
    montado.current = true;
    if (esCliente) refrescarMembresia();
    else actualizarMembresia({ estado: 'no-aplica' });
    const alRecuperarFoco = () => {
      if (document.visibilityState === 'visible') refrescarMembresia();
    };
    if (esCliente) window.addEventListener('focus', alRecuperarFoco);
    return () => {
      montado.current = false;
      revision.current++;
      consulta.current = null;
      window.removeEventListener('focus', alRecuperarFoco);
    };
  }, [esCliente, actualizarMembresia, refrescarMembresia]);

  const puedeAbrirQr = membresia.estado === 'cargada' && membresia.datos.estado === 'ACTIVA';
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="app-layout">
      <a className="skip-link" href="#contenido">Ir al contenido</a>

      <aside id="menu-principal" ref={menuRef} className={`app-sidebar${menuAbierto ? ' app-sidebar--open' : ''}`} aria-label="Menú de FitZone Sports"
        onKeyDown={(event) => {
          if (event.key === 'Escape') { setMenuAbierto(false); botonMenuRef.current?.focus(); }
        }}
        onClick={(event) => { if (event.target.closest('a')) setMenuAbierto(false); }}>
        <div className="app-sidebar__header">
          <div className="app-brand">
            <Dumbbell size={26} strokeWidth={1.75} aria-hidden="true" />
            <div>
              <p className="app-brand__name">FitZone</p>
              <p className="app-brand__description">SPORTS</p>
            </div>
          </div>
        </div>

        <div className="app-sidebar__context">
          <span>Espacio de trabajo</span>
          <strong>{nombreActor(user?.rol, membresia)}</strong>
        </div>

        <nav className="app-nav" aria-label="Navegación principal">
          <div className="app-nav__group">
            <p className="app-nav__heading" id="nav-usuario">{esCliente ? 'Mi espacio' : 'Mi cuenta'}</p>
            <ul className="app-nav__list" aria-labelledby="nav-usuario">
              <NavigationLink to={esCliente ? '/membresia' : '/perfil'} icon={UserRound}>{esCliente ? (membresia.estado === 'sin-membresia' ? 'Elegí tu plan' : 'Mi membresía') : 'Perfil'}</NavigationLink>
            </ul>
          </div>

          {esCliente && (puedeAbrirQr || periodosConPago(membresia).length > 0) && (
            <div className="app-nav__group">
              <p className="app-nav__heading" id="nav-servicios">Servicios</p>
              <ul className="app-nav__list" aria-labelledby="nav-servicios">
                {puedeAbrirQr && <NavigationLink to="/mi-qr" icon={QrCode}>Mi QR</NavigationLink>}
                {periodosConPago(membresia).length > 0 && <NavigationLink to="/comprobantes" icon={ReceiptText}>Comprobantes</NavigationLink>}
              </ul>
            </div>
          )}

          {(rolActivo === 'RECEPCION' || rolActivo === 'GERENTE') && (
            <div className="app-nav__group">
              <p className="app-nav__heading" id="nav-gestion">{rolActivo === 'RECEPCION' ? 'Operación' : 'Operación y gestión'}</p>
              <ul className="app-nav__list" aria-labelledby="nav-gestion">
                {rolActivo === 'GERENTE' && <NavigationLink to="/gestion/planes" icon={List}>Planes</NavigationLink>}
                <NavigationLink to="/recepcion/acceso" icon={DoorOpen}>{rolActivo === 'RECEPCION' ? 'Control de acceso' : 'Control de acceso y aforo'}</NavigationLink>
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

      <div className="app-workspace">
        <header className="app-topbar">
          <div className="app-topbar__heading">
            <button ref={botonMenuRef} type="button" className="app-menu-toggle" aria-expanded={menuAbierto} aria-controls="menu-principal"
              aria-label={menuAbierto ? 'Cerrar menú de navegación' : 'Abrir menú de navegación'} onClick={() => setMenuAbierto(!menuAbierto)}>
              {menuAbierto ? <X size={20} aria-hidden="true" /> : <Menu size={20} aria-hidden="true" />}
            </button>
            <div><span className="app-topbar__brand">FitZone Sports</span><h1>{pathname === '/membresia' && membresia.estado === 'sin-membresia' ? 'Elegí tu plan' : TITULO_POR_RUTA[pathname] || 'Mi espacio'}</h1></div>
          </div>
          <Link to="/perfil" className="app-user" aria-label={`Ver perfil de ${nombreCuenta}`}>
            <span className="app-user__avatar" aria-hidden="true">{iniciales}</span>
            <span className="app-user__identity"><strong>{nombreCuenta}</strong><span>{nombreActor(user?.rol, membresia)}</span></span>
          </Link>
        </header>
        <main id="contenido" className="app-main" tabIndex={-1}>
          <div className="app-content">
            <Outlet context={{ rolActivo, membresia, actualizarMembresia, refrescarMembresia, puedeAbrirQr }} />
          </div>
        </main>
      </div>
    </div>
  );
}
