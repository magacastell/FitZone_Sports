
import { useEffect, useRef, useState } from 'react';
import {
  CalendarDays,
  Clock3,
  MapPin,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';

import { useAuth } from '../../context/AuthContext';
import { consultarMiPerfil } from '../../services/m1Service';
import { listarSedes } from '../../services/sedesService';

import {
  listarCanchas,
  listarTurnos,
  reservarCancha,
  consultarReserva,
  cancelarReservaCancha,
} from '../../services/m4Service';

import {
  pagarReservaCancha,
  consultarPago,
} from '../../services/pagosService';

import {
  AppButton,
  AppLink,
  DataCard,
  EmptyState,
  PageHeading,
  StatusBadge,
} from '../../components/ui/FitZoneUI';

import { ListadoReservasCancha, useReservasCancha } from './ReservasCanchas';
import { cancelarConDetalle, claveReserva, estadoReservaTexto, formatoFechaHora, formatoPrecio, limpiarClaveReserva, mensajeError, tiempoRestante } from './reservasCanchaUtils';
import './GrillaCanchas.css';

// ============================================
// UTILIDADES
// ============================================

function fechaArgentina(instante = new Date()) {
  const partes = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Argentina/Buenos_Aires',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(instante);

  const obtener = (tipo) =>
    partes.find((parte) => parte.type === tipo)?.value;

  return `${obtener('year')}-${obtener('month')}-${obtener('day')}`;
}

function sumarDias(fecha, dias) {
  const dia = new Date(`${fecha}T00:00:00Z`);
  dia.setUTCDate(dia.getUTCDate() + dias);
  return dia.toISOString().slice(0, 10);
}

function formatoHora(valor) {
  if (!valor) return '--:--';

  return new Date(valor).toLocaleTimeString('es-AR', {
    timeZone: 'America/Argentina/Buenos_Aires',
    hour: '2-digit',
    minute: '2-digit',
  });
}

// ============================================
// IDEMPOTENCIA DE RESERVAS
// ============================================

function obtenerClaveIdempotencia(email, canchaId, turnoId) {
  const almacenamiento = claveReserva(email, canchaId, turnoId);

  let clave = localStorage.getItem(almacenamiento);

  if (!clave) {
    if (!globalThis.crypto?.randomUUID) {
      throw new Error(
        'El navegador no permite generar una clave segura para reservar.',
      );
    }

    clave = globalThis.crypto.randomUUID();
    localStorage.setItem(almacenamiento, clave);
  }

  return clave;
}

// ============================================
// ESTADOS DE RESERVA
// ============================================

function esEstadoFinal(estado) {
  return [
    'CONFIRMADA',
    'RECHAZADA',
    'EXPIRADA',
    'CANCELADA',
    'CUMPLIDA',
  ].includes(estado);
}

// ============================================
// COMPONENTE PRINCIPAL
// ============================================

export default function GrillaCanchas() {
  const { token } = useAuth();
  return <GrillaCuenta key={token} />;
}

function GrillaCuenta() {
  const { user, token } = useAuth();

  const esRecepcion = user?.rol === 'RECEPCIONISTA';
  const esGerente = user?.rol === 'GERENTE';

  const puedeReservar =
    user?.rol === 'USUARIO' || esGerente;

  const [contexto, setContexto] = useState({
    estado: 'cargando',
    sedes: [],
  });

  const [sedeId, setSedeId] = useState('');
  const [canchaId, setCanchaId] = useState('');
  const [fechaManual, setFechaManual] = useState('');

  const [catalogo, setCatalogo] = useState({
    estado: 'inicial',
    items: [],
  });

  const [resultadoTurnos, setTurnos] = useState({
    estado: 'inicial',
    items: [],
  });

  const [aviso, setAviso] = useState(null);
  const [accion, setAccion] = useState(null);
  const [pagoModal, setPagoModal] = useState(null);
  const dialogoPago = useRef(null);
  const enviando = useRef(false);
  const [recargaContexto, setRecargaContexto] = useState(0);
  const [paginaReservas, setPaginaReservas] = useState(0);

  // Refrescos independientes: una operación no reinicia
  // consultas que no necesitan actualizarse.
  const [refrescoCatalogo, setRefrescoCatalogo] = useState(0);
  const [refrescoTurnos, setRefrescoTurnos] = useState(0);
  const [refrescoReservas, setRefrescoReservas] = useState(0);
  const personal = user?.rol === 'USUARIO';
  const reservas = useReservasCancha({
    habilitada: Boolean(token) && (!esRecepcion || Boolean(sedeId)),
    personal, sedeId, pagina: paginaReservas, refresco: refrescoReservas,
  });

  const [ahora, setAhora] = useState(Date.now());
  const hoy = fechaArgentina(new Date(ahora));
  const claveTurnos = `${canchaId}:${fechaManual}:${hoy}:${refrescoTurnos}`;
  const turnos = resultadoTurnos.clave === claveTurnos
    ? resultadoTurnos
    : { estado: canchaId ? 'cargando' : 'inicial', items: [] };
  const fechaMostrada = fechaManual || turnos.fecha || hoy;
  const mostrarPago = pagoModal !== null;
  const pagoEnCurso = ['procesando', 'saliendo'].includes(pagoModal?.estado);
  const pagoVencido = pagoModal?.estado === 'listo' && Date.parse(pagoModal.reserva.venceEn) <= ahora;

  useEffect(() => {
    if (mostrarPago) dialogoPago.current?.showModal();
  }, [mostrarPago]);

  // Evita procesar reiteradamente la misma retención vencida.
  const expiracionesAtendidas = useRef(new Set());

  const canchaSeleccionada = catalogo.items.find(
    (cancha) => String(cancha.id) === String(canchaId),
  );

  // ==========================================
  // RELOJ DE RETENCIONES
  // ==========================================

  useEffect(() => {
    const intervalo = window.setInterval(() => {
      setAhora(Date.now());
    }, 1000);

    return () => window.clearInterval(intervalo);
  }, []);

  // Refresca la disponibilidad al vencer una retención mostrada.
  useEffect(() => {
    if (!['USUARIO', 'GERENTE'].includes(user?.rol)) {
      return;
    }

    const vencidas = (reservas.items || []).filter((reserva) =>
      reserva.estado === 'PENDIENTE_PAGO' &&
      reserva.venceEn &&
      Date.parse(reserva.venceEn) <= ahora &&
      !expiracionesAtendidas.current.has(reserva.id)
    );

    if (vencidas.length === 0) return;

    vencidas.forEach((reserva) => {
      expiracionesAtendidas.current.add(reserva.id);
    });

    // Actualizamos disponibilidad y reservas para que el turno
    // vuelva a mostrarse según la información real del servidor.
    setRefrescoTurnos((valor) => valor + 1);
    setRefrescoReservas((valor) => valor + 1);
  }, [reservas.items, ahora, user?.rol, user?.email]);

  // ==========================================
  // CONSULTAR PERFIL Y SEDES
  // ==========================================

  useEffect(() => {
    if (!token) return;

    let activo = true;

    setContexto({
      estado: 'cargando',
      sedes: [],
    });

    setSedeId('');
    setCanchaId('');

    Promise.all([
      consultarMiPerfil(),
      esRecepcion ? Promise.resolve([]) : listarSedes(),
    ])
      .then(([perfil, sedes]) => {
        if (!activo) return;

        const opciones = esRecepcion
          ? [{
              id: perfil.sedeId,
              nombre: perfil.sedeNombre,
            }].filter((sede) => sede.id)
          : sedes;

        setContexto({
          estado: 'cargado',
          sedes: opciones,
        });

        const sedeInicial = opciones.find(
          (sede) => String(sede.id) === String(perfil.sedeId),
        ) || opciones[0];

        setSedeId(
          sedeInicial ? String(sedeInicial.id) : '',
        );
      })
      .catch(() => {
        if (activo) {
          setContexto({
            estado: 'error',
            sedes: [],
          });
        }
      });

    return () => {
      activo = false;
    };
  }, [token, esRecepcion, recargaContexto]);

  // ==========================================
  // CATÁLOGO DE CANCHAS
  // ==========================================

  useEffect(() => {
    if (!token || !sedeId) {
      setCatalogo({
        estado: 'inicial',
        items: [],
      });

      return;
    }

    let activo = true;

    setCatalogo({
      estado: 'cargando',
      items: [],
    });

    listarCanchas(sedeId)
      .then((datos) => {
        if (!activo) return;

        if (!Array.isArray(datos)) {
          setCatalogo({
            estado: 'error',
            items: [],
            mensaje: 'La respuesta del catálogo no es válida.',
          });

          return;
        }

        if (
          datos.some(
            (cancha) => String(cancha.sedeId) !== String(sedeId),
          )
        ) {
          setCatalogo({
            estado: 'error',
            items: [],
            mensaje: 'El catálogo recibido no corresponde a la sede seleccionada.',
          });

          return;
        }

        setCatalogo({
          estado: 'cargado',
          items: datos,
        });

        setCanchaId((actual) => {
          const sigueDisponible = datos.find(
            (cancha) =>
              String(cancha.id) === String(actual) &&
              cancha.activa,
          );

          if (sigueDisponible) {
            return String(sigueDisponible.id);
          }

          const primeraActiva = datos.find(
            (cancha) => cancha.activa,
          );

          return primeraActiva
            ? String(primeraActiva.id)
            : '';
        });
      })
      .catch((error) => {
        if (activo) {
          setCatalogo({
            estado: 'error',
            items: [],
            mensaje: mensajeError(error, 'catalogo'),
          });
        }
      });

    return () => {
      activo = false;
    };
  }, [token, sedeId, refrescoCatalogo]);

  // ==========================================
  // DISPONIBILIDAD DE TURNOS
  // ==========================================

  useEffect(() => {
    if (!token || !canchaId) {
      setTurnos({
        estado: 'inicial',
        items: [],
      });

      return;
    }

    let activo = true;
    setTurnos({ clave: claveTurnos, estado: 'cargando', items: [] });
    const cargar = async () => {
      try {
        const desde = fechaManual || hoy;
        const hasta = fechaManual || sumarDias(hoy, 13);
        const items = await listarTurnos(canchaId, desde, hasta);
        if (!Array.isArray(items)) throw new Error('La respuesta de horarios no es válida.');
        if (!activo) return;
        const fechasLibres = items
          .filter((turno) => turno.disponible === true && Date.parse(turno.inicio) > Date.now())
          .map((turno) => fechaArgentina(new Date(turno.inicio)));
        const fecha = fechaManual || fechasLibres.sort()[0];
        const turnosDelDia = fecha ? items.filter((turno) => fechaArgentina(new Date(turno.inicio)) === fecha) : [];
        setTurnos({ clave: claveTurnos, estado: 'cargado', fecha, items: turnosDelDia });
      } catch (error) {
        if (activo) setTurnos({ clave: claveTurnos, estado: 'error', items: [], mensaje: error.status ? mensajeError(error, 'turnos') : error.message });
      }
    };
    cargar();

    return () => {
      activo = false;
    };
  }, [token, canchaId, fechaManual, hoy, claveTurnos]);

  // ==========================================
  // ACTUALIZACIÓN DE CONSULTAS
  // ==========================================

  const actualizarTodo = () => {
    if (enviando.current) return;
    if (contexto.estado === 'error') setRecargaContexto((valor) => valor + 1);
    setRefrescoCatalogo((valor) => valor + 1);
    setRefrescoTurnos((valor) => valor + 1);
    setRefrescoReservas((valor) => valor + 1);
  };

  const cambiarSede = (valor) => {
    if (enviando.current) return;
    setPaginaReservas(0);
    setSedeId(valor);
    setCanchaId('');
    setFechaManual('');
    setAviso(null);
  };

  // ==========================================
  // RETENER TURNO
  // ==========================================

  const reservar = async (turno) => {
    if (!canchaSeleccionada || !puedeReservar || enviando.current) return;
    enviando.current = true;

    setAccion(`reserva-${turno.id}`);
    setAviso(null);

    try {
      const clave = obtenerClaveIdempotencia(
        user.email,
        canchaSeleccionada.id,
        turno.id,
      );

      const reserva = await reservarCancha(
        canchaSeleccionada.id,
        { turnoId: turno.id },
        clave,
      );

      if (reserva.estado === 'PENDIENTE_PAGO') {
        setFechaManual(fechaMostrada);
        setPagoModal({ estado: 'listo', reserva });
      } else {
        if (esEstadoFinal(reserva.estado)) limpiarClaveReserva(user.email, reserva);
        setAviso({
          tipo: 'ok',
          texto: `Reserva ${reserva.id} recuperada: ${estadoReservaTexto(reserva.estado)}. No se creó una nueva retención.`,
        });
      }

      setRefrescoTurnos((valor) => valor + 1);
      setRefrescoReservas((valor) => valor + 1);
    } catch (error) {
      setAviso({
        tipo: 'error',
        texto: error.message && !error.status
          ? error.message
          : mensajeError(error, 'reserva'),
      });

      if (error.status === 409) {
        setRefrescoTurnos((valor) => valor + 1);
        setRefrescoReservas((valor) => valor + 1);
      }
    } finally {
      enviando.current = false;
      setAccion(null);
    }
  };

  const salirDelPago = async () => {
    if (enviando.current) return;
    if (pagoModal.estado !== 'listo') {
      setPagoModal(null);
      return;
    }
    const { reserva } = pagoModal;
    enviando.current = true;
    setAccion(`salida-${reserva.id}`);
    setPagoModal({ estado: 'saliendo', reserva });

    try {
      const actualizada = await cancelarReservaCancha(reserva.canchaId, reserva.id, { soloRetencion: true });
      limpiarClaveReserva(user.email, actualizada);
    } catch {
      setAviso({
        tipo: 'error',
        texto: 'No pudimos confirmar que el turno se liberó. Si sigue pendiente, la retención vence automáticamente.',
      });
    } finally {
      setPagoModal(null);
      enviando.current = false;
      setAccion(null);
      actualizarTodo();
    }
  };

  // ==========================================
  // PAGAR RESERVA
  // ==========================================

  const pagar = async (reserva) => {
    if (enviando.current || Date.parse(reserva.venceEn) <= Date.now()) return;
    enviando.current = true;
    setAccion(`pago-${reserva.id}`);
    setAviso(null);

    setPagoModal({ estado: 'procesando', reserva });
    const presentar = (pago, actualizada, recuperado = false) => {
      if (esEstadoFinal(actualizada.estado)) limpiarClaveReserva(user.email, reserva);
      if (pago.estado === 'APROBADO' && actualizada.estado === 'CONFIRMADA') {
        setPagoModal({ estado: 'aprobado', reserva: actualizada, pago, recuperado });
      } else if (pago.estado === 'RECHAZADO' && actualizada.estado === 'RECHAZADA') {
        setPagoModal({ estado: 'rechazado', reserva: actualizada, pago });
      } else {
        setPagoModal({ estado: 'consultado', reserva: actualizada, pago });
      }
    };

    try {
      const pago = await pagarReservaCancha(reserva.id);
      presentar(pago, await consultarReserva(reserva.id));
    } catch {
      try {
        const recuperada = await consultarReserva(reserva.id);
        if (recuperada.pagoId != null) {
          presentar(await consultarPago(recuperada.pagoId), recuperada, true);
        } else {
          setPagoModal({ estado: 'sin-confirmar', reserva: recuperada });
        }
      } catch {
        setPagoModal({ estado: 'sin-confirmar', reserva });
      }
    } finally {
      enviando.current = false;
      setAccion(null);
      actualizarTodo();
    }
  };

  // ==========================================
  // CANCELAR RESERVA Y MOSTRAR DEVOLUCIÓN
  // ==========================================

  const cancelar = async (reserva) => {
    if (enviando.current) return;
    const confirmar = window.confirm(
      `¿Querés cancelar la reserva ${reserva.id} de ${reserva.cancha}? El backend calculará la devolución que corresponda.`,
    );

    if (!confirmar) return;
    enviando.current = true;

    setAccion(`cancelar-${reserva.id}`);
    setAviso(null);

    try {
      const texto = await cancelarConDetalle(reserva, user);
      setAviso({ tipo: 'ok', texto });
    } catch (error) {
      setAviso({
        tipo: 'error',
        texto: mensajeError(error, 'cancelacion'),
      });
    } finally {
      enviando.current = false;
      setAccion(null);
      actualizarTodo();
    }
  };

  // ==========================================
  // INTERFAZ
  // ==========================================

  return (
    <div className="fitzone-ui grilla-canchas">
      <div className="page-stack">

        <PageHeading
          eyebrow={
            esRecepcion
              ? 'OPERACIÓN DE SEDE'
              : esGerente
                ? 'GESTIÓN Y SERVICIOS'
                : 'ACTIVIDADES FITZONE'
          }
          title="Canchas"
          description={
            puedeReservar
              ? 'Elegí una cancha, consultá sus horarios y reservá tu turno.'
              : 'Consultá las canchas y las reservas registradas en tu sede.'
          }
          actions={personal ? <AppLink to="/mis-reservas#canchas">Mis reservas</AppLink> : (
            <StatusBadge tone="neutral">{esRecepcion ? 'Sede operativa' : 'Gerencia'}</StatusBadge>
          )}
        />

        {aviso && (
          <p
            className={`m4-aviso m4-aviso--${aviso.tipo}`}
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
          title={esRecepcion ? 'Tu sede operativa' : 'Seleccioná una sede'}
          description={
            esRecepcion
              ? 'Recepción opera únicamente sobre la sede asignada a su cuenta.'
              : 'La sede habitual se selecciona inicialmente. Podés consultar otras sedes.'
          }
          action={
            <AppButton
              type="button"
              variant="secondary"
              size="sm"
              disabled={Boolean(accion)}
              onClick={actualizarTodo}
            >
              <RefreshCw size={15} />
              Actualizar
            </AppButton>
          }
        >
          {contexto.estado === 'cargando' && (
            <p role="status">Consultando sedes...</p>
          )}

          {contexto.estado === 'error' && (
            <p role="alert">
              No pudimos cargar la información de las sedes.
              Volvé a actualizar la consulta.
            </p>
          )}

          {contexto.estado === 'cargado' && (
            <div className="m4-filtros">
              <label>
                <span>
                  <MapPin size={17} />
                  Sede
                </span>

                <select
                  value={sedeId}
                  disabled={esRecepcion || Boolean(accion)}
                  onChange={(evento) => cambiarSede(evento.target.value)}
                >
                  {esGerente && (
                    <option value="">
                      Todas las sedes (solo reservas)
                    </option>
                  )}

                  {!esGerente && (
                    <option value="">
                      Seleccioná una sede
                    </option>
                  )}

                  {contexto.sedes.map((sede) => (
                    <option key={sede.id} value={sede.id}>
                      {sede.nombre}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          )}
        </DataCard>

        {/* CATÁLOGO */}

        <DataCard
          title="Catálogo de canchas"
          description="Seleccioná una cancha activa para consultar sus horarios."
        >
          {!sedeId && (
            <EmptyState
              icon={MapPin}
              title="Elegí una sede"
              description={
                esGerente
                  ? 'Seleccioná una sede para consultar su catálogo. También podés ver todas las reservas.'
                  : 'Primero seleccioná la sede que querés consultar.'
              }
            />
          )}

          {sedeId && catalogo.estado === 'cargando' && (
            <p role="status">Consultando canchas...</p>
          )}

          {sedeId && catalogo.estado === 'error' && (
            <p role="alert">{catalogo.mensaje}</p>
          )}

          {sedeId && catalogo.estado === 'cargado' && (
            catalogo.items.length === 0 ? (
              <EmptyState
                icon={MapPin}
                title="No hay canchas registradas"
                description="Esta sede todavía no tiene canchas en el catálogo."
              />
            ) : (
              <div className="m4-canchas-grid">
                {catalogo.items.map((cancha) => (
                  <button
                    type="button"
                    key={cancha.id}
                    className={`m4-cancha-card${
                      String(cancha.id) === String(canchaId)
                        ? ' m4-cancha-card--activa'
                        : ''
                    }`}
                    disabled={!cancha.activa || Boolean(accion)}
                    aria-pressed={String(cancha.id) === String(canchaId)}
                    onClick={() => {
                      if (enviando.current) return;
                      if (String(cancha.id) !== canchaId) setFechaManual('');
                      setCanchaId(String(cancha.id));
                      setAviso(null);
                    }}
                  >
                    <span className="m4-cancha-card__tipo">
                      {cancha.tipo}
                    </span>

                    <strong>{cancha.nombre}</strong>

                    <span>
                      {cancha.activa ? 'Cancha activa' : 'Cancha inactiva'}
                    </span>

                    {cancha.precioHora != null && (
                      <span className="m4-cancha-card__precio">
                        Tarifa base: {formatoPrecio(cancha.precioHora)} / hora
                      </span>
                    )}
                  </button>
                ))}
              </div>
            )
          )}
        </DataCard>

        {/* DISPONIBILIDAD */}

        <DataCard
          title="Disponibilidad"
          description={
            puedeReservar
              ? 'Consultá horarios y precios calculados por el backend.'
              : 'Podés consultar los horarios de las canchas de tu sede.'
          }
        >
          {!canchaId && (
            <EmptyState
              icon={CalendarDays}
              title="Seleccioná una cancha"
              description="Los horarios aparecerán cuando elijas una cancha activa."
            />
          )}

          {canchaSeleccionada && (
            <div className="m4-filtros m4-filtros--fecha">
              <label>
                <span>
                  <CalendarDays size={17} />
                  Fecha
                </span>

                <input
                  type="date"
                  min={hoy}
                  value={fechaMostrada}
                  disabled={Boolean(accion)}
                  onChange={(evento) => {
                    if (enviando.current) return;
                    const dia = evento.target.value;
                    if (dia && dia >= hoy) setFechaManual(dia);
                  }}
                />
              </label>

              <p>
                Cancha seleccionada:{' '}
                <strong>{canchaSeleccionada.nombre}</strong>
              </p>
            </div>
          )}

          {accion?.startsWith('reserva-') && canchaSeleccionada && (
            <p role="status">Reteniendo el turno de {canchaSeleccionada.nombre}…</p>
          )}

          {canchaId && turnos.estado === 'cargando' && (
            <p role="status">Consultando horarios...</p>
          )}

          {canchaId && turnos.estado === 'error' && (
            <p role="alert">{turnos.mensaje}</p>
          )}

          {canchaId && turnos.estado === 'cargado' && (
            turnos.items.length === 0 ? (
              <EmptyState
                icon={Clock3}
                title={fechaManual ? 'Sin horarios para esta fecha' : 'No hay turnos libres en los próximos 14 días'}
                description="Podés elegir otra fecha o cancha para consultar."
              />
            ) : (
              <div className="m4-turnos-grid">
                {turnos.items.map((turno) => (
                  <article
                    className={`m4-turno${
                      turno.disponible ? '' : ' m4-turno--ocupado'
                    }`}
                    key={turno.id}
                  >
                    <div className="m4-turno__encabezado">
                      <strong>
                        {formatoHora(turno.inicio)}
                        {' – '}
                        {formatoHora(turno.fin)}
                      </strong>

                      <StatusBadge
                        tone={turno.disponible ? 'success' : 'neutral'}
                      >
                        {turno.disponible ? 'Disponible' : 'No disponible'}
                      </StatusBadge>
                    </div>

                    {turno.precio && (
                      <div className="m4-precio">
                        <span>{Number(turno.precio.descuento) > 0 ? 'Precio socio' : 'Tarifa general'}</span>
                        <strong>{formatoPrecio(turno.precio.total)}</strong>
                        {Number(turno.precio.descuento) > 0 && (
                          <small className="m4-descuento">Descuento de socio aplicado · Ahorrás {formatoPrecio(turno.precio.descuento)}</small>
                        )}
                        {Number(turno.precio.recargo) > 0 && <small>Incluye recargo de hora pico</small>}
                      </div>
                    )}

                    <AppButton
                      type="button"
                      size="sm"
                      disabled={
                        !puedeReservar ||
                        !turno.disponible ||
                        Boolean(accion)
                      }
                      onClick={() => reservar(turno)}
                    >
                      {!puedeReservar
                        ? 'Solo consulta'
                        : accion === `reserva-${turno.id}`
                          ? 'Reservando...'
                          : 'Elegir turno'}
                    </AppButton>
                  </article>
                ))}
              </div>
            )
          )}
        </DataCard>

        {!personal && (
          <DataCard title={esRecepcion ? 'Reservas de tu sede' : 'Reservas registradas'}
            description="Consultá los turnos de la sede."
            action={<AppButton size="sm" variant="secondary" onClick={actualizarTodo}>
              <RefreshCw size={15} aria-hidden="true" /> Actualizar
            </AppButton>}>
            <ListadoReservasCancha reservas={reservas} pagina={paginaReservas} setPagina={setPaginaReservas}
              cancelar={cancelar} ocupado={Boolean(accion)} ahora={ahora} />
          </DataCard>
        )}
        {pagoModal && (
          <dialog ref={dialogoPago} className="m4-dialogo-pago" aria-labelledby="m4-pago-titulo"
            onCancel={(evento) => {
              evento.preventDefault();
              if (!pagoEnCurso) salirDelPago();
            }}>
            <h2 id="m4-pago-titulo">{{
              listo: 'Confirmá tu turno',
              procesando: 'Procesando pago',
              saliendo: 'Liberando el turno',
              aprobado: 'Pago aprobado',
              rechazado: 'Pago rechazado',
              consultado: 'Estado del pago',
              'sin-confirmar': 'Pago sin confirmar',
            }[pagoModal.estado]}</h2>
            <p className="m4-dialogo-pago__turno">{pagoModal.reserva.cancha} · {formatoFechaHora(pagoModal.reserva.inicio)}</p>
            <p className="m4-dialogo-pago__total">{formatoPrecio(pagoModal.pago?.monto ?? pagoModal.reserva.precioAplicado)}</p>
            <p role="status">{{
              listo: pagoVencido ? 'Se terminó el tiempo para confirmar. Volvé a elegir un turno.' : 'Confirmá el pago para reservar el horario.',
              procesando: 'Estamos esperando la confirmación del servidor.',
              saliendo: 'Estamos devolviendo el turno a la grilla.',
              aprobado: 'Reserva #' + pagoModal.reserva.id + ' confirmada.' + (pagoModal.recuperado ? ' Recuperamos el resultado del pago después del corte de conexión.' : ''),
              rechazado: 'El pago fue rechazado y el horario volvió a estar disponible.',
              consultado: 'Pago: ' + pagoModal.pago?.estado + '. Reserva: ' + estadoReservaTexto(pagoModal.reserva.estado) + '.',
              'sin-confirmar': 'No pudimos verificar el resultado. Consultá Mis pagos antes de volver a pagar.',
            }[pagoModal.estado]}</p>
            {pagoModal.estado === 'listo' && !pagoVencido && (
              <p className="m4-dialogo-pago__turno">
                Tiempo para pagar <strong>{tiempoRestante(pagoModal.reserva.venceEn, ahora)}</strong>
              </p>
            )}
            <div className="m4-dialogo-pago__acciones">
              <AppButton type="button" variant="secondary" disabled={pagoEnCurso} onClick={salirDelPago}>
                {pagoModal.estado === 'listo' ? 'Salir' : 'Cerrar'}
              </AppButton>
              {pagoModal.estado === 'listo' && !pagoVencido && (
                <AppButton type="button" onClick={() => pagar(pagoModal.reserva)}>Confirmar pago</AppButton>
              )}
              {user?.rol === 'USUARIO' && ['aprobado', 'rechazado', 'consultado', 'sin-confirmar'].includes(pagoModal.estado) && (
                <AppLink variant={pagoModal.estado === 'aprobado' ? 'secondary' : 'primary'} to="/pagos">Ir a Mis pagos</AppLink>
              )}
              {personal && pagoModal.estado === 'aprobado' && (
                <AppLink variant="primary" to="/mis-reservas#canchas">Ir a mis reservas</AppLink>
              )}
            </div>
          </dialog>
        )}

      </div>
    </div>
  );
}
