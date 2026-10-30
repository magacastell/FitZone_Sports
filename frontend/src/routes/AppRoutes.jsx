import React, { useCallback, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Link, useNavigate, useOutletContext } from 'react-router-dom';
import Layout from '../components/Layout';
import FeaturePlaceholder from '../components/FeaturePlaceholder';
import PerfilUsuario from '../modules/m1-usuarios/PerfilUsuario';
import MembresiaUsuario from '../modules/m1-usuarios/MembresiaUsuario';
import GestionPlanes from '../modules/m1-usuarios/GestionPlanes';
import ControlAccesoSede from '../modules/m2-acceso/ControlAccesoSede';
import SocioQRModal from '../modules/m2-acceso/SocioQRModal';
import AgendaClases from '../modules/m3-clases/AgendaClases';
import GrillaCanchas from '../modules/m4-canchas/GrillaCanchas';
import HistorialComprobante from '../modules/m5-pagos/HistorialComprobante';

import LoginPage from '../modules/auth/LoginPage';
import RegisterPage from '../modules/auth/RegisterPage';
import ProtectedRoute from '../components/ProtectedRoute';
import { useAuth } from '../context/AuthContext';

function InicioPorRol() {
  const { user, loading } = useAuth();
  if (loading || !user) return <p role="status">Cargando sesión de FitZone...</p>;
  if (user.rol === 'GERENTE') return <Navigate to="/gestion/planes" replace />;
  if (user.rol === 'USUARIO') return <Navigate to="/membresia" replace />;
  return <Navigate to={user.rol === 'RECEPCIONISTA' ? '/recepcion/acceso' : '/perfil'} replace />;
}

function SocioQRRoute() {
  const navigate = useNavigate();
  const { membresia, refrescarMembresia, puedeAbrirQr } = useOutletContext();
  const [errorQr, setErrorQr] = useState('');
  const alDenegarAcceso = useCallback((error) => {
    setErrorQr(error.message || 'El backend denegó la generación del QR.');
    refrescarMembresia();
  }, [refrescarMembresia]);

  if (membresia.estado === 'cargando') return <p role="status">Consultando membresía para abrir Mi QR...</p>;
  if (!puedeAbrirQr) return (
    <div>
      {errorQr && <p role="alert">{errorQr}</p>}
      {membresia.estado === 'error' ? (
        <>
          <p role="alert">No pudimos consultar tu membresía. {membresia.mensaje}</p>
          <button type="button" onClick={refrescarMembresia}>Reintentar consulta de membresía</button>
        </>
      ) : <p>Mi QR no está disponible con el estado actual de tu membresía.</p>}
      <Link to="/membresia">Ver mi membresía</Link>
    </div>
  );
  return <SocioQRModal isOpen={true} onClose={() => navigate('/')} onAccesoDenegado={alDenegarAcceso} />;
}

export default function AppRoutes() {
  return (
    <BrowserRouter>
      <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/registro" element={<RegisterPage />} />

          {/* Todas las rutas del Layout ahora están protegidas */}
          <Route element={<ProtectedRoute />}>
            <Route path="/" element={<Layout />}>
              <Route index element={<InicioPorRol />} />
              <Route path="canchas" element={<GrillaCanchas />} />
              <Route path="clases" element={<AgendaClases />} />
              <Route path="mi-qr" element={<SocioQRRoute />} />
              <Route path="perfil" element={<PerfilUsuario />} />
              <Route path="membresia" element={<MembresiaUsuario />} />
              <Route path="gestion/planes" element={<GestionPlanes />} />
              <Route path="comprobantes" element={<HistorialComprobante />} />
              
              <Route path="recepcion/acceso" element={<ControlAccesoSede />} />
              <Route path="admin/canchas/mantenimiento" element={
                <FeaturePlaceholder
                  title="Mantenimiento de canchas (M4)"
                  description="La gestión de mantenimiento de canchas está pendiente."
                />
              } />
              <Route path="admin/reportes-consolidados" element={
                <FeaturePlaceholder
                  title="Reportes consolidados"
                  description="Los reportes de gestión todavía no están disponibles."
                />
              } />
            </Route>
          </Route>
          
          <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
