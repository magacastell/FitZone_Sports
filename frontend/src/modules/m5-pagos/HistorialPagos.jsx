import { useEffect, useRef, useState } from 'react';
import { Link, useOutletContext } from 'react-router-dom';
import { ArrowDownToLine, CalendarDays, FileText } from 'lucide-react';

import { useAuth } from '../../context/AuthContext';
import {
  descargarComprobante,
  listarMisPagos,
} from '../../services/pagosService';
import {
  AppButton,
  DataCard,
  EmptyState,
  PageHeading,
  StatusBadge,
} from '../../components/ui/FitZoneUI';
import { periodosConPago } from '../m1-usuarios/estadoCuenta';

import '../m1-usuarios/PortalSocio.css';
import './HistorialComprobante.css';

const TAMANIO_PAGINA = 20;

function formatoFecha(valor) {
  if (!valor) return 'Fecha no disponible';

  const fecha = new Date(valor);
  if (Number.isNaN(fecha.getTime())) return 'Fecha no disponible';

  return fecha.toLocaleDateString('es-AR', {
    timeZone: 'America/Argentina/Buenos_Aires',
  });
}

function formatoImporte(valor) {
  const importe = Number(valor);
  if (!Number.isFinite(importe)) return 'No disponible';

  return importe.toLocaleString('es-AR', {
    style: 'currency',
    currency: 'ARS',
  });
}

function nombreConcepto(pago, periodo) {
  if (pago.concepto === 'RESERVA_CANCHA') {
    return 'Reserva de cancha';
  }

  if (periodo?.nombrePlan) {
    return `Membresía · ${periodo.nombrePlan}`;
  }

  return 'Pago de membresía';
}

function tonoPago(estado) {
  if (estado === 'APROBADO') return 'success';
  if (estado === 'RECHAZADO') return 'danger';
  if (estado === 'REEMBOLSADO_PARCIAL') return 'warning';

  return 'neutral';
}

function textoEstado(estado) {
  const etiquetas = {
    APROBADO: 'Aprobado',
    RECHAZADO: 'Rechazado',
    REEMBOLSADO: 'Reembolsado',
    REEMBOLSADO_PARCIAL: 'Reembolso parcial',
  };

  return etiquetas[estado] || estado || 'Desconocido';
}

const ESTADOS_CON_COMPROBANTE = [
  'APROBADO',
  'REEMBOLSADO',
  'REEMBOLSADO_PARCIAL',
];

