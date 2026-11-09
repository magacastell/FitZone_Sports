import { useEffect, useRef, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { listarSedes, listarUsuarios, consultarAforo, crearSede, actualizarSede, consultarMembresia, consultarReporte } from '../../services/gerenciaService';
import { AppButton, AppLink, DataCard, PageHeading, StatusBadge } from '../../components/ui/FitZoneUI';
import './Gerencia.css';

const mensaje = (e) => e.status === 501 ? 'Esta consulta aún no está disponible en el servicio.' : e.status === 403 ? 'No tenés autorización para esta operación.' : e.status === 404 ? 'No se encontró el recurso solicitado.' : e.status === 409 ? 'Hay un conflicto con los datos existentes. Actualizá la consulta antes de continuar.' : e.status === 400 ? 'Revisá los datos ingresados.' : 'No pudimos completar la operación. Actualizá la consulta para verificar el resultado antes de reintentar.';

function useConsulta(cargar, dependencias = []) {
  const [estado, setEstado] = useState({ estado: 'cargando' });
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    let activo = true;
    setEstado({ estado: 'cargando' });
    cargar().then((datos) => { if (activo) setEstado({ estado: 'cargado', datos }); }, (e) => { if (activo) setEstado({ estado: 'error', mensaje: mensaje(e), status: e.status }); });
    return () => { activo = false; };
  }, [revision, ...dependencias]);
  return [estado, () => setRevision((v) => v + 1)];
}

function Resultado({ consulta, children }) {
  return consulta.estado === 'cargando' ? <p role="status">Consultando datos...</p> : consulta.estado === 'error' ? <p role={consulta.status === 501 ? 'status' : 'alert'}>{consulta.mensaje}</p> : children(consulta.datos);
}

export default function Gerencia({ vista = 'panel' }) {
  const { user, token } = useAuth();
  if (!user) return <p role="status">Cargando sesión...</p>;
  if (user.rol !== 'GERENTE') return <Navigate to="/perfil" replace />;
  return <Contenido key={`${token}:${vista}`} vista={vista} />;
}

function Contenido({ vista }) {
  const titulos = { panel: 'Panel general', sedes: 'Sedes', usuarios: 'Usuarios y membresías', reportes: 'Reportes' };
  return <div className="fitzone-ui gerencia"><div className="page-stack">
    <PageHeading eyebrow="GERENTE CENTRAL · TODA LA CADENA" title={titulos[vista]} description={vista === 'panel' ? 'Una mirada actual de FitZone, con datos verificables de todas las sedes.' : vista === 'reportes' ? 'Análisis histórico y detallado. Consultas sujetas a disponibilidad del servicio.' : 'Administración y consulta global, sin limitarse a la sede de tu perfil.'} />
    {vista === 'panel' ? <PanelGeneral /> : vista === 'sedes' ? <Sedes /> : vista === 'usuarios' ? <Usuarios /> : <Reportes />}
  </div></div>;
}

function PanelGeneral() {
  const [sedes, refrescar] = useConsulta(listarSedes);
  const [usuarios, refrescarUsuarios] = useConsulta(listarUsuarios);
  return <><div className="gerencia-kpis">
    <DataCard title="Sedes registradas"><Resultado consulta={sedes}>{(datos) => <strong className="gerencia-numero">{datos.length}</strong>}</Resultado><AppLink to="/gestion/sedes">Ver sedes</AppLink></DataCard>
    <DataCard title="Usuarios registrados"><Resultado consulta={usuarios}>{(datos) => <strong className="gerencia-numero">{datos.length}</strong>}</Resultado><p>Incluye cuentas comerciales e internas; no equivale a socios activos.</p><AppLink to="/gestion/usuarios">Consultar usuarios</AppLink></DataCard>
    </div><DataCard title="Estado actual por sede" description="Lecturas independientes de aforo. No representan accesos históricos ni un cierre financiero.">
      <AppButton onClick={() => { refrescar(); refrescarUsuarios(); }}>Actualizar panorama</AppButton>
      <Resultado consulta={sedes}>{(datos) => datos.length ? <div className="gerencia-grid">{datos.map((s) => <Ocupacion key={s.id} sede={s} />)}</div> : <p>No hay sedes registradas.</p>}</Resultado>
    </DataCard><DataCard title="Indicadores pendientes"><p>Membresías activas globales, accesos históricos y recaudación requieren agregaciones backend. No hay cifras disponibles para presentarlas.</p><AppLink to="/gestion/reportes">Ver disponibilidad de reportes</AppLink></DataCard></>;
}

