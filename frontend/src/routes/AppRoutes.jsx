import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from '../components/Layout';
import PerfilUsuario from '../modules/m1-usuarios/PerfilUsuario';
import ControlAccesoSede from '../modules/m2-acceso/ControlAccesoSede';
import SocioQRModal from '../modules/m2-acceso/SocioQRModal';
import AgendaClases from '../modules/m3-clases/AgendaClases';
import GrillaCanchas from '../modules/m4-canchas/GrillaCanchas';
import HistorialComprobante from '../modules/m5-pagos/HistorialComprobante';

export default function AppRoutes() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Navigate to="/canchas" replace />} />
          <Route path="canchas" element={<GrillaCanchas />} />
          <Route path="clases" element={<AgendaClases />} />
          <Route path="mi-qr" element={<SocioQRModal isOpen={true} onClose={() => {}} usuarioId="42" />} />
          <Route path="perfil" element={<PerfilUsuario />} />
          <Route path="comprobantes" element={<HistorialComprobante />} />
          
          {/* Rutas de Gestión y Recepción */}
          <Route path="recepcion/acceso" element={<ControlAccesoSede />} />
          <Route path="admin/canchas/mantenimiento" element={<GrillaCanchas />} />
          <Route path="admin/reportes-consolidados" element={<HistorialComprobante />} />
        </Route>
        <Route path="*" element={<Navigate to="/canchas" replace />} />
      </Routes>
    </BrowserRouter>
  );
}