import { useEffect, useRef, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { listarSedes, listarUsuarios, consultarAforo, crearSede, actualizarSede, consultarMembresiaDeUsuario, consultarReporteAccesos, consultarReporteFinanciero } from '../../services/gerenciaService';
import { AppButton, AppLink, DataCard, PageHeading, StatusBadge } from '../../components/ui/FitZoneUI';
import ReportesGerencia from './ReportesGerencia';
import TarifasCancha from './TarifasCancha';
import { PERIODOS_RAPIDOS, fechaHoraLegible, formatearEntero, formatearPesos, hoyArgentina, parametrosDeRango } from './reportesUtils';
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
    <PageHeading eyebrow="GERENTE CENTRAL · TODA LA CADENA" title={titulos[vista]} description={vista === 'panel' ? 'Una mirada actual de FitZone, con datos verificables de todas las sedes.' : vista === 'reportes' ? 'Análisis histórico de toda la cadena: cobros, devoluciones y accesos por período y por sede.' : 'Administración y consulta global, sin limitarse a la sede de tu perfil.'} />
    {vista === 'panel' ? <PanelGeneral /> : vista === 'sedes' ? <Sedes /> : vista === 'usuarios' ? <Usuarios /> : <ReportesGerencia />}
  </div></div>;
}

function PanelGeneral() {
  const [sedes, refrescar] = useConsulta(listarSedes);
  const [usuarios, refrescarUsuarios] = useConsulta(listarUsuarios);
  return <><div className="gerencia-kpis">
    <DataCard title="Sedes registradas"><Resultado consulta={sedes}>{(datos) => <strong className="gerencia-numero">{datos.length}</strong>}</Resultado><AppLink to="/gestion/sedes">Ver sedes</AppLink></DataCard>
    <DataCard title="Usuarios registrados"><Resultado consulta={usuarios}>{(datos) => <strong className="gerencia-numero">{datos.length}</strong>}</Resultado><p>Incluye cuentas comerciales e internas; no equivale a socios activos.</p><AppLink to="/gestion/usuarios">Consultar usuarios</AppLink></DataCard>
    </div><ResumenReciente />
    <DataCard title="Estado actual por sede" description="Aforo en este momento, una lectura independiente por sede. No son accesos históricos ni un cierre financiero.">
      <AppButton onClick={() => { refrescar(); refrescarUsuarios(); }}>Actualizar panorama</AppButton>
      <Resultado consulta={sedes}>{(datos) => <AforoPorSede sedes={datos} />}</Resultado>
    </DataCard></>;
}

function AforoPorSede({ sedes }) {
  const [busqueda, setBusqueda] = useState('');
  const visibles = sedes.filter((s) => `${s.nombre} ${s.direccion || ''}`.toLocaleLowerCase().includes(busqueda.toLocaleLowerCase()));
  if (!sedes.length) return <p>No hay sedes registradas.</p>;
  return <>
    <label>Buscar sede<input type="search" value={busqueda} onChange={(e) => setBusqueda(e.target.value)} placeholder="Nombre o dirección" /></label>
    <div className="gerencia-tabla" role="region" aria-label="Aforo actual por sede" tabIndex={0}>
      <table><thead><tr><th>Sede</th><th>Aforo actual</th><th>Lectura</th><th><span className="gerencia-oculto">Acción</span></th></tr></thead>
        <tbody>{visibles.map((s) => <FilaAforo key={s.id} sede={s} />)}</tbody></table>
      {!visibles.length && <p>No hay sedes para esta búsqueda.</p>}
    </div>
  </>;
}

function FilaAforo({ sede }) {
  const [aforo, refrescar] = useConsulta(() => consultarAforo(sede.id), [sede]);
  const porcentaje = aforo.estado === 'cargado' && aforo.datos.capacidadMaxima ? Math.round((aforo.datos.ocupacionActual / aforo.datos.capacidadMaxima) * 100) : null;
  return <tr>
    <td><strong>{sede.nombre}</strong><br /><small>{sede.direccion || 'Dirección no informada'}</small></td>
    {aforo.estado === 'cargando' ? <td colSpan={2} role="status">Consultando...</td>
      : aforo.estado === 'error' ? <td colSpan={2} role="alert">{aforo.mensaje}</td>
        : <><td>{aforo.datos.ocupacionActual} / {aforo.datos.capacidadMaxima} personas{porcentaje !== null && ` (${porcentaje} %)`}</td>
          <td>{new Date(aforo.datos.calculadoEn).toLocaleString('es-AR', { timeZone: 'America/Argentina/Buenos_Aires' })}</td></>}
    <td><AppButton variant="secondary" onClick={refrescar}>Actualizar<span className="gerencia-oculto"> aforo de {sede.nombre}</span></AppButton></td>
  </tr>;
}

