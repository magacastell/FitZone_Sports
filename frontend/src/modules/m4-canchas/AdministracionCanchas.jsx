
import { useEffect, useState } from 'react';
import { AlertCircle, CheckCircle2, Plus, RefreshCw, Wrench } from 'lucide-react';

import { useAuth } from '../../context/AuthContext';
import { consultarMiPerfil } from '../../services/m1Service';
import { listarSedes } from '../../services/sedesService';

import {
  listarCanchas,
  listarTiposCancha,
  crearCancha,
  actualizarCancha,
  crearTurno,
  crearMantenimiento,
  listarMantenimientos,
  eliminarMantenimiento,
  crearTipoCancha,
  actualizarTipoCancha,
  actualizarRecargoPico,
} from '../../services/m4Service';

import {
  AppButton,
  DataCard,
  EmptyState,
  PageHeading,
  StatusBadge,
} from '../../components/ui/FitZoneUI';

import './AdministracionCanchas.css';

// ============================================
// UTILIDADES
// ============================================

function mensajeError(error) {
  if (error.status === 400) return error.message || 'Revisá los datos ingresados.';
  if (error.status === 401) return 'Tu sesión venció. Volvé a iniciar sesión.';
  if (error.status === 403) return 'El backend denegó esta operación. Verificá los permisos de tu cuenta y la sede asignada.';
  if (error.status === 404) return 'No encontramos el recurso solicitado.';
  if (error.status === 409) return error.message || 'La operación entra en conflicto con una reserva, horario o mantenimiento existente.';
  return 'No pudimos completar la operación. Intentá nuevamente.';
}

function aFechaHoraArgentina(valor) {
  if (!valor) return null;

  // Los formularios usan datetime-local y se interpretan como hora argentina.
  return `${valor}:00-03:00`;
}

function sumarMinutosArgentina(fecha, hora, minutos) {
  const inicioTexto = `${fecha}T${hora}:00-03:00`;
  const inicio = new Date(inicioTexto);

  if (Number.isNaN(inicio.getTime())) {
    throw new Error('La fecha y la hora ingresadas no son válidas.');
  }

  const fin = new Date(inicio.getTime() + minutos * 60 * 1000);

  const partes = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Argentina/Buenos_Aires',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(fin);

  const obtener = (tipo) => partes.find((parte) => parte.type === tipo)?.value;

  const fechaFin = `${obtener('year')}-${obtener('month')}-${obtener('day')}`;
  const horaFin = `${obtener('hour')}:${obtener('minute')}`;

  return `${fechaFin}T${horaFin}:00-03:00`;
}

function formatoFechaHora(valor) {
  if (!valor) return 'Sin fecha';

  return new Date(valor).toLocaleString('es-AR', {
    timeZone: 'America/Argentina/Buenos_Aires',
    dateStyle: 'short',
    timeStyle: 'short',
  });
}

function formatoPrecio(valor) {
  if (valor == null) return 'Sin configurar';

  return Number(valor).toLocaleString('es-AR', {
    style: 'currency',
    currency: 'ARS',
  });
}

function hoyLocal() {
  const partes = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Argentina/Buenos_Aires',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date());

  const obtener = (tipo) => partes.find((parte) => parte.type === tipo)?.value;

  return `${obtener('year')}-${obtener('month')}-${obtener('day')}`;
}

const FORM_CANCHA_VACIO = {
  nombre: '',
  tipo: '',
};

const FORM_TURNO_VACIO = {
  fecha: hoyLocal(),
  hora: '10:00',
};

const FORM_MANTENIMIENTO_VACIO = {
  inicio: '',
  fin: '',
  motivo: '',
};

// ============================================
// COMPONENTE
// ============================================

