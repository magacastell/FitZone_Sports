import { useEffect, useRef, useState } from 'react';
import { useOutletContext, Link, Navigate } from 'react-router-dom';
import { FileText } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { descargarComprobante } from '../../services/pagosService';
import { AppButton, DataCard, PageHeading, StatusBadge, EmptyState } from '../../components/ui/FitZoneUI';
import { periodosConPago } from '../m1-usuarios/estadoCuenta';
import '../m1-usuarios/PortalSocio.css';

export default function HistorialComprobantes() {
  const { user } = useAuth();
  const { membresia, refrescarMembresia } = useOutletContext();
  const [descarga, setDescarga] = useState({ estado: 'inicial' });
  const montado = useRef(false);
  const enviando = useRef(false);
  useEffect(() => { montado.current = true; return () => { montado.current = false; }; }, []);
  useEffect(() => {
    if (descarga.estado !== 'exito') return;
    const aviso = setTimeout(() => setDescarga({ estado: 'inicial' }), 4000);
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
      if (montado.current) setDescarga({ estado: 'error', mensaje: error.status === 403
        ? 'No tenés permiso para descargar este comprobante.'
        : error.status === 404 ? 'No encontramos el pago asociado a este comprobante.'
          : 'No pudimos descargar el comprobante. Intentá nuevamente.' });
    } finally { enviando.current = false; }
  };
  // El contrato no incluye emisión/pago: ordenar por inicio del período, no por una fecha inventada.
  const periodos = periodosConPago(membresia).slice().sort((a, b) => Date.parse(b.inicio) - Date.parse(a.inicio));
  const fecha = (valor) => new Date(valor).toLocaleDateString('es-AR', { timeZone: 'America/Argentina/Buenos_Aires' });

  if (user?.rol !== 'USUARIO') return <div className="fitzone-ui"><PageHeading title="Comprobantes personales no disponibles" description="Esta sección corresponde a pagos de membresía de tu cuenta." /><Link to="/perfil">Volver a mi perfil</Link></div>;
  if (membresia.estado === 'sin-membresia') return <Navigate to="/membresia" replace />;

  return <div className="fitzone-ui"><div className="page-stack">
    <PageHeading eyebrow="MI CUENTA" title="Comprobantes" description="Tus pagos de membresía, con el detalle del período y su comprobante original." />
    {membresia.estado === 'cargando' && <DataCard title="Consultando tus comprobantes"><p role="status">Estamos cargando los períodos con pago registrado...</p></DataCard>}
    {membresia.estado === 'error' && <DataCard title="No pudimos cargar tus comprobantes"><p role="alert">No pudimos consultar tu membresía. Podés volver a intentarlo.</p><AppButton onClick={refrescarMembresia}>Reintentar consulta</AppButton></DataCard>}
    <div role="status" aria-live="polite" className="receipts-feedback">{descarga.estado === 'exito' ? 'Descarga iniciada. Revisá las descargas de tu navegador.' : descarga.estado === 'cargando' ? 'Preparando tu PDF...' : ''}</div>
    {descarga.estado === 'error' && <p role="alert">{descarga.mensaje}</p>}
    {membresia.estado === 'cargada' && (periodos.length > 0 ? <>
      <div className="receipts-summary"><span>{periodos.length} {periodos.length === 1 ? 'período' : 'períodos'} con pago registrado</span><span>Períodos más recientes primero</span></div>
      <div className="receipts-grid">{periodos.map((p) => <DataCard key={p.id} className="receipt-card" title={p.nombrePlan} description={`Referencia de pago #${p.pagoId}`} action={<FileText size={24} aria-hidden="true" />}>
        {p.estado === 'CANCELADA' && <StatusBadge tone="neutral">Período cancelado</StatusBadge>}
        <dl className="receipt-card__details"><div><dt>Período contratado</dt><dd>{fecha(p.inicio)} → {fecha(p.fin)}</dd></div><div><dt>Importe del período · ARS</dt><dd className="receipt-card__amount">{Number(p.precio).toLocaleString('es-AR', { style: 'currency', currency: 'ARS' })}</dd></div></dl>
        <AppButton variant="secondary" disabled={descarga.estado === 'cargando'} onClick={() => descargar(p.pagoId)}>{descarga.estado === 'cargando' && descarga.pagoId === p.pagoId ? 'Descargando...' : 'Descargar PDF'}<span className="sr-only"> de {p.nombrePlan}, {fecha(p.inicio)}, pago {p.pagoId}</span></AppButton>
      </DataCard>)}</div>
      <p className="receipts-note">El PDF conserva los datos del cobro original, incluso si después hubo un reembolso. Su número y fecha de emisión están dentro del documento. Un período cancelado no informa por sí solo el estado del pago.</p>
    </> : <DataCard title="Tu historial"><EmptyState icon={FileText} title="Todavía no tenés comprobantes." description="Acá aparecerán los períodos de membresía con pago registrado." /></DataCard>)}
    <Link to="/membresia">Volver a mi cuenta</Link>
  </div></div>;
}
