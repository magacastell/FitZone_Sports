import { useEffect, useId, useRef } from 'react';
import { AppButton } from './FitZoneUI';
import './DialogoReserva.css';

export default function DialogoReserva({ titulo, detalle, ocupado, onCerrar, textoCerrar = 'Cerrar', accion, children }) {
  const referencia = useRef(null);
  const id = useId();

  useEffect(() => {
    const dialogo = referencia.current;
    dialogo.showModal();
    return () => dialogo.close();
  }, []);

  const cerrar = () => {
    if (ocupado) return;
    referencia.current.close();
    onCerrar();
  };

  return (
    <dialog ref={referencia} className="fit-dialogo-reserva" aria-labelledby={id}
      aria-describedby={`${id}-detalle`} onCancel={(evento) => { evento.preventDefault(); cerrar(); }}>
      <h3 id={id}>{titulo}</h3>
      <div id={`${id}-detalle`} className="fit-dialogo-reserva__detalle">{detalle}</div>
      {children}
      <div className="fit-dialogo-reserva__acciones">
        <AppButton type="button" variant="secondary" disabled={ocupado} onClick={cerrar}>{textoCerrar}</AppButton>
        {accion}
      </div>
    </dialog>
  );
}
