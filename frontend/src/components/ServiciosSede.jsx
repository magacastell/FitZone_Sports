import { useEffect, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { CalendarDays, MapPin } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { consultarMiPerfil } from '../services/m1Service';
import { listarSedes } from '../services/sedesService';
import { listarClases } from '../services/m3Service';
import { listarCanchas } from '../services/m4Service';
import { AppButton, DataCard, EmptyState, PageHeading, StatusBadge } from './ui/FitZoneUI';
import './ServiciosSede.css';

export const imagenCancha = (tipo) => ({ PADEL: '/canchas/padel.svg', FUTBOL5: '/canchas/futbol5.svg', BASQUET: '/canchas/basquet.svg' })[tipo];

export default function ServiciosSede({ clases = false }) {
  const { token } = useAuth();
  return <VistaServicios key={`${token}:${clases}`} clases={clases} />;
}

function VistaServicios({ clases }) {
  const { user } = useAuth();
  const { puedeAbrirQr, membresia } = useOutletContext();
  const local = user.rol === 'RECEPCIONISTA';
  const [contexto, setContexto] = useState({ estado: 'cargando' });
  const [sedeId, setSedeId] = useState('');
  const [consulta, setConsulta] = useState(0);
  const [consultaSedes, setConsultaSedes] = useState(0);
  const [catalogo, setCatalogo] = useState({ estado: 'inicial' });
  const [tipo, setTipo] = useState('');
  const [fecha, setFecha] = useState('');
  const titulo = clases ? 'Clases' : 'Canchas';
  const permitido = local || user.rol === 'GERENTE' || (user.rol === 'USUARIO' && (!clases || puedeAbrirQr));

  useEffect(() => {
    if (!permitido) return;
    let activo = true;
    setContexto({ estado: 'cargando' }); setSedeId('');
    Promise.all([consultarMiPerfil(), local ? Promise.resolve([]) : listarSedes()]).then(([perfil, sedes]) => {
      if (!activo) return;
      const opciones = local ? [{ id: perfil.sedeId, nombre: perfil.sedeNombre }].filter((s) => s.id) : sedes;
      setContexto({ estado: 'cargado', sedes: opciones });
      // Habitual sólo como filtro inicial del Socio; nunca limita beneficios.
      if (local || puedeAbrirQr) setSedeId(opciones.some((s) => s.id === perfil.sedeId) ? String(perfil.sedeId) : '');
    }, () => { if (activo) setContexto({ estado: 'error' }); });
    return () => { activo = false; };
  }, [local, permitido, puedeAbrirQr, consultaSedes]);

  useEffect(() => {
    if (!permitido || !sedeId) { setCatalogo({ estado: 'inicial' }); return; }
    let activo = true;
    setCatalogo({ estado: 'cargando' });
    (clases ? listarClases(sedeId) : listarCanchas(sedeId)).then((datos) => {
      if (!activo) return;
      const items = clases ? datos?.items : datos;
      if (!Array.isArray(items) || items.some((item) => String(item.sedeId) !== sedeId)) {
        setCatalogo({ estado: 'error', mensaje: 'La respuesta no corresponde al catálogo esperado de esta sede.' }); return;
      }
      setCatalogo({ estado: 'cargado', items });
    }, (error) => { if (activo) setCatalogo({ estado: error.status === 501 ? 'pendiente' : 'error', mensaje: error.status === 403 ? 'No tenés autorización para consultar este servicio.' : 'No pudimos consultar el servicio. Intentá nuevamente.' }); });
    return () => { activo = false; };
  }, [clases, sedeId, permitido, consulta]);

  const items = catalogo.items?.filter((item) => (!tipo || item.tipo === tipo)
    && (!fecha || (item.inicio && new Date(item.inicio).toLocaleDateString('en-CA', { timeZone: 'America/Argentina/Buenos_Aires' }) === fecha))) || [];
  return <div className="fitzone-ui servicios-sede"><div className="page-stack">
    <PageHeading eyebrow={local ? 'ADMIN DE SEDE' : 'ACTIVIDADES FITZONE'} title={titulo}
      description={clases ? 'Encontrá tu próxima actividad y consultá la agenda de tu sede.' : 'Elegí dónde jugar. Consultá las canchas y sus horarios.'}
      actions={<StatusBadge tone="neutral">{local ? 'Operación local' : 'Consulta por sede'}</StatusBadge>} />
    {!permitido ? <DataCard title="Clases para socios"><p>{membresia.estado === 'cargando' ? 'Consultando tu membresía...' : 'Las reservas de clases requieren una membresía activa. Consultá su estado en Mi membresía.'}</p></DataCard> : <>
      <DataCard title={local ? 'Tu sede operativa' : 'Elegí una sede'} description={local ? 'Administrás únicamente la sede asignada a tu cuenta.' : puedeAbrirQr ? 'Tu sede habitual es el punto de partida. Podés consultar otra sede.' : 'Seleccioná la sede donde querés consultar disponibilidad.'}>
        {contexto.estado === 'cargando' && <p role="status">Consultando sedes...</p>}
        {contexto.estado === 'error' && <p role="alert">No pudimos cargar las sedes.</p>}
        {contexto.estado === 'cargado' && <div className="servicios-filtros"><label><span><MapPin aria-hidden="true" />Sede</span><select value={sedeId} disabled={local} onChange={(e) => { setSedeId(e.target.value); setTipo(''); setFecha(''); }}><option value="">Seleccioná una sede</option>{contexto.sedes.map((s) => <option key={s.id} value={s.id}>{s.nombre}</option>)}</select></label>
          {clases ? <label>Fecha<input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} /></label> : <label>Tipo de cancha<select value={tipo} onChange={(e) => setTipo(e.target.value)}><option value="">Todos los tipos</option>{[...new Set(catalogo.items?.map((c) => c.tipo) || [])].map((t) => <option key={t} value={t}>{t}</option>)}</select></label>}
        </div>}
        <AppButton type="button" onClick={() => contexto.estado === 'error' ? setConsultaSedes((v) => v + 1) : setConsulta((v) => v + 1)}>Actualizar consulta</AppButton>
      </DataCard>
      {!clases && !local && <ol className="servicios-pasos" aria-label="Recorrido de reserva"><li>Sede</li><li>Cancha</li><li>Fecha</li><li>Horario</li><li>Precio</li><li>Confirmación</li></ol>}
      <DataCard title={clases ? 'Agenda de clases' : local ? 'Recursos de tu sede' : 'Canchas disponibles'}>
        {!sedeId && <EmptyState icon={MapPin} title="Primero, tu sede" description="Elegí una sede para consultar su catálogo real." />}
        {sedeId && catalogo.estado === 'cargando' && <p role="status">Consultando {titulo.toLowerCase()}...</p>}
        {sedeId && catalogo.estado === 'error' && <p role="alert">{catalogo.mensaje}</p>}
        {sedeId && catalogo.estado === 'pendiente' && <EmptyState icon={clases ? CalendarDays : MapPin} title={clases ? 'La gestión de clases aún no está disponible' : 'Las reservas de canchas aún no están disponibles'} description="El servicio todavía no está habilitado. No se generaron reservas ni cargos. Podés volver a consultar más adelante." />}
        {sedeId && catalogo.estado === 'cargado' && (items.length ? <div className="servicios-grid">{items.map((item) => <article className="servicio-card" key={item.id}>
          {!clases && imagenCancha(item.tipo) && <img src={imagenCancha(item.tipo)} alt={`Ilustración de ${item.tipo}; no es una fotografía de esta cancha`} />}
          <h3>{item.nombre}</h3><StatusBadge>{clases ? item.estado : item.activa ? 'Activa' : 'Inactiva'}</StatusBadge>
          {clases ? <><p>{new Date(item.inicio).toLocaleString('es-AR', { timeZone: 'America/Argentina/Buenos_Aires' })} → {new Date(item.fin).toLocaleString('es-AR', { timeZone: 'America/Argentina/Buenos_Aires' })}</p><p>Referencia de instructor: {item.instructorId ?? 'No informada'}</p><p>Cupo: {item.cupo} · Lugares disponibles: {item.lugaresDisponibles}</p></> : <p>{item.tipo}</p>}
          <p>{clases ? 'Reservas y gestión pendientes de habilitación.' : 'Horarios y precio final pendientes de habilitación.'}</p>
        </article>)}</div> : <EmptyState icon={CalendarDays} title="Sin resultados" description="No hay resultados para los filtros seleccionados." />)}
      </DataCard>
      <p className="servicios-nota">{local ? 'La creación, edición y gestión estarán disponibles cuando el servicio se habilite.' : clases ? 'La disponibilidad y la confirmación de reservas dependen del servicio de clases.' : 'El precio final y cualquier beneficio de Socio serán confirmados por el servicio de reservas. No se calculan importes en esta pantalla.'}</p>
    </>}
  </div></div>;
}