/** Resumen de los últimos 30 días con los mismos reportes de la pantalla Reportes (sin cifras propias). */
function ResumenReciente() {
  const [consulta, refrescar] = useConsulta(() => {
    const filtros = parametrosDeRango({ ...PERIODOS_RAPIDOS[1].rango(hoyArgentina()), sedeId: '' });
    return Promise.all([consultarReporteFinanciero(filtros), consultarReporteAccesos(filtros)]);
  });
  return <DataCard title="Últimos 30 días" description="Toda la cadena. Es el mismo cálculo de la pantalla Reportes, donde podés cambiar el período y filtrar por sede."
    action={<AppButton variant="secondary" onClick={refrescar}>Actualizar resumen</AppButton>}>
    <Resultado consulta={consulta}>{([finanzas, accesos]) => <>
      <div className="gerencia-indicadores">
        <div className="gerencia-indicador"><span>Cobros brutos</span><strong>{formatearPesos(finanzas.totales.cobrosBrutos)}</strong></div>
        <div className="gerencia-indicador"><span>Devoluciones</span><strong>{formatearPesos(finanzas.totales.devoluciones)}</strong></div>
        <div className={`gerencia-indicador${finanzas.totales.neto < 0 ? ' gerencia-indicador--negativo' : ''}`}><span>Neto</span><strong>{formatearPesos(finanzas.totales.neto)}</strong></div>
        <div className="gerencia-indicador"><span>Ingresos a las sedes</span><strong>{formatearEntero(accesos.resumen.totalIngresos)}</strong><small>{formatearEntero(accesos.resumen.usuariosUnicos)} personas distintas</small></div>
      </div>
      <p><small>Generado el {fechaHoraLegible(finanzas.generadoEn)}.</small></p>
    </>}</Resultado>
    <AppLink to="/gestion/reportes">Ver reportes completos</AppLink>
  </DataCard>;
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
  </DataCard><Resultado consulta={sedes}>{(datos) => <TarifasCancha sedes={datos} />}</Resultado><DataCard title="Todas las sedes" action={<AppButton disabled={guardando} onClick={refrescar}>Actualizar sedes</AppButton>}><Resultado consulta={sedes}>{(datos) => datos.length ? <div className="gerencia-grid">{datos.map((s) => <article className="gerencia-sede" key={s.id}><h3>{s.nombre}</h3><p>{s.direccion || 'Dirección no informada'}</p><p>Capacidad: {s.capacidadMaxima}</p><AppButton variant="secondary" disabled={guardando} onClick={() => { setId(s.id); setForm({ nombre: s.nombre, direccion: s.direccion || '', capacidadMaxima: String(s.capacidadMaxima) }); window.scrollTo?.({ top: 0, behavior: 'smooth' }); setAviso(''); }}>Editar {s.nombre}</AppButton></article>)}</div> : <p>No hay sedes registradas.</p>}</Resultado></DataCard></>;
}

function Usuarios() {
  const [usuarios, refrescar] = useConsulta(listarUsuarios);
  const [busqueda, setBusqueda] = useState('');
  const [seleccion, setSeleccion] = useState(null);
  const coincide = (u) => `${u.nombre} ${u.apellido} ${u.email} ${u.dni}`.toLocaleLowerCase().includes(busqueda.toLocaleLowerCase());
  return <>{seleccion && <DataCard title={`Membresía de ${seleccion.nombre} ${seleccion.apellido}`} description={seleccion.email}
    action={<AppButton variant="secondary" onClick={() => setSeleccion(null)}>Cerrar</AppButton>}>
    <DetalleMembresia key={seleccion.id} usuarioId={seleccion.id} />
  </DataCard>}<DataCard title="Consulta global de usuarios" description="Buscá a una persona y, si es socio o cliente, consultá su membresía directamente desde la fila."
    action={<AppButton onClick={refrescar}>Actualizar usuarios</AppButton>}>
    <label>Buscar nombre, email o DNI<input type="search" value={busqueda} onChange={(e) => setBusqueda(e.target.value)} /></label>
    <Resultado consulta={usuarios}>{(datos) => <div className="gerencia-tabla" role="region" aria-label="Usuarios de toda la cadena" tabIndex={0}><table><thead><tr>{['Nombre','Email','DNI','Autoridad','Sede habitual / operativa','Cuenta','Membresía'].map((t) => <th key={t} scope="col">{t}</th>)}</tr></thead><tbody>
      {datos.filter(coincide).map((u) => <tr key={u.id}><td>{u.nombre} {u.apellido}</td><td>{u.email}</td><td>{u.dni}</td><td>{u.rol}</td><td>{u.sedeNombre || 'Sin asignar'}</td><td>{u.activo ? 'Habilitada' : 'Inactiva'}</td>
        <td>{u.rol === 'USUARIO' ? <AppButton variant="secondary" onClick={() => { setSeleccion(u); window.scrollTo?.({ top: 0, behavior: 'smooth' }); }}>Ver membresía<span className="gerencia-oculto"> de {u.nombre} {u.apellido}</span></AppButton> : <small>No aplica</small>}</td></tr>)}
    </tbody></table>{!datos.some(coincide) && <p>No hay usuarios para esta búsqueda.</p>}</div>}</Resultado>
  </DataCard></>;
}

function DetalleMembresia({ usuarioId }) {
  const [consulta, refrescar] = useConsulta(() => consultarMembresiaDeUsuario(usuarioId), [usuarioId]);
  if (consulta.estado === 'error' && consulta.status === 404) return <><p>Este usuario todavía no contrató ninguna membresía.</p><AppButton variant="secondary" onClick={refrescar}>Actualizar membresía</AppButton></>;
  return <><AppButton variant="secondary" onClick={refrescar}>Actualizar membresía</AppButton><Resultado consulta={consulta}>{(m) => {
    const periodo = m.periodoVigente || [...m.periodos].reverse().find((p) => p.estado !== 'CANCELADA');
    const fecha = (valor) => new Date(valor).toLocaleString('es-AR', { timeZone: 'America/Argentina/Buenos_Aires' });
    return <div><StatusBadge>{m.estado}</StatusBadge><p><strong>{periodo?.nombrePlan || 'Sin período contratado disponible'}</strong></p>
      {periodo && <p>{m.periodoVigente ? 'Período vigente' : 'Último período contratado'}: {fecha(periodo.inicio)} → {fecha(periodo.fin)}</p>}
      <p>Períodos registrados: {m.periodos.length}</p></div>;
  }}</Resultado></>;
}
