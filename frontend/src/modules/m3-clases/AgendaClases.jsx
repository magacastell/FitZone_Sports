import { useEffect, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { CalendarDays, MapPin } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { consultarMiPerfil } from '../../services/m1Service';
import { listarSedes } from '../../services/sedesService';
import { cancelarClase, listarAgenda } from '../../services/m3Service';
import { AppButton, AppLink, DataCard, EmptyState, PageHeading } from '../../components/ui/FitZoneUI';
import { ActividadClasesPanel, AvisoReservaClase, DialogoReservaClase, useActividadClases, useGestionReservasClase } from './ReservasClases';
import TarjetaClase from './TarjetaClase';
import FormularioClase from './FormularioClase';
import AsistentesClase from './AsistentesClase';
import { aValorLocal, rangoDelDia, situacionEnClase } from './claseUtils';
import './AgendaClases.css';

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
  const [desdeProximas, setDesdeProximas] = useState(() => new Date().toISOString());
  const [pagina, setPagina] = useState(0);
  const [agenda, setAgenda] = useState({ estado: 'inicial' });
  const [refresco, setRefresco] = useState(0);
  const [formulario, setFormulario] = useState(null);
  const [asistentes, setAsistentes] = useState(null);
  const [verReservas, setVerReservas] = useState(false);
  const actividad = useActividadClases(permitido && puedeReservar, refresco);
  const gestion = useGestionReservasClase(() => setRefresco((v) => v + 1));
  const { aviso, setAviso, ocupada, modal, ejecutar, reservar, anotarse, salirDeLaEspera, cancelarReserva, responder, cerrarModal } = gestion;

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
    setAgenda({ estado: 'cargando' });
    const rango = fecha ? rangoDelDia(fecha) : { desde: desdeProximas };
    listarAgenda({ sedeId, page: pagina, ...rango }).then((datos) => {
      if (!activo) return;
      if (!Array.isArray(datos?.items)) { setAgenda({ estado: 'error', mensaje: 'La respuesta no corresponde a la agenda esperada.' }); return; }
      setAgenda({ estado: 'cargado', items: datos.items, totalPages: datos.totalPages, total: datos.totalElements });
    }, (error) => {
      if (activo) setAgenda({ estado: 'error', mensaje: error.status === 403 ? 'No tenés autorización para consultar esta sede.' : error.message });
    });
    return () => { activo = false; };
  }, [permitido, sedeId, fecha, desdeProximas, pagina, refresco]);

  const cancelarLaClase = (clase, motivo) => ejecutar(() => cancelarClase(clase.id, motivo), `Cancelaste la clase ${clase.nombre}.`);

  const cambiarSede = (valor) => { setSedeId(valor); setPagina(0); setFormulario(null); setAsistentes(null); };
  const cambiarFecha = (dia) => {
    setFecha(dia);
    setPagina(0);
    if (!dia) setDesdeProximas(new Date().toISOString());
  };
  const actualizar = () => {
    if (!fecha) {
      setDesdeProximas(new Date().toISOString());
      setPagina(0);
    }
    setRefresco((v) => v + 1);
  };
  const formularioGuardado = (clase, editando) => {
    setFormulario(null);
    setAviso({ tipo: 'ok', texto: editando ? 'La clase se actualizó.' : `Creaste la clase ${clase.nombre}.` });
    if (String(clase.sedeId) !== sedeId) cambiarSede(String(clase.sedeId));
    setRefresco((v) => v + 1);
  };

  const encabezado = (
    <PageHeading eyebrow={esRecepcion ? 'ADMIN DE SEDE' : esGerente ? 'ADMINISTRACIÓN GLOBAL' : 'ACTIVIDADES FITZONE'} title="Clases"
      description={esStaff ? 'Administrá la agenda de clases: horarios, instructores, cupos y asistentes.' : 'Reservá tu lugar en las clases grupales de tu membresía.'}
      actions={permitido && <>
        {esStaff && <AppButton onClick={() => { setVerReservas(false); setAsistentes(null); setFormulario({}); }}>Nueva clase</AppButton>}
        {esGerente && <AppButton type="button" variant="secondary" disabled={ocupada}
          onClick={() => setVerReservas(!verReservas)}>{verReservas ? 'Volver a clases' : 'Mis reservas'}</AppButton>}
        {!esStaff && <AppLink to="/mis-reservas#clases">Mis reservas</AppLink>}
      </>} />
  );

  if (!permitido) {
    return <div className="fitzone-ui agenda-clases"><div className="page-stack">{encabezado}
      <DataCard title="Clases para socios"><p>{membresia.estado === 'cargando' ? 'Consultando tu membresía...' : 'Las reservas de clases requieren una membresía activa. Consultá su estado en Mi membresía.'}</p></DataCard>
    </div></div>;
  }

  const items = agenda.items ?? [];
  const hoy = aValorLocal(new Date()).slice(0, 10);

  return (
    <div className="fitzone-ui agenda-clases"><div className="page-stack">
      {encabezado}
      {!modal && <AvisoReservaClase aviso={aviso} />}
      {verReservas ? (
        <ActividadClasesPanel actividad={actividad} gestion={gestion} actualizar={actualizar} />
      ) : <>
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
            <label><span><CalendarDays aria-hidden="true" />Día (opcional)</span>
              <input type="date" min={esStaff ? undefined : hoy} value={fecha} onChange={(e) => {
                const dia = e.target.value;
                if (dia && !esStaff && dia < hoy) return;
                cambiarFecha(dia);
              }} />
            </label>
          </div>
        )}
        <div className="agenda-filtros__acciones">
          <AppButton type="button" variant="secondary" onClick={actualizar}>Actualizar</AppButton>
          {fecha && <AppButton type="button" variant="secondary" onClick={() => cambiarFecha('')}>Quitar filtro</AppButton>}
        </div>
      </DataCard>

      {formulario && <FormularioClase key={formulario.clase?.id ?? 'nueva'} claseEditando={formulario.clase} esGerente={esGerente}
        sedes={contexto.sedes} sedeInicial={sedeId} onGuardada={formularioGuardado} onCancelar={() => setFormulario(null)} />}
      {asistentes && <AsistentesClase clase={asistentes} refresco={refresco} onCerrar={() => setAsistentes(null)} />}

      <DataCard title={fecha ? 'Agenda de clases' : 'Próximas clases'}
        description={fecha && agenda.estado === 'cargado' ? `${agenda.total} ${agenda.total === 1 ? 'clase' : 'clases'} para el día elegido` : undefined}>
        {!sedeId && <EmptyState icon={MapPin} title="Primero, la sede" description="Elegí una sede para ver su agenda." />}
        {sedeId && agenda.estado === 'cargando' && <p role="status">Consultando la agenda...</p>}
        {sedeId && agenda.estado === 'error' && <p role="alert">{agenda.mensaje}</p>}
        {sedeId && agenda.estado === 'cargado' && (items.length === 0
          ? <EmptyState icon={CalendarDays} title="Sin clases"
            description={fecha ? 'No hay clases ese día en esta sede.' : 'No hay próximas clases en esta sede.'} />
          : <>
            <div className="agenda-grid">
              {items.map((clase) => (
                <TarjetaClase key={clase.id} clase={clase} situacion={situacionEnClase(clase.id, actividad)}
                  puedeReservar={puedeReservar} esStaff={esStaff} ocupada={ocupada}
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
      </>}
      <DialogoReservaClase gestion={gestion} onVerReservas={esGerente ? () => { cerrarModal(); setVerReservas(true); } : undefined} />
    </div></div>
  );
}
