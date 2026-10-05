import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import FeaturePlaceholder from '../components/FeaturePlaceholder';
import PerfilUsuario from '../modules/m1-usuarios/PerfilUsuario';
import ControlAccesoSede from '../modules/m2-acceso/ControlAccesoSede';
import SocioQRModal from '../modules/m2-acceso/SocioQRModal';
import AgendaClases from '../modules/m3-clases/AgendaClases';
import GrillaCanchas from '../modules/m4-canchas/GrillaCanchas';
import HistorialComprobante from '../modules/m5-pagos/HistorialComprobante';

import LoginPage from '../modules/auth/LoginPage';
import RegisterPage from '../modules/auth/RegisterPage';
import ProtectedRoute from '../components/ProtectedRoute';

function SocioQRRoute() {
  const navigate = useNavigate();

  return <SocioQRModal isOpen={true} onClose={() => navigate('/canchas')} usuarioId="42" />;
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
              <Route index element={<Navigate to="/canchas" replace />} />
              <Route path="canchas" element={<GrillaCanchas />} />
              <Route path="clases" element={<AgendaClases />} />
              <Route path="mi-qr" element={<SocioQRRoute />} />
              <Route path="perfil" element={<PerfilUsuario />} />
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
          
          <Route path="*" element={<Navigate to="/canchas" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
