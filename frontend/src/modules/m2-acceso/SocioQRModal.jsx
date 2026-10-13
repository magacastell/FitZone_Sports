import React, { useEffect, useRef, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { fetchAPI } from '../../services/api';
import './SocioQRModal.css';

// RF-04: el QR cambia cada minuto. Se pide uno nuevo un poco antes de que venza el actual.
const MARGEN_RENOVACION_MS = 5000;
const VIGENCIA_POR_DEFECTO_MS = 60000;

// Vigencia real del QR según el propio token (exp - iat, ambos del reloj del servidor):
// no depende de que el reloj de este dispositivo esté bien puesto.
const vigenciaMs = (token) => {
  try {
    const { iat, exp } = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
    return (exp - iat) * 1000;
  } catch {
    return VIGENCIA_POR_DEFECTO_MS;
  }
};

export default function SocioQRModal({ isOpen, onClose }) {
  const dialogRef = useRef(null);
  const [token, setToken] = useState(null);
  const [vence, setVence] = useState(0);
  const [segundos, setSegundos] = useState(0);
  const [error, setError] = useState('');

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog || !isOpen) return;

    dialog.showModal();
    return () => dialog.close();
  }, [isOpen]);

  // Pide el QR al abrir y lo renueva solo mientras el diálogo siga abierto.
  useEffect(() => {
    if (!isOpen) return;

    let activo = true;
    let timer;

    const renovar = async () => {
      try {
        const data = await fetchAPI('/accesos/qr');
        if (!activo) return;
        const duracion = vigenciaMs(data.token);
        setToken(data.token);
        setVence(Date.now() + duracion);
        setError('');
        timer = setTimeout(renovar, Math.max(duracion - MARGEN_RENOVACION_MS, 1000));
      } catch (err) {
        if (!activo) return;
        setToken(null);
        setError(err.message || 'No pudimos generar tu QR.');
      }
    };

    renovar();
    return () => {
      activo = false;
      clearTimeout(timer);
    };
  }, [isOpen]);

  useEffect(() => {
    if (!token) return;
    const tick = () => setSegundos(Math.max(0, Math.ceil((vence - Date.now()) / 1000)));
    tick();
    const intervalo = setInterval(tick, 1000);
    return () => clearInterval(intervalo);
  }, [token, vence]);

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
      <p id="socio-qr-description">Mostrá este código en recepción. Se renueva solo cada minuto.</p>

      <div style={qrContainerStyle}>
        {token ? (
          <>
            <QRCodeSVG value={token} size={220} level="M" title="Código QR de acceso" />
            <p aria-live="off" style={{ fontSize: '13px', color: '#666', margin: '12px 0 0' }}>
              Vence en {segundos} s
            </p>
          </>
        ) : error ? (
          <p role="alert" style={{ color: '#b91c1c', margin: 0 }}>{error}</p>
        ) : (
          <p style={{ color: '#666', margin: 0 }}>Generando tu QR...</p>
        )}
      </div>

      <button type="button" autoFocus onClick={handleClose} style={buttonStyle}>Cerrar</button>
    </dialog>
  );
}

const modalContentStyle = {
  backgroundColor: '#fff', padding: '24px', border: 0, borderRadius: '8px', maxWidth: '400px', width: 'calc(100% - 2rem)', maxHeight: 'calc(100dvh - 2rem)', overflowY: 'auto', textAlign: 'center', color: '#333'
};

const qrContainerStyle = {
  margin: '20px 0', padding: '20px', border: '2px dashed #007bff', borderRadius: '8px', backgroundColor: '#fff', minHeight: '220px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center'
};

const buttonStyle = {
  padding: '8px 16px', backgroundColor: '#6c757d', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer'
};
