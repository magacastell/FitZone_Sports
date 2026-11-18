
import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  CalendarDays,
  Clock3,
  MapPin,
  RefreshCw,
  Wallet,
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
  listarMisReservas,
  listarReservas,
  consultarReserva,
  cancelarReservaCancha,
} from '../../services/m4Service';

import {
  pagarReservaCancha,
  consultarPago,
} from '../../services/pagosService';

import {
  AppButton,
  DataCard,
  EmptyState,
  PageHeading,
  StatusBadge,
} from '../../components/ui/FitZoneUI';

import './GrillaCanchas.css';

// ============================================
// UTILIDADES
// ============================================

function fechaLocalHoy() {
  const partes = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Argentina/Buenos_Aires',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date());

  const obtener = (tipo) =>
    partes.find((parte) => parte.type === tipo)?.value;

  return `${obtener('year')}-${obtener('month')}-${obtener('day')}`;
}

function formatoFechaHora(valor) {
  if (!valor) return 'Fecha no disponible';

  return new Date(valor).toLocaleString('es-AR', {
    timeZone: 'America/Argentina/Buenos_Aires',
    dateStyle: 'short',
    timeStyle: 'short',
  });
}

function formatoHora(valor) {
  if (!valor) return '--:--';

  return new Date(valor).toLocaleTimeString('es-AR', {
    timeZone: 'America/Argentina/Buenos_Aires',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatoPrecio(valor) {
  if (valor == null || !Number.isFinite(Number(valor))) {
    return 'No disponible';
  }

  return Number(valor).toLocaleString('es-AR', {
    style: 'currency',
    currency: 'ARS',
  });
}

function mensajeError(error, operacion) {
  if (error.status === 400) {
    return 'Los datos enviados no son válidos. Revisá la información e intentá nuevamente.';
  }

  if (error.status === 401) {
    return 'Tu sesión venció. Volvé a iniciar sesión.';
  }

  if (error.status === 403) {
    return 'Tu cuenta no tiene autorización para realizar esta operación.';
  }

  if (error.status === 404) {
    return 'El recurso solicitado ya no existe o no está disponible.';
  }

  if (error.status === 409) {
    return operacion === 'reserva'
      ? 'Ese horario acaba de cambiar o fue reservado por otra persona. Actualizamos la disponibilidad.'
      : 'La operación ya no puede realizarse porque cambió el estado de la reserva.';
  }

  return 'No pudimos completar la operación. Revisá tu conexión e intentá nuevamente.';
}

// ============================================
// IDEMPOTENCIA DE RESERVAS
// ============================================

function claveReserva(email, canchaId, turnoId) {
  return `fitzone:m4:intencion:${email}:${canchaId}:${turnoId}`;
}

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

function limpiarClaveReserva(email, reserva) {
  if (!email || !reserva?.canchaId || !reserva?.turnoId) {
    return;
  }

  localStorage.removeItem(
    claveReserva(email, reserva.canchaId, reserva.turnoId),
  );
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

function estadoReservaTexto(estado) {
  const nombres = {
    PENDIENTE_PAGO: 'Pendiente de pago',
    CONFIRMADA: 'Confirmada',
    RECHAZADA: 'Pago rechazado',
    EXPIRADA: 'Retención vencida',
    CANCELADA: 'Cancelada',
    CUMPLIDA: 'Cumplida',
  };

  return nombres[estado] || estado || 'Estado desconocido';
}

function tonoReserva(estado) {
  if (['CONFIRMADA', 'CUMPLIDA'].includes(estado)) {
    return 'success';
  }

  if (estado === 'PENDIENTE_PAGO') {
    return 'warning';
  }

  if (['RECHAZADA', 'EXPIRADA'].includes(estado)) {
    return 'danger';
  }

  return 'neutral';
}

function tiempoRestante(venceEn, ahora) {
  if (!venceEn) return null;

  const segundos = Math.max(
    0,
    Math.floor((Date.parse(venceEn) - ahora) / 1000),
  );

  const minutos = Math.floor(segundos / 60);
  const resto = segundos % 60;

  return `${minutos}:${String(resto).padStart(2, '0')}`;
}

// ============================================
// COMPONENTE PRINCIPAL
// ============================================

export default function GrillaCanchas() {
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
  const [fecha, setFecha] = useState(fechaLocalHoy());

  const [catalogo, setCatalogo] = useState({
    estado: 'inicial',
    items: [],
  });

  const [turnos, setTurnos] = useState({
    estado: 'inicial',
    items: [],
  });

  const [reservas, setReservas] = useState({
    estado: 'inicial',
    items: [],
  });

  const [aviso, setAviso] = useState(null);
  const [accion, setAccion] = useState(null);

  // Refrescos independientes: una operación no reinicia
  // consultas que no necesitan actualizarse.
  const [refrescoCatalogo, setRefrescoCatalogo] = useState(0);
  const [refrescoTurnos, setRefrescoTurnos] = useState(0);
  const [refrescoReservas, setRefrescoReservas] = useState(0);

  const [ahora, setAhora] = useState(Date.now());

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

  // Limpia la clave local cuando una retención vence,
  // incluso si el usuario no recarga la página.
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
      limpiarClaveReserva(user.email, reserva);
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
  }, [token, esRecepcion]);

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
    if (!token || !canchaId || !fecha) {
      setTurnos({
        estado: 'inicial',
        items: [],
      });

      return;
    }

    let activo = true;

    setTurnos({
      estado: 'cargando',
      items: [],
    });

    listarTurnos(canchaId, fecha, fecha)
      .then((datos) => {
        if (!activo) return;

        if (!Array.isArray(datos)) {
          setTurnos({
            estado: 'error',
            items: [],
            mensaje: 'La respuesta de horarios no es válida.',
          });

          return;
        }

        setTurnos({
          estado: 'cargado',
          items: datos,
        });
      })
      .catch((error) => {
        if (activo) {
          setTurnos({
            estado: 'error',
            items: [],
            mensaje: mensajeError(error, 'turnos'),
          });
        }
      });

    return () => {
      activo = false;
    };
  }, [token, canchaId, fecha, refrescoTurnos]);

  // ==========================================
  // CONSULTAR RESERVAS
  // ==========================================

  useEffect(() => {
    if (!token) return;

    if (esRecepcion && !sedeId) {
      setReservas({
        estado: 'inicial',
        items: [],
      });

      return;
    }

    let activo = true;

    setReservas({
      estado: 'cargando',
      items: [],
    });

    const consulta = user?.rol === 'USUARIO'
      ? listarMisReservas(0, 20)
      : listarReservas(
          esRecepcion
            ? sedeId
            : esGerente
              ? sedeId || null
              : null,
          0,
          20,
        );

    consulta
      .then((datos) => {
        if (!activo) return;

        if (!Array.isArray(datos)) {
          setReservas({
            estado: 'error',
            items: [],
            mensaje: 'La respuesta de reservas no es válida.',
          });

          return;
        }

        // Liberamos claves de reservas que ya finalizaron.
        if (['USUARIO', 'GERENTE'].includes(user?.rol)) {
          datos
            .filter((reserva) => esEstadoFinal(reserva.estado))
            .forEach((reserva) => {
              limpiarClaveReserva(user.email, reserva);
              expiracionesAtendidas.current.add(reserva.id);
            });
        }

        setReservas({
          estado: 'cargado',
          items: datos,
        });
      })
      .catch((error) => {
        if (activo) {
          setReservas({
            estado: 'error',
            items: [],
            mensaje: mensajeError(error, 'reservas'),
          });
        }
      });

    return () => {
      activo = false;
    };
  }, [
    token,
    sedeId,
    user?.rol,
    user?.email,
    esRecepcion,
    esGerente,
    refrescoReservas,
  ]);

  // ==========================================
  // ACTUALIZACIÓN DE CONSULTAS
  // ==========================================

  const actualizarTodo = () => {
    setRefrescoCatalogo((valor) => valor + 1);
    setRefrescoTurnos((valor) => valor + 1);
    setRefrescoReservas((valor) => valor + 1);
  };

  const cambiarSede = (valor) => {
    setSedeId(valor);
    setCanchaId('');
    setAviso(null);
  };

  // ==========================================
  // RETENER TURNO
  // ==========================================

  const reservar = async (turno) => {
    if (!canchaSeleccionada || !puedeReservar) return;

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

      setAviso({
        tipo: 'ok',
        texto: `Turno retenido. Tenés hasta ${formatoFechaHora(reserva.venceEn)} para completar el pago.`,
      });

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
      setAccion(null);
    }
  };

  // ==========================================
  // PAGAR RESERVA
  // ==========================================

  const pagar = async (reserva) => {
    setAccion(`pago-${reserva.id}`);
    setAviso(null);

    try {
      const pago = await pagarReservaCancha(reserva.id);
      const reservaActualizada = await consultarReserva(reserva.id);

      if (
        pago.estado === 'APROBADO' &&
        reservaActualizada.estado === 'CONFIRMADA'
      ) {
        limpiarClaveReserva(user.email, reserva);

        setAviso({
          tipo: 'ok',
          texto: `Pago aprobado. Tu reserva ${reserva.id} quedó confirmada. Ya podés descargar el comprobante desde Comprobantes.`,
        });
      } else if (pago.estado === 'RECHAZADO') {
        limpiarClaveReserva(user.email, reserva);

        setAviso({
          tipo: 'error',
          texto: 'El pago fue rechazado. La reserva quedó rechazada y el turno fue liberado.',
        });
      } else {
        setAviso({
          tipo: 'error',
          texto: `El pago respondió con estado ${pago.estado || 'desconocido'}. Consultá el estado de la reserva antes de volver a operar.`,
        });
      }
    } catch (error) {
      // Recuperación ante una respuesta de pago perdida.
      try {
        const recuperada = await consultarReserva(reserva.id);

        if (recuperada.pagoId != null) {
          const pagoRecuperado = await consultarPago(recuperada.pagoId);

          if (pagoRecuperado.estado === 'APROBADO') {
            limpiarClaveReserva(user.email, reserva);

            setAviso({
              tipo: 'ok',
              texto: 'El pago fue aprobado. Recuperamos el resultado consultando el backend.',
            });
          } else if (pagoRecuperado.estado === 'RECHAZADO') {
            limpiarClaveReserva(user.email, reserva);

            setAviso({
              tipo: 'error',
              texto: 'El pago fue rechazado. El horario quedó liberado.',
            });
          } else {
            setAviso({
              tipo: 'error',
              texto: `El pago existe, pero su estado es ${pagoRecuperado.estado}.`,
            });
          }
        } else {
          setAviso({
            tipo: 'error',
            texto: error.status
              ? mensajeError(error, 'pago')
              : 'No pudimos confirmar si el pago llegó al servidor. Consultá la reserva antes de volver a intentar.',
          });
        }
      } catch {
        setAviso({
          tipo: 'error',
          texto: 'No pudimos recuperar el resultado del pago. Consultá la reserva y su estado antes de volver a operar.',
        });
      }
    } finally {
      setAccion(null);
      actualizarTodo();
    }
  };

  // ==========================================
  // CANCELAR RESERVA Y MOSTRAR DEVOLUCIÓN
  // ==========================================

  const cancelar = async (reserva) => {
    const confirmar = window.confirm(
      `¿Querés cancelar la reserva ${reserva.id} de ${reserva.cancha}? El backend calculará la devolución que corresponda.`,
    );

    if (!confirmar) return;

    setAccion(`cancelar-${reserva.id}`);
    setAviso(null);

    try {
      const respuesta = await cancelarReservaCancha(
        reserva.canchaId,
        reserva.id,
      );

      limpiarClaveReserva(user.email, reserva);

      let texto = 'La reserva fue cancelada correctamente.';

      if (reserva.pagoId != null) {
        if (user.rol === 'RECEPCIONISTA') {
          texto += ` Estado del pago: ${respuesta.estadoPago || 'consultar con Gerencia'}.`;
        } else {
          try {
            const pagoActualizado = await consultarPago(reserva.pagoId);

            const importeDevuelto = Number(
              pagoActualizado.montoReembolsado || 0,
            );

            if (importeDevuelto > 0) {
              texto += ` Devolución registrada: ${formatoPrecio(importeDevuelto)}.`;
            } else {
              texto += ' No se informó un importe devuelto.';
            }

            if (pagoActualizado.estado) {
              texto += ` Estado financiero: ${pagoActualizado.estado}.`;
            }
          } catch {
            texto += ' La cancelación se realizó, pero no pudimos consultar el detalle financiero de la devolución.';
          }
        }
      } else {
        texto += ' La reserva no tenía un pago asociado, por lo que no correspondía procesar una devolución.';
      }

      setAviso({
        tipo: 'ok',
        texto,
      });
    } catch (error) {
      setAviso({
        tipo: 'error',
        texto: mensajeError(error, 'cancelacion'),
      });
    } finally {
      setAccion(null);
      actualizarTodo();
    }
  };

  // ==========================================
  // INTERFAZ
  // ==========================================

  const reservasVisibles = reservas.items || [];

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
          actions={
            <StatusBadge tone="neutral">
              {esRecepcion
                ? 'Sede operativa'
                : esGerente
                  ? 'Gerencia'
                  : 'Reservas online'}
            </StatusBadge>
          }
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
                  disabled={esRecepcion}
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
                    disabled={!cancha.activa}
                    aria-pressed={String(cancha.id) === String(canchaId)}
                    onClick={() => {
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
                  min={fechaLocalHoy()}
                  value={fecha}
                  onChange={(evento) => setFecha(evento.target.value)}
                />
              </label>

              <p>
                Cancha seleccionada:{' '}
                <strong>{canchaSeleccionada.nombre}</strong>
              </p>
            </div>
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
                title="Sin horarios para esta fecha"
                description="No hay turnos registrados para la cancha y fecha elegidas."
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
                        <span>Precio total</span>

                        <strong>
                          {formatoPrecio(turno.precio.total)}
                        </strong>

                        <small>
                          Importe informativo hasta retener el turno.
                        </small>
                      </div>
                    )}

                    <AppButton
                      type="button"
                      size="sm"
                      disabled={
                        !puedeReservar ||
                        !turno.disponible ||
                        accion === `reserva-${turno.id}`
                      }
                      onClick={() => reservar(turno)}
                    >
                      {!puedeReservar
                        ? 'Solo consulta'
                        : accion === `reserva-${turno.id}`
                          ? 'Reservando...'
                          : 'Retener turno'}
                    </AppButton>
                  </article>
                ))}
              </div>
            )
          )}
        </DataCard>

        {/* RESERVAS */}

        <DataCard
          title={
            user?.rol === 'USUARIO'
              ? 'Mis reservas'
              : esRecepcion
                ? 'Reservas de tu sede'
                : 'Reservas registradas'
          }
          description="El estado y los importes de cada reserva provienen del backend."
          action={
            <AppButton
              size="sm"
              variant="secondary"
              onClick={actualizarTodo}
            >
              <RefreshCw size={15} />
              Actualizar
            </AppButton>
          }
        >
          {reservas.estado === 'cargando' && (
            <p role="status">Consultando reservas...</p>
          )}

          {reservas.estado === 'error' && (
            <p role="alert">{reservas.mensaje}</p>
          )}

          {reservas.estado === 'cargado' &&
            reservasVisibles.length === 0 && (
              <EmptyState
                icon={CalendarDays}
                title="Todavía no hay reservas"
                description="Cuando se registren reservas, aparecerán en esta sección."
              />
            )}

          {reservas.estado === 'cargado' &&
            reservasVisibles.length > 0 && (
              <div className="m4-reservas-lista">
                {reservasVisibles.map((reserva) => {
                  const vencida =
                    reserva.estado === 'PENDIENTE_PAGO' &&
                    reserva.venceEn &&
                    Date.parse(reserva.venceEn) <= ahora;

                  const estadoVisual = vencida
                    ? 'EXPIRADA'
                    : reserva.estado;

                  const puedePagar =
                    puedeReservar &&
                    !vencida &&
                    reserva.estado === 'PENDIENTE_PAGO' &&
                    reserva.venceEn &&
                    Date.parse(reserva.venceEn) > ahora;

                  const puedeCancelar =
                    ['USUARIO', 'RECEPCIONISTA', 'GERENTE'].includes(user?.rol) &&
                    ['PENDIENTE_PAGO', 'CONFIRMADA'].includes(reserva.estado) &&
                    Date.parse(reserva.inicio) > ahora;

                  return (
                    <article
                      className="m4-reserva"
                      key={reserva.id}
                    >
                      <div className="m4-reserva__datos">
                        <div className="m4-reserva__titulo">
                          <strong>{reserva.cancha}</strong>

                          <StatusBadge tone={tonoReserva(estadoVisual)}>
                            {estadoReservaTexto(estadoVisual)}
                          </StatusBadge>
                        </div>

                        <p>
                          {reserva.sede} · {reserva.tipo}
                        </p>

                        <p>
                          {formatoFechaHora(reserva.inicio)}
                          {' – '}
                          {formatoFechaHora(reserva.fin)}
                        </p>

                        <p>
                          Reserva #{reserva.id}
                          {' · '}
                          {formatoPrecio(reserva.precioAplicado)}
                        </p>

                        {reserva.estado === 'PENDIENTE_PAGO' &&
                          reserva.venceEn &&
                          !vencida && (
                            <p className="m4-vencimiento">
                              <Clock3 size={15} />
                              Vence en {tiempoRestante(reserva.venceEn, ahora)}
                            </p>
                          )}

                        {reserva.estadoPago && (
                          <p>
                            Estado del pago:{' '}
                            <strong>{reserva.estadoPago}</strong>
                          </p>
                        )}
                      </div>

                      <div className="m4-reserva__acciones">
                        {puedePagar && (
                          <AppButton
                            size="sm"
                            disabled={accion === `pago-${reserva.id}`}
                            onClick={() => pagar(reserva)}
                          >
                            <Wallet size={15} />

                            {accion === `pago-${reserva.id}`
                              ? 'Procesando...'
                              : 'Pagar reserva'}
                          </AppButton>
                        )}

                        {puedeCancelar && (
                          <AppButton
                            size="sm"
                            variant="secondary"
                            disabled={accion === `cancelar-${reserva.id}`}
                            onClick={() => cancelar(reserva)}
                          >
                            {accion === `cancelar-${reserva.id}`
                              ? 'Cancelando...'
                              : 'Cancelar'}
                          </AppButton>
                        )}
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
        </DataCard>

        {puedeReservar && (
          <p className="m4-nota">
            La reserva queda pendiente hasta que el pago sea aprobado.
            El importe definitivo se fija al retener el turno.
            Consultá tus comprobantes en{' '}
            <Link to="/comprobantes">Comprobantes</Link>.
          </p>
        )}

      </div>
    </div>
  );
}