export default function HistorialPagos() {
  const { user, token } = useAuth();
  const { membresia } = useOutletContext();

  const [historial, setHistorial] = useState({
    estado: 'cargando',
    items: [],
  });
  const [pagina, setPagina] = useState(0);
  const [recarga, setRecarga] = useState(0);
  const [descarga, setDescarga] = useState({ estado: 'inicial' });

  const montado = useRef(false);
  const enviando = useRef(false);

  useEffect(() => {
    montado.current = true;

    return () => {
      montado.current = false;
    };
  }, []);

  useEffect(() => {
    if (user?.rol !== 'USUARIO' || !token) return undefined;

    let activo = true;

    setHistorial({
      estado: 'cargando',
      items: [],
    });

    listarMisPagos(pagina, TAMANIO_PAGINA)
      .then((datos) => {
        if (!activo) return;

        if (!Array.isArray(datos)) {
          setHistorial({
            estado: 'error',
            items: [],
            mensaje: 'El servidor devolvió un historial con formato inesperado.',
          });
          return;
        }

        const ordenados = [...datos].sort(
          (a, b) => Date.parse(b.fecha || '') - Date.parse(a.fecha || ''),
        );

        setHistorial({
          estado: 'cargado',
          items: ordenados,
        });
      })
      .catch((error) => {
        if (!activo) return;

        setHistorial({
          estado: 'error',
          items: [],
          mensaje: error?.status === 403
            ? 'No tenés autorización para consultar estos pagos.'
            : error?.status === 401
              ? 'Tu sesión venció. Volvé a iniciar sesión.'
              : 'No pudimos consultar tu historial de pagos. Intentá nuevamente.',
        });
      });

    return () => {
      activo = false;
    };
  }, [user?.rol, token, pagina, recarga]);

  useEffect(() => {
    if (descarga.estado !== 'exito') return undefined;

    const aviso = setTimeout(() => {
      if (montado.current) setDescarga({ estado: 'inicial' });
    }, 4000);

    return () => clearTimeout(aviso);
  }, [descarga.estado]);

  const descargar = async (pagoId) => {
    if (enviando.current) return;

    enviando.current = true;
    setDescarga({
      estado: 'cargando',
      pagoId,
    });

    try {
      const pdf = await descargarComprobante(pagoId);

      if (!montado.current) return;

      const url = URL.createObjectURL(pdf);
      const enlace = document.createElement('a');

      enlace.href = url;
      enlace.download = `comprobante-${pagoId}.pdf`;
      enlace.click();

      setTimeout(() => URL.revokeObjectURL(url), 1000);
      setDescarga({ estado: 'exito' });
    } catch (error) {
      if (montado.current) {
        setDescarga({
          estado: 'error',
          mensaje: error?.status === 403
            ? 'No tenés permiso para descargar este comprobante.'
            : error?.status === 404 || error?.status === 409
              ? 'Este pago no tiene un comprobante PDF disponible.'
              : 'No pudimos descargar el comprobante. Intentá nuevamente.',
        });
      }
    } finally {
      enviando.current = false;
    }
  };

  const periodos = periodosConPago(membresia);
  const periodosPorPago = new Map(
    periodos.map((periodo) => [
      String(periodo.pagoId),
      periodo,
    ]),
  );

  const pagos = historial.items || [];
  const hayPaginaSiguiente = pagos.length === TAMANIO_PAGINA;

  if (user?.rol !== 'USUARIO') {
    return (
      <div className="fitzone-ui">
        <PageHeading
          title="Pagos personales no disponibles"
          description="Esta sección corresponde a los pagos de la cuenta de un usuario."
        />
        <Link to="/perfil">Volver a mi perfil</Link>
      </div>
    );
  }

  return (
    <div className="fitzone-ui receipts-page">
      <div className="page-stack">
        <PageHeading
          eyebrow="MI CUENTA"
          title="Mis pagos"
          description="Historial real de pagos de membresías y reservas de canchas. Cada comprobante corresponde al pago original."
        />

        <div
          role="status"
          aria-live="polite"
          className="receipts-feedback"
        >
          {descarga.estado === 'exito'
            ? 'Descarga iniciada. Revisá las descargas de tu navegador.'
            : descarga.estado === 'cargando'
              ? 'Preparando tu PDF...'
              : ''}
        </div>

        {descarga.estado === 'error' && (
          <p role="alert">{descarga.mensaje}</p>
        )}

        {historial.estado === 'cargando' && (
          <DataCard title="Consultando tus pagos">
            <p role="status">
              Estamos consultando los pagos registrados en tu cuenta...
            </p>
          </DataCard>
        )}

        {historial.estado === 'error' && (
          <DataCard title="No pudimos cargar tu historial">
            <p role="alert">{historial.mensaje}</p>
            <AppButton onClick={() => setRecarga((valor) => valor + 1)}>
              Reintentar consulta
            </AppButton>
          </DataCard>
        )}

        {historial.estado === 'cargado' && (
          <>
            {pagos.length === 0 ? (
              <DataCard title="Tu historial">
                <EmptyState
                  icon={FileText}
                  title="Todavía no tenés pagos registrados"
                  description="Los pagos de membresías y reservas de canchas aparecerán acá cuando se registren en el servidor."
                />
              </DataCard>
            ) : (
              <>
                <div className="receipts-summary">
                  <span>
                    {pagos.length}{' '}
                    {pagos.length === 1 ? 'pago' : 'pagos'} en esta página
                  </span>
                  <span>Más recientes primero</span>
                </div>

                <div className="receipts-grid">
                  {pagos.map((pago) => {
                    const periodo = periodosPorPago.get(String(pago.id));
                    const esCancha = pago.concepto === 'RESERVA_CANCHA';
                    const titulo = nombreConcepto(pago, periodo);
                    const comprobanteDisponible = ESTADOS_CON_COMPROBANTE
                      .includes(pago.estado);

                    return (
                      <DataCard
                        key={pago.id}
                        className="receipt-card"
                        title={titulo}
                        description={`Pago #${pago.id}`}
                        action={<FileText size={24} aria-hidden="true" />}
                      >
                        <StatusBadge tone={tonoPago(pago.estado)}>
                          {textoEstado(pago.estado)}
                        </StatusBadge>

                        <div className="receipt-card__body">
                          <dl className="receipt-card__details">
                            <div>
                              <dt>Fecha del pago</dt>
                              <dd>
                                <CalendarDays size={14} aria-hidden="true" />
                                {formatoFecha(pago.fecha)}
                              </dd>
                            </div>

                            <div>
                              <dt>
                                {esCancha
                                  ? 'Reserva asociada'
                                  : 'Referencia de membresía'}
                              </dt>
                              <dd>
                                {esCancha
                                  ? `Reserva #${pago.recursoId}`
                                  : periodo
                                    ? `${periodo.nombrePlan} · ${formatoFecha(periodo.inicio)}`
                                    : `Referencia #${pago.recursoId}`}
                              </dd>
                            </div>

                            <div>
                              <dt>
                                Importe original · {pago.moneda || 'ARS'}
                              </dt>
                              <dd className="receipt-card__amount">
                                {formatoImporte(pago.monto)}
                              </dd>
                            </div>

                            {Number(pago.montoReembolsado) > 0 && (
                              <div>
                                <dt>Importe devuelto</dt>
                                <dd>
                                  {formatoImporte(pago.montoReembolsado)}
                                </dd>
                              </div>
                            )}

                            {periodo && (
                              <div>
                                <dt>Período contratado</dt>
                                <dd>
                                  {formatoFecha(periodo.inicio)}
                                  {' → '}
                                  {formatoFecha(periodo.fin)}
                                </dd>
                              </div>
                            )}
                          </dl>

                          {comprobanteDisponible ? (
                            <AppButton
                              variant="secondary"
                              disabled={descarga.estado === 'cargando'}
                              onClick={() => descargar(pago.id)}
                            >
                              <ArrowDownToLine size={16} aria-hidden="true" />
                              {descarga.estado === 'cargando'
                                && descarga.pagoId === pago.id
                                ? 'Descargando...'
                                : 'Descargar PDF'}
                              <span className="sr-only">
                                {' '}del pago {pago.id}
                              </span>
                            </AppButton>
                          ) : (
                            <p className="receipts-note">
                              El pago rechazado no tiene comprobante disponible.
                            </p>
                          )}
                        </div>
                      </DataCard>
                    );
                  })}
                </div>
              </>
            )}

            <div className="m5-paginacion">
              <AppButton
                variant="secondary"
                disabled={pagina === 0}
                onClick={() => setPagina((valor) => Math.max(0, valor - 1))}
              >
                Anterior
              </AppButton>

              <span>Página {pagina + 1}</span>

              <AppButton
                variant="secondary"
                disabled={!hayPaginaSiguiente}
                onClick={() => setPagina((valor) => valor + 1)}
              >
                Siguiente
              </AppButton>
            </div>
          </>
        )}

        <div className="m5-enlaces">
          <Link to="/membresia">Mi membresía</Link>
          <Link to="/canchas">Reservar una cancha</Link>
          <Link to="/comprobantes">Comprobantes de membresía</Link>
        </div>
      </div>
    </div>
  );
}
