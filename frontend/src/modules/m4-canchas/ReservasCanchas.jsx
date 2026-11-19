import { useEffect, useRef, useState } from 'react';
import { CalendarDays, Clock3 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import DialogoReserva from '../../components/ui/DialogoReserva';
import { AppButton, AppLink, DataCard, EmptyState, StatusBadge } from '../../components/ui/FitZoneUI';
import { listarMisReservas, listarReservas } from '../../services/m4Service';
import { cancelarConDetalle, estadoReservaTexto, formatoFechaHora, formatoPrecio, mensajeError, tiempoRestante, tonoReserva } from './reservasCanchaUtils';
import './GrillaCanchas.css';

const TAMANIO_PAGINA = 20;

export function useReservasCancha({ habilitada, personal, sedeId, pagina, refresco }) {
  const [reservas, setReservas] = useState({ estado: 'inicial', items: [] });

  useEffect(() => {
    if (!habilitada) {
      setReservas({ estado: 'inicial', items: [] });
      return;
    }
    let activo = true;
    setReservas({ estado: 'cargando', items: [] });
    const consulta = personal
      ? listarMisReservas(pagina, TAMANIO_PAGINA)
      : listarReservas(sedeId || null, pagina, TAMANIO_PAGINA);
    consulta.then((items) => {
      if (!activo) return;
      setReservas(Array.isArray(items) ? { estado: 'cargado', items }
        : { estado: 'error', items: [], mensaje: 'La respuesta de reservas no es válida.' });
    }, (error) => {
      if (activo) setReservas({ estado: 'error', items: [], mensaje: mensajeError(error, 'reservas') });
    });
    return () => { activo = false; };
  }, [habilitada, personal, sedeId, pagina, refresco]);

  return reservas;
}

export function ListadoReservasCancha({ reservas, pagina, setPagina, cancelar, ocupado, ahora, personal = false, reintentar }) {
  const visibles = reservas.items.filter((reserva) => !personal || reserva.pagoId != null);

  return (
    <>
      {reservas.estado === 'cargando' && <p role="status">Consultando reservas de canchas…</p>}
      {reservas.estado === 'error' && <>
        <p role="alert">{reservas.mensaje}</p>
        {reintentar && <AppButton type="button" variant="secondary" onClick={reintentar}>Reintentar</AppButton>}
      </>}
      {reservas.estado === 'cargado' && (
        visibles.length === 0 ? <EmptyState icon={CalendarDays} title={
          pagina === 0 && reservas.items.length < TAMANIO_PAGINA
            ? 'Todavía no tenés reservas de canchas' : 'No hay reservas para mostrar en esta página'
        } /> : (
          <div className="m4-reservas-lista">
            {visibles.map((reserva) => {
              const pendiente = reserva.estado === 'PENDIENTE_PAGO';
              const vencida = pendiente && reserva.venceEn && Date.parse(reserva.venceEn) <= ahora;
              const estado = vencida ? 'EXPIRADA' : reserva.estado;
              const puedeCancelar = (pendiente || estado === 'CONFIRMADA') && Date.parse(reserva.inicio) > ahora;

              return (
                <article className="m4-reserva" key={reserva.id}>
                  <div className="m4-reserva__datos">
                    <div className="m4-reserva__titulo">
                      <strong>{reserva.cancha}</strong>
                      <StatusBadge tone={tonoReserva(estado)}>{estadoReservaTexto(estado)}</StatusBadge>
                    </div>
                    <p>{reserva.sede} · {reserva.tipo}</p>
                    <p>{formatoFechaHora(reserva.inicio)} – {formatoFechaHora(reserva.fin)}</p>
                    <p>Reserva #{reserva.id} · {formatoPrecio(reserva.precioAplicado)}</p>
                    {pendiente && reserva.venceEn && !vencida && (
                      <p className="m4-vencimiento"><Clock3 size={15} aria-hidden="true" /> Vence en {tiempoRestante(reserva.venceEn, ahora)}</p>
                    )}
                    {reserva.estadoPago && <p>Estado del pago: <strong>{reserva.estadoPago}</strong></p>}
                  </div>
                  {puedeCancelar && (
                    <div className="m4-reserva__acciones">
                      <AppButton size="sm" variant="secondary" disabled={ocupado} onClick={() => cancelar(reserva)}>
                        {personal ? 'Cancelar reserva' : 'Cancelar'}
                      </AppButton>
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        )
      )}
      {(pagina > 0 || reservas.items.length >= TAMANIO_PAGINA) && (
        <nav className="m4-reservas-paginacion" aria-label="Páginas de reservas de canchas">
          <AppButton size="sm" variant="secondary" disabled={pagina === 0 || ocupado || reservas.estado === 'cargando'} onClick={() => setPagina(pagina - 1)}>Anterior</AppButton>
          <span>Página {pagina + 1}</span>
          <AppButton size="sm" variant="secondary" disabled={ocupado || reservas.items.length < TAMANIO_PAGINA} onClick={() => setPagina(pagina + 1)}>Siguiente</AppButton>
        </nav>
      )}
    </>
  );
}

export default function ReservasCanchas() {
  const { user } = useAuth();
  const [pagina, setPagina] = useState(0);
  const [refresco, setRefresco] = useState(0);
  const [seleccionada, setSeleccionada] = useState(null);
  const [ocupado, setOcupado] = useState(false);
  const [aviso, setAviso] = useState(null);
  const enviando = useRef(false);
  const reservas = useReservasCancha({ habilitada: true, personal: true, pagina, refresco });
  const actualizar = () => setRefresco((valor) => valor + 1);

  const cancelar = async () => {
    if (enviando.current) return;
    enviando.current = true;
    setOcupado(true);
    setAviso(null);
    try {
      const texto = await cancelarConDetalle(seleccionada, user);
      setAviso({ tipo: 'ok', texto });
      setSeleccionada(null);
    } catch (error) {
      setAviso({ tipo: 'error', texto: mensajeError(error, 'cancelacion') });
    } finally {
      enviando.current = false;
      setOcupado(false);
      actualizar();
    }
  };

  return (
    <div className="grilla-canchas">
      {!seleccionada && aviso && (
        <p className={`m4-aviso m4-aviso--${aviso.tipo}`} role={aviso.tipo === 'error' ? 'alert' : 'status'}>{aviso.texto}</p>
      )}
      <DataCard title="Canchas" description="Tus turnos y su estado de pago."
        action={<AppLink to="/canchas">Ver canchas</AppLink>}>
        <ListadoReservasCancha reservas={reservas} pagina={pagina} setPagina={setPagina} ocupado={ocupado} ahora={Date.now()}
          cancelar={(reserva) => { setAviso(null); setSeleccionada(reserva); }} personal reintentar={actualizar} />
      </DataCard>
      {seleccionada && (
        <DialogoReserva titulo="¿Cancelar tu turno?" detalle={<>
          <p><strong>{seleccionada.cancha}</strong> · {formatoFechaHora(seleccionada.inicio)}</p>
          <p>El turno se libera y se aplica la devolución que corresponda según la anticipación.</p>
        </>} ocupado={ocupado} onCerrar={() => { setAviso(null); setSeleccionada(null); }} textoCerrar="Mantener reserva"
          accion={<AppButton type="button" variant="danger" disabled={ocupado} onClick={cancelar}>{ocupado ? 'Cancelando…' : 'Confirmar cancelación'}</AppButton>}>
          {aviso?.tipo === 'error' && <p className="m4-aviso m4-aviso--error" role="alert">{aviso.texto}</p>}
        </DialogoReserva>
      )}
    </div>
  );
}
