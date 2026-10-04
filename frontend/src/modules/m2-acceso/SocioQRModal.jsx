import React, { useEffect, useRef } from 'react';
import './SocioQRModal.css';

export default function SocioQRModal({ isOpen, onClose, usuarioId }) {
  const dialogRef = useRef(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog || !isOpen) return;

    dialog.showModal();
    return () => dialog.close();
  }, [isOpen]);

  const handleClose = () => {
    dialogRef.current?.close();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <dialog
      ref={dialogRef}
      className="socio-qr-dialog"
      aria-labelledby="socio-qr-title"
      aria-describedby="socio-qr-description"
      onCancel={(event) => {
        event.preventDefault();
        handleClose();
      }}
      style={modalContentStyle}
    >
      <h2 id="socio-qr-title">Acceso a Sede - Credencial Digital</h2>
      <p id="socio-qr-description">Vista de ejemplo: aquí se mostrará el QR de acceso cuando esa funcionalidad esté implementada.</p>

      {/* Simulación de QR */}
      <div style={qrContainerStyle}>
        <div style={{ fontSize: '12px', color: '#666' }}>[ CÓDIGO QR SIMULADO ]</div>
        <strong style={{ fontSize: '18px', marginTop: '10px' }}>SOCIO-ID: {usuarioId || '42'}</strong>
      </div>

      <button type="button" autoFocus onClick={handleClose} style={buttonStyle}>Cerrar</button>
    </dialog>
  );
}

const modalContentStyle = {
  backgroundColor: '#fff', padding: '24px', border: 0, borderRadius: '8px', maxWidth: '400px', width: 'calc(100% - 2rem)', maxHeight: 'calc(100dvh - 2rem)', overflowY: 'auto', textAlign: 'center', color: '#333'
};

const qrContainerStyle = {
  margin: '20px 0', padding: '30px', border: '2px dashed #007bff', borderRadius: '8px', backgroundColor: '#f8f9fa'
};

const buttonStyle = {
  padding: '8px 16px', backgroundColor: '#6c757d', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer'
};
