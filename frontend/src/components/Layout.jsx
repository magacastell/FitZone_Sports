import { useState } from 'react';
import { Outlet, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

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
    <div style={{ display: 'flex', minHeight: '100vh', fontFamily: 'system-ui, sans-serif' }}>
      {/* Sidebar de Navegación por Actor */}
      <aside style={{ width: '260px', background: '#0f172a', color: '#f8fafc', padding: '1.5rem', display: 'flex', flexDirection: 'column' }}>
        <h2 style={{ fontSize: '1.2rem', color: '#38bdf8', marginBottom: '1.5rem' }}>FitZone Sports</h2>
        
        {/* Switcher provisional de roles */}
        <div style={{ marginBottom: '1.5rem', background: '#1e293b', padding: '0.75rem', borderRadius: '6px' }}>
          <label style={{ fontSize: '0.8rem', color: '#94a3b8', display: 'block' }}>Vista de desarrollo:</label>
          <select 
            value={rolActivo} 
            onChange={(e) => setRolActivo(e.target.value)}
            style={{ width: '100%', marginTop: '0.4rem', padding: '0.4rem', borderRadius: '4px', background: '#0f172a', color: '#fff', border: '1px solid #334155' }}
          >
            <option value="SOCIO">Socio Activo</option>
            <option value="EXTERNO">Cliente Externo</option>
            <option value="RECEPCION">Recepcionista / Admin Sede</option>
            <option value="GERENTE">Gerente Central</option>
          </select>
        </div>

        {/* Menú Dinámico según Actor */}
        <nav style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem', flex: 1 }}>
          <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 'bold' }}>MÓDULOS DEL USUARIO</span>
          <Link to="/canchas" style={linkStyle}>⚽ Canchas (M4)</Link>
          
          {rolActivo === 'SOCIO' && (
            <>
              <Link to="/clases" style={linkStyle}>🏋️ Clases Grupales (M3)</Link>
              <Link to="/mi-qr" style={linkStyle}>🎴 Mi QR Dinámico (M2)</Link>
            </>
          )}

          <Link to="/perfil" style={linkStyle}>👤 Mi Perfil / Membresía (M1)</Link>
          <Link to="/comprobantes" style={linkStyle}>🧾 Mis Comprobantes (M5)</Link>

          {(rolActivo === 'RECEPCION' || rolActivo === 'GERENTE') && (
            <>
              <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 'bold', marginTop: '1rem' }}>OPERACIÓN Y GESTIÓN</span>
              <Link to="/recepcion/acceso" style={{ ...linkStyle, color: '#f59e0b' }}>🪪 Control Acceso y Aforo (M2)</Link>
              <Link to="/admin/canchas/mantenimiento" style={{ ...linkStyle, color: '#f59e0b' }}>🛠️ Mantenimiento Canchas (M4)</Link>
            </>
          )}

          {rolActivo === 'GERENTE' && (
            <Link to="/admin/reportes-consolidados" style={{ ...linkStyle, color: '#ef4444' }}>📊 Reportes Consolidados</Link>
          )}
        </nav>

        {/* Botón de Logout */}
        {isAuthenticated && (
          <button 
            onClick={handleLogout}
            style={{ marginTop: 'auto', padding: '0.6rem', backgroundColor: '#ef4444', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}
          >
            Cerrar Sesión
          </button>
        )}
      </aside>

      {/* Área Principal */}
      <main style={{ flex: 1, padding: '2rem', background: '#f1f5f9' }}>
        <Outlet context={{ rolActivo }} />
      </main>
    </div>
  );
}

const linkStyle = { color: '#e2e8f0', textDecoration: 'none', fontSize: '0.95rem' };