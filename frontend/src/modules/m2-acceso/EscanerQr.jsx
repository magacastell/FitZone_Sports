import { useEffect, useRef, useState } from 'react';
import { AppButton } from '../../components/ui/FitZoneUI';

export default function EscanerQr({ onCerrar, onLeer }) {
  const dialogo = useRef(null);
  const video = useRef(null);
  const alLeer = useRef(onLeer);
  alLeer.current = onLeer;
  const [estado, setEstado] = useState({ mensaje: 'Esperando permiso de cámara…' });

  useEffect(() => {
    const dialog = dialogo.current;
    const vista = video.current;
    dialog.showModal();
    let activo = true;
    let escaner;
    const detener = () => {
      vista.srcObject?.getTracks().forEach(pista => pista.stop());
      escaner?.destroy();
      escaner = null;
    };

    async function abrir() {
      if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
        setEstado({ error: true, mensaje: 'Para usar la cámara abrí FitZone por HTTPS con un certificado de confianza.' });
        return;
      }
      try {
        const { default: QrScanner } = await import('qr-scanner');
        if (!activo) return;
        escaner = new QrScanner(vista, ({ data }) => {
          if (!activo || !data?.trim()) return;
          activo = false;
          detener();
          alLeer.current(data);
        }, { preferredCamera: 'environment', returnDetailedScanResult: true });
        await escaner.start();
        if (activo) setEstado({ mensaje: 'Apuntá al QR del socio.' });
      } catch {
        if (activo) setEstado({ error: true, mensaje: 'No pudimos abrir la cámara. Revisá el permiso del navegador y que otra aplicación no la esté usando.' });
        detener();
      }
    }
    abrir();
    return () => {
      activo = false;
      detener();
      dialog.close();
    };
  }, []);

  return <dialog ref={dialogo} aria-label="Escanear QR" className="access-camera-dialog"
    onCancel={evento => { evento.preventDefault(); onCerrar(); }}>
    <h3>Escanear QR</h3>
    <video ref={video} muted playsInline aria-label="Vista de cámara" hidden={estado.error} />
    <p role={estado.error ? 'alert' : 'status'}>{estado.mensaje}</p>
    <AppButton type="button" onClick={onCerrar}>Cerrar cámara</AppButton>
  </dialog>;
}
