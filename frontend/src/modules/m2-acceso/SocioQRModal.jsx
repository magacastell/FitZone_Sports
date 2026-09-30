import React from 'react';

export default function SocioQRModal({ isOpen, onClose, usuarioId }) {
  if (!isOpen) return null;

  return (
    <div style={modalOverlayStyle}>
      <div style={modalContentStyle}>
        <h2>Acceso a Sede - Credencial Digital</h2>
        <p>Vista de ejemplo: aquí se mostrará el QR de acceso cuando esa funcionalidad esté implementada.</p>
        
        {/* Simulación de QR */}
        <div style={qrContainerStyle}>
          <div style={{ fontSize: '12px', color: '#666' }}>[ CÓDIGO QR SIMULADO ]</div>
          <strong style={{ fontSize: '18px', marginTop: '10px' }}>SOCIO-ID: {usuarioId || '42'}</strong>
        </div>

        <button onClick={onClose} style={buttonStyle}>Cerrar</button>
      </div>
    </div>
  );
}

const modalOverlayStyle = {
  position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
  backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000
};

const modalContentStyle = {
  backgroundColor: '#fff', padding: '24px', borderRadius: '8px', maxWidth: '400px', width: '100%', textAlign: 'center', color: '#333'
};

const qrContainerStyle = {
  margin: '20px 0', padding: '30px', border: '2px dashed #007bff', borderRadius: '8px', backgroundColor: '#f8f9fa'
};

const buttonStyle = {
  padding: '8px 16px', backgroundColor: '#6c757d', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer'
};
