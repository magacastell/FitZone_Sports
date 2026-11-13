import { useEffect, useRef, useState } from 'react';
import { Link, Navigate, useOutletContext } from 'react-router-dom';
import { FileText } from 'lucide-react';

import { useAuth } from '../../context/AuthContext';
import { descargarComprobante } from '../../services/pagosService';
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

function formatoFecha(valor) {
  if (!valor) return 'Fecha no disponible';

  return new Date(valor).toLocaleDateString('es-AR', {
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

export default function HistorialComprobantes() {
  const { user } = useAuth();
  const { membresia, refrescarMembresia } = useOutletContext();

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
    if (descarga.estado !== 'exito') return undefined;

    const aviso = setTimeout(() => {
      if (montado.current) setDescarga({ estado: 'inicial' });
    }, 4000);

    return () => clearTimeout(aviso);
  }, [descarga.estado]);

  const descargar = async (pagoId) => {
    if (enviando.current) return;

    enviando.current = true;
    setDescarga({ estado: 'cargando', pagoId });

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
              ? 'Este comprobante ya no está disponible para descarga.'
              : 'No pudimos descargar el comprobante. Intentá nuevamente.',
        });
      }
    } finally {
      enviando.current = false;
    }
  };

  const estadoMembresia = membresia?.estado || 'cargando';
  const periodos = periodosConPago(membresia)
    .slice()
    .sort((a, b) => Date.parse(b.inicio) - Date.parse(a.inicio));

  if (user?.rol !== 'USUARIO') {
    return (
      <div className="fitzone-ui">
        <PageHeading
          title="Comprobantes personales no disponibles"
          description="Esta sección corresponde a los períodos de membresía de una cuenta de usuario."
        />
        <Link to="/perfil">Volver a mi perfil</Link>
      </div>
    );
  }

  // Esta ruta conserva su comportamiento histórico: los clientes sin membresía
  // acceden a su catálogo y a los pagos de canchas desde /pagos.
  if (estadoMembresia === 'sin-membresia') {
    return <Navigate to="/membresia" replace />;
  }

  return (
    <div className="fitzone-ui receipts-page">
      <div className="page-stack">
        <PageHeading
          eyebrow="MI CUENTA"
          title="Comprobantes de membresía"
          description="Los comprobantes originales de tus períodos de membresía con pago registrado."
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

        {estadoMembresia === 'cargando' && (
          <DataCard title="Consultando tus comprobantes">
            <p role="status">
              Estamos cargando los períodos de membresía con pago registrado...
            </p>
          </DataCard>
        )}

        {estadoMembresia === 'error' && (
          <DataCard title="No pudimos cargar tus comprobantes">
            <p role="alert">
              No pudimos consultar tu membresía. Podés volver a intentarlo.
            </p>
            <AppButton onClick={refrescarMembresia}>
              Reintentar consulta
            </AppButton>
          </DataCard>
        )}

        {estadoMembresia === 'cargada' && (
          periodos.length > 0 ? (
            <>
              <div className="receipts-summary">
                <span>
                  {periodos.length}{' '}
                  {periodos.length === 1 ? 'período' : 'períodos'} con pago registrado
                </span>
                <span>Períodos más recientes primero</span>
              </div>

              <div className="receipts-grid">
                {periodos.map((periodo) => (
                  <DataCard
                    key={periodo.id}
                    className="receipt-card"
                    title={periodo.nombrePlan || 'Membresía'}
                    description={`Referencia de pago #${periodo.pagoId}`}
                    action={<FileText size={24} aria-hidden="true" />}
                  >
                    {periodo.estado === 'CANCELADA' && (
                      <StatusBadge tone="neutral">
                        Período cancelado
                      </StatusBadge>
                    )}

                    <div className="receipt-card__body">
                      <dl className="receipt-card__details">
                        <div>
                          <dt>Período contratado</dt>
                          <dd>
                            <time dateTime={periodo.inicio}>
                              {formatoFecha(periodo.inicio)}
                            </time>
                            {' → '}
                            <time dateTime={periodo.fin}>
                              {formatoFecha(periodo.fin)}
                            </time>
                          </dd>
                        </div>

                        <div>
                          <dt>Importe original · ARS</dt>
                          <dd className="receipt-card__amount">
                            {formatoImporte(periodo.precio)}
                          </dd>
                        </div>
                      </dl>

                      <AppButton
                        variant="secondary"
                        disabled={descarga.estado === 'cargando'}
                        onClick={() => descargar(periodo.pagoId)}
                      >
                        {descarga.estado === 'cargando'
                          && descarga.pagoId === periodo.pagoId
                          ? 'Descargando...'
                          : 'Descargar PDF'}
                        <span className="sr-only">
                          {' '}de {periodo.nombrePlan}, {formatoFecha(periodo.inicio)},
                          pago {periodo.pagoId}
                        </span>
                      </AppButton>
                    </div>
                  </DataCard>
                ))}
              </div>

              <p className="receipts-note">
                El PDF conserva el cobro original, incluso tras un reembolso.
                Un período cancelado no confirma por sí solo el estado actual del pago.
              </p>
            </>
          ) : (
            <DataCard title="Tu historial">
              <EmptyState
                icon={FileText}
                title="Todavía no tenés comprobantes."
                description="Acá aparecerán los períodos de membresía con pago registrado."
              />
            </DataCard>
          )
        )}

        <div className="m5-enlaces">
          <Link to="/membresia">Volver a mi membresía</Link>
          <Link to="/pagos">Ver todos mis pagos</Link>
        </div>
      </div>
    </div>
  );
}