function Ocupacion({ sede }) {
  const [aforo, refrescar] = useConsulta(() => consultarAforo(sede.id), [sede]);
  return <article className="gerencia-sede"><h3>{sede.nombre}</h3><p>{sede.direccion || 'Dirección no informada'}</p>
    <Resultado consulta={aforo}>{(dato) => <><strong>{dato.ocupacionActual} / {dato.capacidadMaxima} personas</strong><p>Lectura: {new Date(dato.calculadoEn).toLocaleString('es-AR', { timeZone: 'America/Argentina/Buenos_Aires' })}</p></>}</Resultado>
    <AppButton variant="secondary" onClick={refrescar}>Actualizar aforo de {sede.nombre}</AppButton>
  </article>;
}

function Sedes() {
  const [sedes, refrescar] = useConsulta(listarSedes);
  const [form, setForm] = useState({ nombre: '', direccion: '', capacidadMaxima: '' });
  const [id, setId] = useState(null);
  const [guardando, setGuardando] = useState(false);
  const [aviso, setAviso] = useState('');
  const enviando = useRef(false);
  const montado = useRef(false);
  useEffect(() => { montado.current = true; return () => { montado.current = false; }; }, []);
  const guardar = async (e) => {
    e.preventDefault();
    if (enviando.current || !form.nombre.trim() || !Number.isInteger(Number(form.capacidadMaxima)) || Number(form.capacidadMaxima) <= 0) return;
    enviando.current = true; setGuardando(true); setAviso('');
    try {
      const datos = { nombre: form.nombre.trim(), direccion: form.direccion, capacidadMaxima: Number(form.capacidadMaxima) };
      if (id === null) await crearSede(datos); else await actualizarSede(id, datos);
      if (montado.current) { setAviso('Sede guardada.'); setId(null); setForm({ nombre: '', direccion: '', capacidadMaxima: '' }); refrescar(); }
    } catch (error) { if (montado.current) setAviso(mensaje(error)); }
    finally { enviando.current = false; if (montado.current) setGuardando(false); }
  };
  return <><DataCard title={id === null ? 'Nueva sede' : 'Editar sede'} description="Datos de la sede. No modifica asignaciones de usuarios ni incorpora estados operativos ficticios.">
    <form onSubmit={guardar}><fieldset disabled={guardando}><div className="gerencia-form">
      <label>Nombre<input required maxLength={255} value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} /></label>
      <label>Dirección<input maxLength={255} value={form.direccion} onChange={(e) => setForm({ ...form, direccion: e.target.value })} /></label>
      <label>Capacidad máxima<input required type="number" min="1" step="1" value={form.capacidadMaxima} onChange={(e) => setForm({ ...form, capacidadMaxima: e.target.value })} /></label>
    </div><AppButton type="submit">{guardando ? 'Guardando...' : 'Guardar sede'}</AppButton>{id !== null && <AppButton type="button" variant="secondary" onClick={() => { setId(null); setForm({ nombre: '', direccion: '', capacidadMaxima: '' }); setAviso(''); }}>Cancelar edición</AppButton>}</fieldset></form>
    {aviso && <p role="status">{aviso}</p>}
  </DataCard><DataCard title="Todas las sedes" action={<AppButton disabled={guardando} onClick={refrescar}>Actualizar sedes</AppButton>}><Resultado consulta={sedes}>{(datos) => datos.length ? <div className="gerencia-grid">{datos.map((s) => <article className="gerencia-sede" key={s.id}><h3>{s.nombre}</h3><p>{s.direccion || 'Dirección no informada'}</p><p>Capacidad: {s.capacidadMaxima}</p><AppButton variant="secondary" disabled={guardando} onClick={() => { setId(s.id); setForm({ nombre: s.nombre, direccion: s.direccion || '', capacidadMaxima: String(s.capacidadMaxima) }); setAviso(''); }}>Editar {s.nombre}</AppButton></article>)}</div> : <p>No hay sedes registradas.</p>}</Resultado></DataCard></>;
}