export default function AdministracionCanchas() {
  const { user, token } = useAuth();

  const esRecepcion = user?.rol === 'RECEPCIONISTA';
  const esGerente = user?.rol === 'GERENTE';
  const autorizado = esRecepcion || esGerente;

  const [contexto, setContexto] = useState({
    estado: 'cargando',
    sedes: [],
  });

  const [sedeId, setSedeId] = useState('');

  const [canchas, setCanchas] = useState({
    estado: 'inicial',
    items: [],
  });

  const [tipos, setTipos] = useState({
    estado: 'cargando',
    items: [],
  });

  const [canchaId, setCanchaId] = useState('');
  const [mantenimientos, setMantenimientos] = useState({
    estado: 'inicial',
    items: [],
  });

  const [formNuevaCancha, setFormNuevaCancha] = useState(FORM_CANCHA_VACIO);
  const [formEdicion, setFormEdicion] = useState(FORM_CANCHA_VACIO);
  const [canchaActiva, setCanchaActiva] = useState(true);

  const [formTurno, setFormTurno] = useState(FORM_TURNO_VACIO);
  const [formMantenimiento, setFormMantenimiento] = useState(FORM_MANTENIMIENTO_VACIO);

  const [tipoId, setTipoId] = useState('');
  const [tipoNombre, setTipoNombre] = useState('');
  const [tipoPrecio, setTipoPrecio] = useState('');

  const [recargoPico, setRecargoPico] = useState('');

  const [aviso, setAviso] = useState(null);
  const [accion, setAccion] = useState(null);
  const [refresco, setRefresco] = useState(0);

  const canchaSeleccionada = canchas.items.find(
    (cancha) => String(cancha.id) === String(canchaId),
  );

  // ==========================================
  // CARGA INICIAL DE PERFIL, SEDES Y TIPOS
  // ==========================================

  useEffect(() => {
    if (!token || !autorizado) return;

    let activo = true;

    setContexto({ estado: 'cargando', sedes: [] });
    setSedeId('');

    Promise.all([
      consultarMiPerfil(),
      esRecepcion ? Promise.resolve([]) : listarSedes(),
      listarTiposCancha(),
    ])
      .then(([perfil, sedes, tiposRespuesta]) => {
        if (!activo) return;

        const opciones = esRecepcion
          ? [{ id: perfil.sedeId, nombre: perfil.sedeNombre }].filter((s) => s.id)
          : sedes;

        setContexto({
          estado: 'cargado',
          sedes: opciones,
        });

        const inicial = opciones.find(
          (sede) => String(sede.id) === String(perfil.sedeId),
        ) || opciones[0];

        setSedeId(inicial ? String(inicial.id) : '');

        setTipos({
          estado: 'cargado',
          items: Array.isArray(tiposRespuesta) ? tiposRespuesta : [],
        });
      })
      .catch((error) => {
        if (!activo) return;

        setContexto({
          estado: 'error',
          sedes: [],
          mensaje: mensajeError(error),
        });

        setTipos({
          estado: 'error',
          items: [],
          mensaje: mensajeError(error),
        });
      });

    return () => {
      activo = false;
    };
  }, [token, autorizado, esRecepcion]);

  // ==========================================
  // CARGAR CANCHAS DE LA SEDE
  // ==========================================

  useEffect(() => {
    if (!token || !sedeId || !autorizado) {
      setCanchas({ estado: 'inicial', items: [] });
      setCanchaId('');
      return;
    }

    let activo = true;

    setCanchas({ estado: 'cargando', items: [] });

    listarCanchas(sedeId)
      .then((datos) => {
        if (!activo) return;

        if (!Array.isArray(datos)) {
          setCanchas({
            estado: 'error',
            items: [],
            mensaje: 'El catálogo de canchas devolvió un formato inesperado.',
          });
          return;
        }

        if (datos.some((cancha) => String(cancha.sedeId) !== String(sedeId))) {
          setCanchas({
            estado: 'error',
            items: [],
            mensaje: 'El backend devolvió canchas de una sede diferente.',
          });
          return;
        }

        setCanchas({
          estado: 'cargado',
          items: datos,
        });

        setCanchaId((actual) => {
          if (datos.some((cancha) => String(cancha.id) === String(actual))) {
            return actual;
          }

          return datos[0] ? String(datos[0].id) : '';
        });

        const tarifa = datos.find((cancha) => cancha.recargoPico != null);

        if (tarifa && esGerente) {
          setRecargoPico(String(tarifa.recargoPico));
        }
      })
      .catch((error) => {
        if (activo) {
          setCanchas({
            estado: 'error',
            items: [],
            mensaje: mensajeError(error),
          });
        }
      });

    return () => {
      activo = false;
    };
  }, [token, sedeId, autorizado, refresco, esGerente]);

  // ==========================================
  // CARGAR FORMULARIO DE EDICIÓN
  // ==========================================

  useEffect(() => {
    if (!canchaSeleccionada) {
      setFormEdicion(FORM_CANCHA_VACIO);
      setCanchaActiva(true);
      return;
    }

    setFormEdicion({
      nombre: canchaSeleccionada.nombre || '',
      tipo: canchaSeleccionada.tipo || '',
    });

    setCanchaActiva(Boolean(canchaSeleccionada.activa));
  }, [canchaSeleccionada]);

  // ==========================================
  // CARGAR MANTENIMIENTOS DE LA CANCHA
  // ==========================================

  useEffect(() => {
    if (!canchaId || !autorizado) {
      setMantenimientos({ estado: 'inicial', items: [] });
      return;
    }

    let activo = true;

    setMantenimientos({ estado: 'cargando', items: [] });

    listarMantenimientos(canchaId)
      .then((datos) => {
        if (!activo) return;

        setMantenimientos({
          estado: 'cargado',
          items: Array.isArray(datos) ? datos : [],
        });
      })
      .catch((error) => {
        if (activo) {
          setMantenimientos({
            estado: 'error',
            items: [],
            mensaje: mensajeError(error),
          });
        }
      });

    return () => {
      activo = false;
    };
  }, [canchaId, autorizado, refresco]);

  // ==========================================
  // AVISOS Y ACTUALIZACIÓN
  // ==========================================

  const actualizar = () => setRefresco((valor) => valor + 1);

  const ejecutar = async (clave, operacion, mensajeExito) => {
    setAccion(clave);
    setAviso(null);

    try {
      await operacion();

      setAviso({
        tipo: 'ok',
        texto: mensajeExito,
      });

      actualizar();
    } catch (error) {
      setAviso({
        tipo: 'error',
        texto: mensajeError(error),
      });
    } finally {
      setAccion(null);
    }
  };

  // ==========================================
  // CREAR CANCHA
  // ==========================================

  const guardarNuevaCancha = (evento) => {
    evento.preventDefault();

    if (!sedeId) {
      setAviso({
        tipo: 'error',
        texto: 'Seleccioná una sede antes de crear una cancha.',
      });
      return;
    }

    ejecutar(
      'crear-cancha',
      () => crearCancha({
        nombre: formNuevaCancha.nombre.trim(),
        tipo: formNuevaCancha.tipo,
        sedeId: Number(sedeId),
        activa: true,
      }),
      'La cancha se creó correctamente.',
    ).then(() => setFormNuevaCancha(FORM_CANCHA_VACIO));
  };

  // ==========================================
  // MODIFICAR CANCHA
  // ==========================================

  const guardarEdicionCancha = (evento) => {
    evento.preventDefault();

    if (!canchaSeleccionada) return;

    ejecutar(
      'editar-cancha',
      () => actualizarCancha(canchaSeleccionada.id, {
        nombre: formEdicion.nombre.trim(),
        tipo: formEdicion.tipo,
        activa: canchaActiva,
      }),
      'La cancha se actualizó correctamente.',
    );
  };

  // ==========================================
  // CREAR TURNO DE 60 MINUTOS
  // ==========================================

  const guardarTurno = (evento) => {
    evento.preventDefault();

    if (!canchaSeleccionada) return;

    try {
      const inicio = `${formTurno.fecha}T${formTurno.hora}:00-03:00`;
      const fin = sumarMinutosArgentina(
        formTurno.fecha,
        formTurno.hora,
        60,
      );

      const fechaInicio = inicio.slice(0, 10);
      const fechaFin = fin.slice(0, 10);

      if (fechaInicio !== fechaFin) {
        setAviso({
          tipo: 'error',
          texto: 'El turno de 60 minutos debe finalizar el mismo día. Elegí un horario anterior.',
        });
        return;
      }

      ejecutar(
        'crear-turno',
        () => crearTurno(canchaSeleccionada.id, { inicio, fin }),
        'El turno de 60 minutos se creó correctamente.',
      );
    } catch (error) {
      setAviso({
        tipo: 'error',
        texto: error.message,
      });
    }
  };

  // ==========================================
  // CREAR MANTENIMIENTO
  // ==========================================

  const guardarMantenimiento = (evento) => {
    evento.preventDefault();

    if (!canchaSeleccionada) return;

    const inicio = aFechaHoraArgentina(formMantenimiento.inicio);
    const fin = aFechaHoraArgentina(formMantenimiento.fin);

    if (!inicio || !formMantenimiento.motivo.trim()) {
      setAviso({
        tipo: 'error',
        texto: 'Indicá el inicio y el motivo del mantenimiento.',
      });
      return;
    }

    if (formMantenimiento.fin && !fin) {
      setAviso({
        tipo: 'error',
        texto: 'La fecha de finalización no es válida.',
      });
      return;
    }

    ejecutar(
      'crear-mantenimiento',
      () => crearMantenimiento(canchaSeleccionada.id, {
        inicio,
        fin,
        motivo: formMantenimiento.motivo.trim(),
      }),
      'El mantenimiento se registró correctamente.',
    ).then(() => setFormMantenimiento(FORM_MANTENIMIENTO_VACIO));
  };

  // ==========================================
  // DESACTIVAR MANTENIMIENTO
  // ==========================================

  const desactivarMantenimiento = (mantenimiento) => {
    if (!window.confirm('¿Querés desactivar este mantenimiento? Se conservará en el historial.')) {
      return;
    }

    ejecutar(
      `mantenimiento-${mantenimiento.id}`,
      () => eliminarMantenimiento(canchaSeleccionada.id, mantenimiento.id),
      'El mantenimiento se desactivó. Su registro histórico se conservó.',
    );
  };

  // ==========================================
  // CREAR / MODIFICAR TIPO DE CANCHA
  // ==========================================

  const seleccionarTipo = (valor) => {
    setTipoId(valor);

    const tipo = tipos.items.find(
      (item) => String(item.id) === String(valor),
    );

    setTipoNombre(tipo?.nombre || '');
    setTipoPrecio(tipo?.precioHora == null ? '' : String(tipo.precioHora));
  };

  const guardarTipo = (evento) => {
    evento.preventDefault();

    const datos = {
      nombre: tipoNombre.trim(),
      precioHora: Number(tipoPrecio),
    };

    if (!datos.nombre || !Number.isFinite(datos.precioHora) || datos.precioHora <= 0) {
      setAviso({
        tipo: 'error',
        texto: 'Ingresá un nombre y una tarifa por hora mayor que cero.',
      });
      return;
    }

    ejecutar(
      'guardar-tipo',
      async () => {
        if (tipoId) {
          await actualizarTipoCancha(Number(tipoId), datos);
        } else {
          await crearTipoCancha(datos);
        }

        const actualizados = await listarTiposCancha();

        setTipos({
          estado: 'cargado',
          items: actualizados,
        });

        setTipoId('');
        setTipoNombre('');
        setTipoPrecio('');
      },
      tipoId
        ? 'El tipo de cancha y su tarifa se actualizaron correctamente.'
        : 'El tipo de cancha se creó correctamente.',
    );
  };

  // ==========================================
  // CONFIGURAR RECARGO DE HORA PICO
  // ==========================================

  const guardarRecargo = (evento) => {
    evento.preventDefault();

    const valor = Number(recargoPico);

    if (!sedeId || !Number.isFinite(valor) || valor < 0 || valor > 100) {
      setAviso({
        tipo: 'error',
        texto: 'Ingresá un recargo entre 0 y 100 por ciento.',
      });
      return;
    }

    ejecutar(
      'guardar-recargo',
      () => actualizarRecargoPico(Number(sedeId), valor),
      'El recargo de hora pico se actualizó correctamente.',
    );
  };

  // ==========================================
  // CONTROL DE ACCESO
  // ==========================================

  if (!autorizado) {
    return (
      <div className="fitzone-ui">
        <PageHeading
          title="Administración de canchas"
          description="Esta sección está disponible para Recepción y Gerencia."
        />

        <DataCard title="Acceso no disponible">
          <p>No tenés permisos para administrar canchas.</p>
        </DataCard>
      </div>
    );
  }

  // ==========================================
  // INTERFAZ
  // ==========================================

  return (
    <div className="fitzone-ui admin-canchas">
      <div className="page-stack">

        <PageHeading
          eyebrow={esRecepcion ? 'ADMINISTRACIÓN DE SEDE' : 'ADMINISTRACIÓN GLOBAL'}
          title="Administrar canchas"
          description="Gestioná canchas, horarios, mantenimientos y tarifas según los permisos de tu cuenta."
          actions={
            <StatusBadge tone="neutral">
              {esRecepcion ? 'Sede asignada' : 'Gerencia'}
            </StatusBadge>
          }
        />

        {aviso && (
          <p
            className={`admin-canchas-aviso admin-canchas-aviso--${aviso.tipo}`}
            role={aviso.tipo === 'error' ? 'alert' : 'status'}
          >
            {aviso.tipo === 'error'
              ? <AlertCircle size={18} />
              : <CheckCircle2 size={18} />}
            {aviso.texto}
          </p>
        )}

        {/* SEDE */}

        <DataCard
          title={esRecepcion ? 'Tu sede operativa' : 'Sede a administrar'}
          description={
            esRecepcion
              ? 'El backend limita tus operaciones a la sede asignada.'
              : 'Seleccioná la sede sobre la que querés trabajar.'
          }
          action={
            <AppButton
              size="sm"
              variant="secondary"
              onClick={actualizar}
            >
              <RefreshCw size={15} />
              Actualizar
            </AppButton>
          }
        >
          {contexto.estado === 'cargando' && (
            <p role="status">Consultando sedes y tipos de cancha...</p>
          )}

          {contexto.estado === 'error' && (
            <p role="alert">{contexto.mensaje}</p>
          )}

          {contexto.estado === 'cargado' && (
            <label className="admin-canchas-campo">
              <span>Sede</span>

              <select
                value={sedeId}
                disabled={esRecepcion}
                onChange={(evento) => {
                  setSedeId(evento.target.value);
                  setCanchaId('');
                  setAviso(null);
                }}
              >
                <option value="">Seleccioná una sede</option>

                {contexto.sedes.map((sede) => (
                  <option key={sede.id} value={sede.id}>
                    {sede.nombre}
                  </option>
                ))}
              </select>
            </label>
          )}
        </DataCard>

        {!sedeId && contexto.estado === 'cargado' && (
          <EmptyState
            icon={Wrench}
            title="Seleccioná una sede"
            description="Las herramientas de administración aparecerán al seleccionar una sede."
          />
        )}

        {/* CANCHAS DE LA SEDE */}

        {sedeId && (
          <>
            <DataCard
              title="Canchas registradas"
              description="Seleccioná una cancha para modificar sus datos o administrar sus turnos y mantenimientos."
            >
              {canchas.estado === 'cargando' && (
                <p role="status">Consultando canchas...</p>
              )}

              {canchas.estado === 'error' && (
                <p role="alert">{canchas.mensaje}</p>
              )}

              {canchas.estado === 'cargado' && (
                canchas.items.length === 0 ? (
                  <EmptyState
                    icon={Wrench}
                    title="Todavía no hay canchas"
                    description="Podés crear la primera cancha de esta sede desde el formulario siguiente."
                  />
                ) : (
                  <div className="admin-canchas-lista">
                    {canchas.items.map((cancha) => (
                      <button
                        type="button"
                        key={cancha.id}
                        className={`admin-canchas-item${
                          String(cancha.id) === String(canchaId)
                            ? ' admin-canchas-item--activo'
                            : ''
                        }`}
                        onClick={() => {
                          setCanchaId(String(cancha.id));
                          setAviso(null);
                        }}
                      >
                        <span>
                          <strong>{cancha.nombre}</strong>
                          <small>{cancha.tipo} · {formatoPrecio(cancha.precioHora)} / hora</small>
                        </span>

                        <StatusBadge tone={cancha.activa ? 'success' : 'neutral'}>
                          {cancha.activa ? 'Activa' : 'Inactiva'}
                        </StatusBadge>
                      </button>
                    ))}
                  </div>
                )
              )}
            </DataCard>

            {/* CREAR CANCHA */}

            <DataCard
              title="Crear cancha"
              description="La cancha quedará asociada a la sede seleccionada."
            >
              {tipos.estado === 'error' && (
                <p role="alert">{tipos.mensaje}</p>
              )}

              <form className="admin-canchas-formulario" onSubmit={guardarNuevaCancha}>
                <label className="admin-canchas-campo">
                  <span>Nombre</span>
                  <input
                    required
                    maxLength={255}
                    value={formNuevaCancha.nombre}
                    onChange={(evento) => setFormNuevaCancha({
                      ...formNuevaCancha,
                      nombre: evento.target.value,
                    })}
                    placeholder="Ej.: Padel 3"
                  />
                </label>

                <label className="admin-canchas-campo">
                  <span>Tipo de cancha</span>

                  <select
                    required
                    value={formNuevaCancha.tipo}
                    onChange={(evento) => setFormNuevaCancha({
                      ...formNuevaCancha,
                      tipo: evento.target.value,
                    })}
                  >
                    <option value="">Seleccioná un tipo</option>

                    {tipos.items.map((tipo) => (
                      <option key={tipo.id} value={tipo.nombre}>
                        {tipo.nombre} · {formatoPrecio(tipo.precioHora)} / hora
                      </option>
                    ))}
                  </select>
                </label>

                <AppButton
                  type="submit"
                  disabled={
                    accion === 'crear-cancha' ||
                    tipos.estado !== 'cargado' ||
                    tipos.items.length === 0
                  }
                >
                  <Plus size={16} />
                  {accion === 'crear-cancha' ? 'Creando...' : 'Crear cancha'}
                </AppButton>
              </form>
            </DataCard>

            {/* EDITAR CANCHA */}

            {canchaSeleccionada && (
              <>
                <DataCard
                  title={`Modificar ${canchaSeleccionada.nombre}`}
                  description="Podés actualizar su nombre, tipo y estado operativo."
                >
                  <form className="admin-canchas-formulario" onSubmit={guardarEdicionCancha}>
                    <label className="admin-canchas-campo">
                      <span>Nombre</span>
                      <input
                        required
                        maxLength={255}
                        value={formEdicion.nombre}
                        onChange={(evento) => setFormEdicion({
                          ...formEdicion,
                          nombre: evento.target.value,
                        })}
                      />
                    </label>

                    <label className="admin-canchas-campo">
                      <span>Tipo</span>

                      <select
                        required
                        value={formEdicion.tipo}
                        onChange={(evento) => setFormEdicion({
                          ...formEdicion,
                          tipo: evento.target.value,
                        })}
                      >
                        {tipos.items.map((tipo) => (
                          <option key={tipo.id} value={tipo.nombre}>
                            {tipo.nombre}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label className="admin-canchas-check">
                      <input
                        type="checkbox"
                        checked={canchaActiva}
                        onChange={(evento) => setCanchaActiva(evento.target.checked)}
                      />
                      Cancha activa para nuevas reservas
                    </label>

                    <AppButton
                      type="submit"
                      disabled={accion === 'editar-cancha'}
                    >
                      {accion === 'editar-cancha' ? 'Guardando...' : 'Guardar cambios'}
                    </AppButton>
                  </form>
                </DataCard>

                {/* CREAR TURNO */}

                <DataCard
                  title="Crear turno"
                  description="La implementación actual utiliza turnos de 60 minutos. El servidor valida que sean futuros y del mismo día."
                >
                  <form className="admin-canchas-formulario" onSubmit={guardarTurno}>
                    <label className="admin-canchas-campo">
                      <span>Fecha</span>

                      <input
                        type="date"
                        required
                        min={hoyLocal()}
                        value={formTurno.fecha}
                        onChange={(evento) => setFormTurno({
                          ...formTurno,
                          fecha: evento.target.value,
                        })}
                      />
                    </label>

                    <label className="admin-canchas-campo">
                      <span>Hora de inicio</span>

                      <input
                        type="time"
                        required
                        step="60"
                        value={formTurno.hora}
                        onChange={(evento) => setFormTurno({
                          ...formTurno,
                          hora: evento.target.value,
                        })}
                      />
                    </label>

                    <AppButton
                      type="submit"
                      disabled={accion === 'crear-turno'}
                    >
                      {accion === 'crear-turno' ? 'Creando...' : 'Crear turno de 60 minutos'}
                    </AppButton>
                  </form>
                </DataCard>

                {/* MANTENIMIENTOS */}

                <DataCard
                  title="Registrar mantenimiento"
                  description="El bloqueo impide nuevas reservas en el intervalo indicado. No cancela reservas existentes."
                >
                  <form className="admin-canchas-formulario" onSubmit={guardarMantenimiento}>
                    <label className="admin-canchas-campo">
                      <span>Inicio</span>

                      <input
                        type="datetime-local"
                        required
                        value={formMantenimiento.inicio}
                        onChange={(evento) => setFormMantenimiento({
                          ...formMantenimiento,
                          inicio: evento.target.value,
                        })}
                      />
                    </label>

                    <label className="admin-canchas-campo">
                      <span>Fin (opcional)</span>

                      <input
                        type="datetime-local"
                        min={formMantenimiento.inicio || undefined}
                        value={formMantenimiento.fin}
                        onChange={(evento) => setFormMantenimiento({
                          ...formMantenimiento,
                          fin: evento.target.value,
                        })}
                      />
                    </label>

                    <label className="admin-canchas-campo admin-canchas-campo--ancho">
                      <span>Motivo</span>

                      <input
                        required
                        maxLength={255}
                        value={formMantenimiento.motivo}
                        onChange={(evento) => setFormMantenimiento({
                          ...formMantenimiento,
                          motivo: evento.target.value,
                        })}
                        placeholder="Ej.: Reparación de superficie"
                      />
                    </label>

                    <AppButton
                      type="submit"
                      disabled={accion === 'crear-mantenimiento'}
                    >
                      {accion === 'crear-mantenimiento' ? 'Registrando...' : 'Registrar mantenimiento'}
                    </AppButton>
                  </form>
                </DataCard>

                <DataCard
                  title="Historial de mantenimientos"
                  description="Los mantenimientos desactivados se conservan como registro histórico."
                >
                  {mantenimientos.estado === 'cargando' && (
                    <p role="status">Consultando mantenimientos...</p>
                  )}

                  {mantenimientos.estado === 'error' && (
                    <p role="alert">{mantenimientos.mensaje}</p>
                  )}

                  {mantenimientos.estado === 'cargado' && (
                    mantenimientos.items.length === 0 ? (
                      <EmptyState
                        icon={Wrench}
                        title="Sin mantenimientos registrados"
                        description="Los bloqueos de esta cancha aparecerán acá."
                      />
                    ) : (
                      <div className="admin-mantenimientos-lista">
                        {mantenimientos.items.map((item) => (
                          <article className="admin-mantenimiento" key={item.id}>
                            <div>
                              <div className="admin-mantenimiento__titulo">
                                <strong>{item.motivo}</strong>

                                <StatusBadge tone={item.activo ? 'warning' : 'neutral'}>
                                  {item.activo ? 'Activo' : 'Desactivado'}
                                </StatusBadge>
                              </div>

                              <p>Desde: {formatoFechaHora(item.inicio)}</p>
                              <p>Hasta: {item.fin ? formatoFechaHora(item.fin) : 'Sin fecha de finalización'}</p>
                            </div>

                            {item.activo && (
                              <AppButton
                                size="sm"
                                variant="secondary"
                                disabled={accion === `mantenimiento-${item.id}`}
                                onClick={() => desactivarMantenimiento(item)}
                              >
                                {accion === `mantenimiento-${item.id}` ? 'Desactivando...' : 'Desactivar'}
                              </AppButton>
                            )}
                          </article>
                        ))}
                      </div>
                    )
                  )}
                </DataCard>
              </>
            )}
          </>
        )}

        {/* TARIFAS GLOBALES: SOLO GERENCIA */}

        {esGerente && (
          <>
            <DataCard
              title="Tipos de cancha y tarifas"
              description="Los tipos y sus precios por hora son globales. Al crear una cancha se debe elegir uno de estos tipos."
            >
              {tipos.estado === 'cargando' && (
                <p role="status">Consultando tipos de cancha...</p>
              )}

              {tipos.estado === 'cargado' && (
                <>
                  <label className="admin-canchas-campo">
                    <span>Tipo existente</span>

                    <select
                      value={tipoId}
                      onChange={(evento) => seleccionarTipo(evento.target.value)}
                    >
                      <option value="">Crear un tipo nuevo</option>

                      {tipos.items.map((tipo) => (
                        <option key={tipo.id} value={tipo.id}>
                          {tipo.nombre} · {formatoPrecio(tipo.precioHora)} / hora
                        </option>
                      ))}
                    </select>
                  </label>

                  <form className="admin-canchas-formulario" onSubmit={guardarTipo}>
                    <label className="admin-canchas-campo">
                      <span>Nombre del tipo</span>

                      <input
                        required
                        maxLength={255}
                        value={tipoNombre}
                        onChange={(evento) => setTipoNombre(evento.target.value)}
                        placeholder="Ej.: PADEL"
                      />
                    </label>

                    <label className="admin-canchas-campo">
                      <span>Precio por hora · ARS</span>

                      <input
                        type="number"
                        required
                        min="0.01"
                        step="0.01"
                        value={tipoPrecio}
                        onChange={(evento) => setTipoPrecio(evento.target.value)}
                      />
                    </label>

                    <AppButton
                      type="submit"
                      disabled={accion === 'guardar-tipo'}
                    >
                      {accion === 'guardar-tipo'
                        ? 'Guardando...'
                        : tipoId
                          ? 'Actualizar tipo y tarifa'
                          : 'Crear tipo de cancha'}
                    </AppButton>
                  </form>
                </>
              )}
            </DataCard>

            <DataCard
              title="Recargo de hora pico"
              description="Configuración global de la sede seleccionada. El backend aplica el porcentaje según la franja horaria."
            >
              <form className="admin-canchas-formulario" onSubmit={guardarRecargo}>
                <label className="admin-canchas-campo">
                  <span>Recargo porcentual (0 a 100)</span>

                  <input
                    type="number"
                    required
                    min="0"
                    max="100"
                    step="0.01"
                    value={recargoPico}
                    onChange={(evento) => setRecargoPico(evento.target.value)}
                    placeholder="Consultar tarifa actual de una cancha"
                  />
                </label>

                <AppButton
                  type="submit"
                  disabled={!sedeId || recargoPico === '' || accion === 'guardar-recargo'}
                >
                  {accion === 'guardar-recargo' ? 'Guardando...' : 'Guardar recargo de la sede'}
                </AppButton>
              </form>

              <p className="admin-canchas-ayuda">
                El valor se obtiene de las canchas existentes de la sede.
                Si la sede todavía no tiene canchas, consultá con el equipo el recargo configurado antes de modificarlo.
              </p>
            </DataCard>
          </>
        )}

      </div>
    </div>
  );
}
