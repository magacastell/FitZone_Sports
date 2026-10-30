import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { CalendarDays, ShieldCheck, QrCode, Mail, Fingerprint, MapPin, FileText, ArrowRight, UserRound } from 'lucide-react';
import { nombreActor, periodosConPago } from './estadoCuenta';
import { AppLink, AvatarCircle, DataCard, StatusBadge } from '../../components/ui/FitZoneUI';

export function mensajePortal(mensaje) {
  if (!mensaje) return 'No pudimos completar la consulta. Intentá nuevamente.';
  if (/failed to fetch|networkerror|load failed/i.test(mensaje)) return 'No pudimos conectar con el servidor. Revisá tu conexión e intentá nuevamente.';
  if (/forbidden/i.test(mensaje)) return 'No tenés permisos para realizar esta operación.';
  if (/internal server error|stack trace|exception/i.test(mensaje)) return 'El servidor no pudo completar la operación. Intentá nuevamente más tarde.';
  return mensaje;
}

const fecha = (valor) => valor && Number.isFinite(Date.parse(valor))
  ? new Date(valor).toLocaleString('es-AR', { timeZone: 'America/Argentina/Buenos_Aires', hour12: false }) : 'No disponible';
const fechaPeriodo = (valor) => new Date(valor).toLocaleDateString('es-AR', { timeZone: 'America/Argentina/Buenos_Aires', day: 'numeric', month: 'short', year: 'numeric' });
const moneda = (valor) => Number(valor).toLocaleString('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 2 });


// Solo presentación. Nunca determina el estado de membresía ni autoriza acceso.
export function presentacionVigencia(periodo, ahora = Date.now()) {
  if (!periodo?.inicio || !periodo?.fin) return null;
  const inicio = Date.parse(periodo.inicio);
  const fin = Date.parse(periodo.fin);
  if (!Number.isFinite(inicio) || !Number.isFinite(fin) || fin <= inicio) return null;
  const dias = Math.max(0, Math.ceil((fin - ahora) / 86400000));
  return {
    porcentaje: Math.max(0, Math.min(100, (fin - ahora) / (fin - inicio) * 100)),
    tono: dias > 5 ? 'normal' : dias >= 3 ? 'advertencia' : 'critico',
    texto: ahora < inicio ? 'El período aún no comenzó' : dias === 0 ? 'Período finalizado' : `${dias} ${dias === 1 ? 'día restante' : 'días restantes'}`,
  };
}

function VigenciaPeriodo({ periodo, estado }) {
  const [ahora, setAhora] = useState(Date.now);
  useEffect(() => {
    const timer = setInterval(() => setAhora(Date.now()), 60000);
    return () => clearInterval(timer);
  }, []);
  const vista = presentacionVigencia(periodo, ahora);
  const texto = estado === 'VENCIDA' ? 'Membresía vencida' : vista?.texto;
  return <div className={`membership-period membership-period--${estado === 'VENCIDA' ? 'vencida' : vista?.tono || 'normal'}`}>
    <div className="membership-period__heading"><span>Vigencia del período actual</span>{texto && <strong>{texto}</strong>}</div>
    {vista && <div className="membership-progress" role="progressbar" aria-label="Tiempo restante del período" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(vista.porcentaje)} aria-valuetext={texto}>
      <span style={{ width: `${vista.porcentaje}%` }} />
    </div>}
    <div className="membership-period__dates"><span><span className="sr-only">Inicio: </span>{fecha(periodo.inicio)}</span><span><span className="sr-only">Fin: </span>{fecha(periodo.fin)}</span></div>
  </div>;
}

// JSX de MemberPage de v0; las props proceden del estado compartido S4.
export function ResumenMembresia({ membresia, puedeAbrirQr, children }) {
  const datos = membresia.estado === 'cargada' ? membresia.datos : null;
  const periodo = datos?.periodoVigente;
  const programados = datos?.periodos?.filter((p) => p.estado === 'PROGRAMADA') || [];
  const etiquetas = { ACTIVA: 'Activa', VENCIDA: 'Vencida', SUSPENDIDA: 'Suspendida' };
  const tonos = { ACTIVA: 'success', VENCIDA: 'warning', SUSPENDIDA: 'danger' };
  const qrDisponible = puedeAbrirQr && datos?.estado === 'ACTIVA';
  return <article className="membership-card" aria-label="Resumen de membresía" aria-busy={membresia.estado === 'cargando'}>
    <div className="membership-card__top">
      <span className="membership-card__eyebrow"><ShieldCheck aria-hidden="true" /> MEMBRESÍA ACTUAL</span>
      {datos && <StatusBadge tone={tonos[datos.estado] || 'neutral'}>{etiquetas[datos.estado] || datos.estado}</StatusBadge>}
    </div>
    {membresia.estado === 'cargando' && <p role="status">Cargando membresía...</p>}
    {membresia.estado === 'sin-membresia' && <div className="membership-card__main"><div><h3>Tu próximo paso empieza acá</h3><p>No tenés una membresía. Elegí un plan para comenzar.</p></div></div>}
    {membresia.estado === 'error' && <div className="membership-card__main"><div><h3>No pudimos consultar tu membresía</h3><p>Volvé a consultar desde la opción de recuperación.</p></div></div>}
    {datos && <>
      <div className="membership-card__main">
        <div><h3>{periodo?.nombrePlan || 'Sin período vigente'}</h3><p>{datos.estado === 'ACTIVA' ? 'Tu plan y las fechas de tu período contratado.' : datos.estado === 'SUSPENDIDA' ? 'Tu membresía está suspendida. Consultá con administración.' : 'Tu membresía está vencida. Podés renovar el último plan contratado.'}</p></div>
        {periodo?.precio != null && <div className="membership-price"><strong>{moneda(periodo.precio)}</strong><span>por período de {periodo.duracionMeses} {periodo.duracionMeses === 1 ? 'mes' : 'meses'}</span></div>}
      </div>
      {periodo ? <VigenciaPeriodo periodo={periodo} estado={datos.estado} /> : <p>No hay un período vigente.</p>}
    </>}
    <div className="membership-card__footer">
      {datos && <div className="membership-next-period"><span className="membership-next-period__icon" aria-hidden="true"><CalendarDays /></span><span><small>{programados.length > 1 ? 'Períodos programados' : 'Próximo período'}</small>
        {programados.length ? <ul className="membership-scheduled">{programados.map((p) => <li key={p.id}><strong>{p.nombrePlan}</strong><span title={`${fecha(p.inicio)} → ${fecha(p.fin)}`}>{fechaPeriodo(p.inicio)} → {fechaPeriodo(p.fin)}</span></li>)}</ul> : <strong>Sin períodos programados</strong>}
      </span></div>}

      <div className="membership-card__actions">{children}{qrDisponible && <AppLink variant="dark-outline" to="/mi-qr"><QrCode aria-hidden="true" /> Mi QR</AppLink>}</div>
    </div>
  </article>;
}