function Usuarios() {
  const [usuarios, refrescar] = useConsulta(listarUsuarios);
  const [busqueda, setBusqueda] = useState('');
  const [id, setId] = useState('');
  const [seleccion, setSeleccion] = useState(null);
  return <><DataCard title="Consulta global de usuarios" action={<AppButton onClick={refrescar}>Actualizar usuarios</AppButton>}>
    <label>Buscar nombre, email o DNI<input type="search" value={busqueda} onChange={(e) => setBusqueda(e.target.value)} /></label>
    <Resultado consulta={usuarios}>{(datos) => <div className="gerencia-tabla" role="region" aria-label="Usuarios de toda la cadena" tabIndex={0}><table><thead><tr>{['Nombre','Email','DNI','Autoridad','Sede habitual / operativa','Cuenta'].map((t) => <th key={t} scope="col">{t}</th>)}</tr></thead><tbody>
      {datos.filter((u) => `${u.nombre} ${u.apellido} ${u.email} ${u.dni}`.toLocaleLowerCase().includes(busqueda.toLocaleLowerCase())).map((u) => <tr key={u.id}><td>{u.nombre} {u.apellido}</td><td>{u.email}</td><td>{u.dni}</td><td>{u.rol}</td><td>{u.sedeNombre || 'Sin asignar'}</td><td>{u.activo ? 'Habilitada' : 'Inactiva'}</td></tr>)}
    </tbody></table>{!datos.some((u) => `${u.nombre} ${u.apellido} ${u.email} ${u.dni}`.toLocaleLowerCase().includes(busqueda.toLocaleLowerCase())) && <p>No hay usuarios para esta búsqueda.</p>}</div>}</Resultado>
  </DataCard><DataCard title="Consultar membresía por ID" description="El backend no ofrece listado global ni búsqueda de membresía por usuario. El ID de usuario no es el ID de membresía.">
    <form onSubmit={(e) => { e.preventDefault(); if (Number.isInteger(Number(id)) && Number(id) > 0) setSeleccion(Number(id)); }}><label>ID de membresía<input type="number" required min="1" step="1" value={id} onChange={(e) => setId(e.target.value)} /></label><AppButton type="submit">Consultar membresía</AppButton></form>
    {seleccion && <DetalleMembresia key={seleccion} id={seleccion} />}
  </DataCard></>;
}

function DetalleMembresia({ id }) {
  const [consulta, refrescar] = useConsulta(() => consultarMembresia(id), [id]);
  return <><AppButton variant="secondary" onClick={refrescar}>Actualizar membresía</AppButton><Resultado consulta={consulta}>{(m) => {
    const periodo = m.periodoVigente || [...m.periodos].reverse().find((p) => p.estado !== 'CANCELADA');
    return <div><p>Membresía #{m.id} · Titular #{m.usuarioId}</p><StatusBadge>{m.estado}</StatusBadge><p>{periodo?.nombrePlan || 'Sin período contratado disponible'}</p><p>Referencia del último plan contratado: #{m.planId}</p>
      {periodo && <p>{m.periodoVigente ? 'Período vigente' : 'Último período contratado'}: {new Date(periodo.inicio).toLocaleString('es-AR', { timeZone: 'America/Argentina/Buenos_Aires' })} → {new Date(periodo.fin).toLocaleString('es-AR', { timeZone: 'America/Argentina/Buenos_Aires' })}</p>}
      <p>Períodos registrados: {m.periodos.length}</p></div>;
  }}</Resultado></>;
}

