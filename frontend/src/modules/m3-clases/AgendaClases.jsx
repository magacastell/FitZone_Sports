import { useEffect, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { CalendarDays, MapPin } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { consultarMiPerfil } from '../../services/m1Service';
import { listarSedes } from '../../services/sedesService';
import {
  cancelarClase, cancelarReservaClase, consultarMiActividadClases, entrarEnEspera, listarAgenda, reservarClase,
  responderOferta, salirDeEspera,
} from '../../services/m3Service';
import { AppButton, DataCard, EmptyState, PageHeading, StatusBadge } from '../../components/ui/FitZoneUI';
import TarjetaClase from './TarjetaClase';
import FormularioClase from './FormularioClase';
import AsistentesClase from './AsistentesClase';
import { formatearFechaHora, rangoDelDia, situacionEnClase } from './claseUtils';
import './AgendaClases.css';

const ACTIVIDAD_VACIA = { reservas: [], listaEspera: [], ofertas: [] };

export default function AgendaClases() {
  const { token } = useAuth();
  return <VistaAgenda key={token} />;
}

function VistaAgenda() {
  const { user } = useAuth();
  const { puedeAbrirQr, membresia } = useOutletContext();
  const esRecepcion = user.rol === 'RECEPCIONISTA';
  const esGerente = user.rol === 'GERENTE';
  const esStaff = esRecepcion || esGerente;
  const puedeReservar = user.rol === 'USUARIO' || esGerente;
  const permitido = esStaff || (user.rol === 'USUARIO' && puedeAbrirQr);

  const [contexto, setContexto] = useState({ estado: 'cargando', sedes: [] });
  const [sedeId, setSedeId] = useState('');
  const [fecha, setFecha] = useState('');
  const [pagina, setPagina] = useState(0);
  const [agenda, setAgenda] = useState({ estado: 'inicial' });
  const [actividad, setActividad] = useState(ACTIVIDAD_VACIA);
  const [aviso, setAviso] = useState(null);
  const [accion, setAccion] = useState(null);
  const [refresco, setRefresco] = useState(0);
  const [formulario, setFormulario] = useState(null);
  const [asistentes, setAsistentes] = useState(null);

  // Recepción administra solo la sede de su perfil; el resto elige entre todas, empezando por la habitual.
  useEffect(() => {
    if (!permitido) return;
    let activo = true;
    Promise.all([consultarMiPerfil(), esRecepcion ? Promise.resolve([]) : listarSedes()]).then(([perfil, sedes]) => {
      if (!activo) return;
      const opciones = esRecepcion ? [{ id: perfil.sedeId, nombre: perfil.sedeNombre }].filter((s) => s.id) : sedes;
      setContexto({ estado: 'cargado', sedes: opciones });
      setSedeId(opciones.some((s) => s.id === perfil.sedeId) ? String(perfil.sedeId) : (opciones[0] ? String(opciones[0].id) : ''));
    }, () => { if (activo) setContexto({ estado: 'error', sedes: [] }); });
    return () => { activo = false; };
  }, [esRecepcion, permitido]);

  useEffect(() => {
    if (!permitido || !sedeId) { setAgenda({ estado: 'inicial' }); return; }
    let activo = true;
    setAgenda((a) => (a.estado === 'cargado' ? { ...a, recargando: true } : { estado: 'cargando' }));
    listarAgenda({ sedeId, page: pagina, ...(fecha ? rangoDelDia(fecha) : {}) }).then((datos) => {
      if (!activo) return;
      if (!Array.isArray(datos?.items)) { setAgenda({ estado: 'error', mensaje: 'La respuesta no corresponde a la agenda esperada.' }); return; }
      setAgenda({ estado: 'cargado', items: datos.items, totalPages: datos.totalPages, total: datos.totalElements });
    }, (error) => {
      if (activo) setAgenda({ estado: 'error', mensaje: error.status === 403 ? 'No tenés autorización para consultar esta sede.' : error.message });
    });
    return () => { activo = false; };
  }, [permitido, sedeId, fecha, pagina, refresco]);

  useEffect(() => {
    if (!permitido || !puedeReservar) return;
    let activo = true;
    consultarMiActividadClases().then((datos) => { if (activo) setActividad(datos); }, () => { /* sin actividad propia, la agenda igual se muestra */ });
    return () => { activo = false; };
  }, [permitido, puedeReservar, refresco]);

  const ejecutar = async (clave, accionAsync, textoExito) => {
    setAccion(clave);
    setAviso(null);
    try {
      await accionAsync();
      setAviso({ tipo: 'ok', texto: textoExito });
    } catch (error) {
      setAviso({ tipo: 'error', texto: error.message || 'No se pudo completar la acción.' });
    } finally {
      setAccion(null);
      setRefresco((v) => v + 1);
    }
  };

  const reservar = (clase) => ejecutar(clase.id, () => reservarClase(clase.id), `Reservaste ${clase.nombre}.`);
  const anotarse = (clase) => ejecutar(clase.id, () => entrarEnEspera(clase.id), `Te anotaste en la lista de espera de ${clase.nombre}.`);
  const salirDeLaEspera = (clase) => ejecutar(clase.id, () => salirDeEspera(clase.id), 'Saliste de la lista de espera.');
  const cancelarReserva = (clase, reserva) => {
    if (!window.confirm(`¿Cancelar tu reserva de ${clase.nombre}?`)) return;
    ejecutar(clase.id, () => cancelarReservaClase(clase.id, reserva.id), 'Cancelaste tu reserva.');
  };
  const responder = (clase, oferta, respuesta) => ejecutar(clase.id, () => responderOferta(clase.id, oferta.id, respuesta),
    respuesta === 'ACEPTAR' ? `Aceptaste el lugar: ${clase.nombre} quedó reservada.` : 'Rechazaste el lugar.');
  const cancelarLaClase = (clase, motivo) => ejecutar(clase.id, () => cancelarClase(clase.id, motivo), `Cancelaste la clase ${clase.nombre}.`);

  const cambiarSede = (valor) => { setSedeId(valor); setPagina(0); setFormulario(null); setAsistentes(null); };
  const formularioGuardado = (clase, editando) => {
    setFormulario(null);
    setAviso({ tipo: 'ok', texto: editando ? 'La clase se actualizó.' : `Creaste la clase ${clase.nombre}.` });
    if (String(clase.sedeId) !== sedeId) cambiarSede(String(clase.sedeId));
    setRefresco((v) => v + 1);
  };

  const encabezado = (
    <PageHeading eyebrow={esRecepcion ? 'ADMIN DE SEDE' : esGerente ? 'ADMINISTRACIÓN GLOBAL' : 'ACTIVIDADES FITZONE'} title="Clases"
      description={esStaff ? 'Administrá la agenda de clases: horarios, instructores, cupos y asistentes.' : 'Reservá tu lugar en las clases grupales de tu membresía.'}
      actions={esStaff && permitido ? <AppButton onClick={() => { setAsistentes(null); setFormulario({}); }}>Nueva clase</AppButton> : <StatusBadge tone="neutral">Incluidas en tu membresía</StatusBadge>} />
  );

  if (!permitido) {
    return <div className="fitzone-ui agenda-clases"><div className="page-stack">{encabezado}
      <DataCard title="Clases para socios"><p>{membresia.estado === 'cargando' ? 'Consultando tu membresía...' : 'Las reservas de clases requieren una membresía activa. Consultá su estado en Mi membresía.'}</p></DataCard>
    </div></div>;
  }

  const hayActividad = actividad.reservas.length + actividad.listaEspera.length + actividad.ofertas.length > 0;
  const items = agenda.items ?? [];

  return (
    <div className="fitzone-ui agenda-clases"><div className="page-stack">
      {encabezado}
      {aviso && <p className={`agenda-aviso agenda-aviso--${aviso.tipo}`} role={aviso.tipo === 'error' ? 'alert' : 'status'}>{aviso.texto}</p>}

      {puedeReservar && hayActividad && (
        <DataCard title="Mis clases" description="Tus reservas, tu lugar en las listas de espera y los lugares que se te ofrecieron.">
          <ul className="mis-clases">
            {actividad.ofertas.map(({ oferta, clase }) => (
              <li key={`o${oferta.id}`} className="mis-clases__oferta">
                <div><strong>{clase.nombre}</strong><span>{formatearFechaHora(clase.inicio)}</span>
                  <StatusBadge tone="warning">Se liberó un lugar: aceptalo antes del {formatearFechaHora(oferta.venceEn)}</StatusBadge></div>
                <div>
                  <AppButton size="sm" disabled={accion === clase.id} onClick={() => responder(clase, oferta, 'ACEPTAR')}>Aceptar</AppButton>
                  <AppButton size="sm" variant="secondary" disabled={accion === clase.id} onClick={() => responder(clase, oferta, 'RECHAZAR')}>Rechazar</AppButton>
                </div>
              </li>
            ))}
            {actividad.reservas.map(({ reserva, clase }) => (
              <li key={`r${reserva.id}`}>
                <div><strong>{clase.nombre}</strong><span>{formatearFechaHora(clase.inicio)}</span><StatusBadge tone="success">Reservada</StatusBadge></div>
                <AppButton size="sm" variant="secondary" disabled={accion === clase.id} onClick={() => cancelarReserva(clase, reserva)}>Cancelar reserva</AppButton>
              </li>
            ))}
            {actividad.listaEspera.filter(({ entrada }) => entrada.estado === 'EN_ESPERA').map(({ entrada, clase }) => (
              <li key={`e${entrada.id}`}>
                <div><strong>{clase.nombre}</strong><span>{formatearFechaHora(clase.inicio)}</span><StatusBadge tone="info">En espera, posición {entrada.posicion}</StatusBadge></div>
                <AppButton size="sm" variant="secondary" disabled={accion === clase.id} onClick={() => salirDeLaEspera(clase)}>Salir de la lista</AppButton>
              </li>
            ))}
          </ul>
        </DataCard>
      )}

      <DataCard title={esRecepcion ? 'Tu sede operativa' : 'Elegí una sede'}
        description={esRecepcion ? 'Administrás únicamente la sede asignada a tu cuenta.' : 'Podés ver y reservar clases en cualquier sede.'}>
        {contexto.estado === 'cargando' && <p role="status">Consultando sedes...</p>}
        {contexto.estado === 'error' && <p role="alert">No pudimos cargar las sedes.</p>}
        {contexto.estado === 'cargado' && (
          <div className="agenda-filtros">
            <label><span><MapPin aria-hidden="true" />Sede</span>
              <select value={sedeId} disabled={esRecepcion} onChange={(e) => cambiarSede(e.target.value)}>
                <option value="">Seleccioná una sede</option>
                {contexto.sedes.map((s) => <option key={s.id} value={s.id}>{s.nombre}</option>)}
              </select>
            </label>
            <label><span><CalendarDays aria-hidden="true" />Día</span>
              <input type="date" value={fecha} onChange={(e) => { setFecha(e.target.value); setPagina(0); }} />
            </label>
          </div>
        )}
        <AppButton type="button" variant="secondary" onClick={() => setRefresco((v) => v + 1)}>Actualizar</AppButton>
      </DataCard>

      {formulario && <FormularioClase key={formulario.clase?.id ?? 'nueva'} claseEditando={formulario.clase} esGerente={esGerente}
        sedes={contexto.sedes} sedeInicial={sedeId} onGuardada={formularioGuardado} onCancelar={() => setFormulario(null)} />}
      {asistentes && <AsistentesClase clase={asistentes} refresco={refresco} onCerrar={() => setAsistentes(null)} />}

      <DataCard title="Agenda de clases" description={agenda.estado === 'cargado' ? `${agenda.total} ${agenda.total === 1 ? 'clase' : 'clases'} desde hoy` : undefined}>
        {!sedeId && <EmptyState icon={MapPin} title="Primero, la sede" description="Elegí una sede para ver su agenda." />}
        {sedeId && agenda.estado === 'cargando' && <p role="status">Consultando la agenda...</p>}
        {sedeId && agenda.estado === 'error' && <p role="alert">{agenda.mensaje}</p>}
        {sedeId && agenda.estado === 'cargado' && (items.length === 0
          ? <EmptyState icon={CalendarDays} title="Sin clases" description={fecha ? 'No hay clases ese día en esta sede.' : 'Todavía no hay clases programadas en esta sede.'} />
          : <>
            <div className="agenda-grid">
              {items.map((clase) => (
                <TarjetaClase key={clase.id} clase={clase} situacion={situacionEnClase(clase.id, actividad)}
                  puedeReservar={puedeReservar} esStaff={esStaff} ocupada={accion === clase.id}
                  onReservar={reservar} onCancelarReserva={cancelarReserva} onAnotarse={anotarse} onSalirEspera={salirDeLaEspera}
                  onResponder={responder} onCancelarClase={cancelarLaClase}
                  onEditar={(c) => { setAsistentes(null); setFormulario({ clase: c }); }}
                  onVerAsistentes={(c) => { setFormulario(null); setAsistentes(c); }} />
              ))}
            </div>
            {agenda.totalPages > 1 && (
              <nav className="agenda-paginacion" aria-label="Paginación de la agenda">
                <AppButton size="sm" variant="secondary" disabled={pagina === 0} onClick={() => setPagina(pagina - 1)}>Anterior</AppButton>
                <span>Página {pagina + 1} de {agenda.totalPages}</span>
                <AppButton size="sm" variant="secondary" disabled={pagina + 1 >= agenda.totalPages} onClick={() => setPagina(pagina + 1)}>Siguiente</AppButton>
              </nav>
            )}
          </>)}
      </DataCard>
      <p className="agenda-nota">Las reservas y la lista de espera cierran 48 horas antes de cada clase. Cancelando con 2 horas o más de anticipación no hay penalidad.</p>
    </div></div>
  );
}