export function DatosPersonales({ perfil, mostrarEnlace = true, rol, membresia }) {
  const datos = perfil.estado === 'cargado' ? perfil.datos : null;
  const campos = datos ? [{ label: 'Correo electrónico', valor: datos.email, Icon: Mail }, { label: 'DNI', valor: datos.dni, Icon: Fingerprint }, { label: 'Sede', valor: datos.sedeNombre, Icon: MapPin }] : [];
  return <DataCard className="member-profile-panel" title="Datos personales" description="Información asociada a tu cuenta FitZone." action={mostrarEnlace && <Link className="text-link" to="/perfil">Ver perfil <ArrowRight aria-hidden="true" /></Link>} aria-busy={perfil.estado === 'cargando'}>
    {perfil.estado === 'cargando' && <p role="status">Cargando perfil...</p>}
    {perfil.estado === 'error' && <p role="alert">No pudimos cargar tu perfil. {mensajePortal(perfil.mensaje)}</p>}
    {datos && <>
      <div className="member-identity">
        <AvatarCircle initials={`${datos.nombre?.[0] || ''}${datos.apellido?.[0] || ''}`} size="lg" />
        <div><h4>{datos.nombre} {datos.apellido}</h4><p><UserRound aria-hidden="true" />{nombreActor(rol || datos.rol, membresia)}</p></div>
        {typeof datos.activo === 'boolean' && <StatusBadge tone={datos.activo ? 'success' : 'neutral'}>Cuenta {datos.activo ? 'activa' : 'inactiva'}</StatusBadge>}
      </div>
      <dl className="member-data-grid">{campos.map(({ label, valor, Icon }) => <div className="member-data-item" key={label}><dt><Icon aria-hidden="true" />{label}</dt><dd>{valor || 'No disponible'}</dd></div>)}</dl>
    </>}
  </DataCard>;
}

export function AccesoRapido({ puedeAbrirQr, membresia }) {
  const disponible = puedeAbrirQr && membresia.estado === 'cargada' && membresia.datos.estado === 'ACTIVA';
  return <aside className="qr-card" aria-labelledby="acceso-rapido-titulo">
    <div className="qr-card__topline"><span className="eyebrow">ACCESO RÁPIDO</span>{disponible && <span className="qr-card__status"><span />Disponible</span>}</div>
    <h3 id="acceso-rapido-titulo">Tu ingreso, siempre a mano</h3>
    <p>Mostrá tu código en recepción para ingresar a la sede.</p>
    {disponible ? <Link className="qr-card__preview" to="/mi-qr"><span className="qr-card__frame"><ShieldCheck size={36} aria-hidden="true" /></span><span className="qr-card__preview-copy"><strong>Tu credencial digital</strong><span>Mostrar mi QR <ArrowRight aria-hidden="true" /></span></span></Link>
      : <p className="qr-card__unavailable">{membresia.estado === 'cargando' ? 'Consultando disponibilidad...' : membresia.estado === 'error' ? 'Necesitamos verificar tu membresía para habilitar el acceso.' : 'Mi QR requiere una membresía activa.'}</p>}
    <p className="qr-card__footnote">Tu código de acceso se actualiza cada minuto.</p>
  </aside>;
}

export function ResumenComprobantes({ membresia }) {
  const periodos = periodosConPago(membresia);
  if (!periodos.length) return null;
  return <DataCard className="receipts-panel" title="Comprobantes" description="Los comprobantes de tus períodos contratados.">
    <p>{periodos.length} {periodos.length === 1 ? 'período con pago registrado' : 'períodos con pago registrado'}</p>
    <div className="receipt-footer"><FileText aria-hidden="true" /><Link className="text-link" to="/comprobantes">Ver comprobantes <ArrowRight aria-hidden="true" /></Link></div>
  </DataCard>;
}