function Reportes() {
  const [sedes] = useConsulta(listarSedes);
  const [form, setForm] = useState({ desde: '', hasta: '', sedeId: '', tipo: 'ocupacion' });
  const [filtros, setFiltros] = useState(null);
  return <><DataCard title="Período y alcance" description="Elegí qué período y sedes querés analizar. Los datos históricos estarán disponibles al habilitar el servicio de reportes.">
    <form onSubmit={(e) => { e.preventDefault(); setFiltros({ ...form }); }}><div className="gerencia-form"><label>Desde<input type="date" required value={form.desde} onChange={(e) => setForm({ ...form, desde: e.target.value })} /></label><label>Hasta (sin incluir)<input type="date" required min={form.desde} value={form.hasta} onChange={(e) => setForm({ ...form, hasta: e.target.value })} /></label>
      <label>Sede<select value={form.sedeId} onChange={(e) => setForm({ ...form, sedeId: e.target.value })}><option value="">Toda la cadena</option>{sedes.estado === 'cargado' && sedes.datos.map((s) => <option key={s.id} value={s.id}>{s.nombre}</option>)}</select></label><label>Tipo<select value={form.tipo} onChange={(e) => setForm({ ...form, tipo: e.target.value })}><option value="ocupacion">Ocupación</option><option value="ingresos">Ingresos financieros</option></select></label></div><AppButton type="submit">Consultar reporte</AppButton></form>
    <Resultado consulta={sedes}>{() => null}</Resultado>
    {filtros ? <ResultadoReporte key={JSON.stringify(filtros)} filtros={filtros} /> : <p>Los reportes históricos están pendientes de backend. Seleccioná filtros para consultar su disponibilidad.</p>}
  </DataCard>
    <section aria-labelledby="resumen-periodo"><h3 id="resumen-periodo">Resumen del período</h3>
      <div className="gerencia-kpis gerencia-reportes-resumen">
        <DataCard title="Membresías" description="Evolución de las membresías en el período seleccionado."><p className="gerencia-datos-pendientes">Datos no disponibles: pendiente servicio de reportes.</p></DataCard>
        <DataCard title="Accesos" description="Ingresos históricos registrados en las sedes seleccionadas."><p className="gerencia-datos-pendientes">Datos no disponibles: pendiente servicio de reportes.</p></DataCard>
        <DataCard title="Financiero / recaudación" description="Cobros y devoluciones del período, con alcance por sede."><p className="gerencia-datos-pendientes">Datos no disponibles: pendiente servicio de reportes.</p></DataCard>
      </div>
    </section>
    <section aria-labelledby="evolucion-periodo"><h3 id="evolucion-periodo">Evolución</h3>
      <div className="gerencia-grid gerencia-reportes-series">
        <DataCard title="Accesos por período" description="Serie temporal de ingresos a las sedes."><div className="gerencia-reporte-vacio"><p>Datos no disponibles: pendiente servicio de reportes.</p><span>La evolución aparecerá cuando exista una serie histórica confirmada.</span></div></DataCard>
        <DataCard title="Recaudación por período" description="Serie temporal de cobros y devoluciones."><div className="gerencia-reporte-vacio"><p>Datos no disponibles: pendiente servicio de reportes.</p><span>Sin importes ni tendencias estimadas.</span></div></DataCard>
      </div>
    </section>
    <DataCard title="Comparación por sede" description="Resumen histórico comparable dentro del mismo período. No representa el aforo actual."><div className="gerencia-reporte-vacio"><p>Datos no disponibles: pendiente servicio de reportes.</p><span>El desglose por sede se mostrará cuando el servicio entregue indicadores comparables.</span></div></DataCard>
  </>;
}

function ResultadoReporte({ filtros }) {
  const [consulta, refrescar] = useConsulta(() => consultarReporte(filtros.tipo, { desde: `${filtros.desde}T00:00:00-03:00`, hasta: `${filtros.hasta}T00:00:00-03:00`, ...(filtros.sedeId && { sedeId: filtros.sedeId }) }));
  return <><AppButton variant="secondary" onClick={refrescar}>Actualizar reporte</AppButton><Resultado consulta={consulta}>{() => <p>El servicio respondió, pero la representación del reporte requiere integración antes de presentar resultados.</p>}</Resultado></>;
}
