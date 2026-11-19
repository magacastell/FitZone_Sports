import { useEffect, useRef, useState } from 'react';
import { ArrowDownToLine, ArrowUpFromLine, CheckCircle2, Clock3, ScanLine, XCircle } from 'lucide-react';
import { AppButton, PanelHeading } from '../../components/ui/FitZoneUI';
import { registrarIngreso, registrarSalida } from '../../services/m2Service';
import EscanerQr from './EscanerQr';

function errorMovimiento(error) {
  const status = error.status;
  if (!status || status >= 500) return {
    estado: 'error', titulo: 'No pudimos confirmar el movimiento',
    mensaje: 'El servidor pudo haber guardado el movimiento. Revisá los movimientos recientes antes de volver a escanear.',
  };
  if (status === 401) return {
    estado: 'rechazo', titulo: 'Sesión requerida', mensaje: 'Volvé a ingresar con tu cuenta de Recepción.',
  };
  const motivos = {
    400: 'El código no es válido o faltan datos. Volvé a escanear el QR.',
    403: 'No se autorizó la operación. Revisá la membresía, la cuenta o los permisos de sede.',
    404: 'No encontramos el ingreso o los datos necesarios para registrar el movimiento.',
    409: 'El QR puede haber vencido o existir un ingreso incompatible. Verificá el estado antes de continuar.',
  };
  const detalle = error.data?.detail || error.data?.message;
  return { estado: 'rechazo', titulo: 'Operación denegada', mensaje: typeof detalle === 'string' ? detalle : motivos[status] || 'No se pudo registrar el movimiento.' };
}

export default function LectorAcceso({ sedeNombre, onMovimiento, procesarMovimiento, bloqueado = false }) {
  const [modo, setModo] = useState('ingreso');
  const [procesando, setProcesando] = useState(false);
  const [resultado, setResultado] = useState(null);
  const [fotoFallida, setFotoFallida] = useState(false);
  const [camara, setCamara] = useState(null);
  const enviando = useRef(false);
  const montado = useRef(false);
  const escaneo = useRef(null);
  useEffect(() => { montado.current = true; return () => { montado.current = false; }; }, []);
  useEffect(() => {
    if (!resultado) return;
    const temporizador = setTimeout(() => setResultado(null), 4000);
    return () => clearTimeout(temporizador);
  }, [resultado]);

  const cambiarModo = (nuevo) => {
    if (enviando.current || escaneo.current) return;
    setModo(nuevo); setResultado(null); setFotoFallida(false);
  };
  const enviarCodigo = async (lectura) => {
    lectura = lectura.trim();
    if (enviando.current || bloqueado || !lectura) return;
    enviando.current = true;
    setProcesando(true); setResultado(null); setFotoFallida(false);
    try {
      const enLinea = () => modo === 'ingreso'
        ? registrarIngreso(lectura)
        : registrarSalida(lectura);
      const respuesta = await procesarMovimiento(modo === 'ingreso' ? 'INGRESO' : 'SALIDA', lectura, enLinea);
      if (!montado.current) return;
      setResultado(respuesta.acceso
        ? { estado: 'exito', titulo: modo === 'ingreso' ? 'Ingreso autorizado' : 'Salida registrada', acceso: respuesta.acceso, modo }
        : { estado: 'provisional', titulo: 'Movimiento provisional', mensaje: respuesta.mensaje });
      if (respuesta.acceso) onMovimiento();
    } catch (error) {
      if (!montado.current) return;
      setResultado(errorMovimiento(error));
      // Puede haberse confirmado en servidor y perdido la respuesta: consultar, no sumar/restar localmente.
      if (!error.status || error.status >= 500) {
        onMovimiento();
      }
    } finally {
      enviando.current = false;
      if (montado.current) setProcesando(false);
    }
  };
  const hora = resultado?.acceso?.[resultado.modo === 'ingreso' ? 'ingreso' : 'salida'];
  const foto = resultado?.acceso?.titular?.foto;
  const fotoValida = typeof foto === 'string' && /^data:image\/(png|jpeg);base64,[A-Za-z0-9+/]+={0,2}$/.test(foto);
  return <section className="panel reader-panel" aria-label="Validar movimiento">
    <PanelHeading title="Validar movimiento" description="Escaneá el QR de la credencial digital." action={<span className="reader-ready"><ScanLine size={16} aria-hidden="true" />{procesando ? 'Procesando' : 'Esperando QR'}</span>} />
    <div className="reader-tabs" role="group" aria-label="Tipo de movimiento">
      <button type="button" aria-pressed={modo === 'ingreso'} className={`reader-tab${modo === 'ingreso' ? ' reader-tab--active' : ''}`} disabled={procesando || camara} onClick={() => cambiarModo('ingreso')}><ArrowDownToLine aria-hidden="true" />Ingreso</button>
      <button type="button" aria-pressed={modo === 'salida'} className={`reader-tab${modo === 'salida' ? ' reader-tab--active' : ''}`} disabled={procesando || camara} onClick={() => cambiarModo('salida')}><ArrowUpFromLine aria-hidden="true" />Salida</button>
    </div>
    <AppButton type="button" className="reader-camera" disabled={procesando || !!camara || bloqueado} onClick={() => {
      if (escaneo.current || enviando.current) return;
      escaneo.current = {};
      setResultado(null);
      setCamara(escaneo.current);
    }}><ScanLine aria-hidden="true" />Escanear QR</AppButton>
    {camara && <EscanerQr onCerrar={() => { escaneo.current = null; setCamara(null); }} onLeer={lectura => {
      if (escaneo.current !== camara) return;
      escaneo.current = null;
      setCamara(null);
      return enviarCodigo(lectura);
    }} />}
    {(resultado || procesando) &&
    <div className={`access-result access-result--${resultado?.estado || 'inicial'}`} role={resultado && ['rechazo', 'error'].includes(resultado.estado) ? 'alert' : 'status'}>
      <span className="access-result__icon" aria-hidden="true">{resultado?.estado === 'exito' ? <CheckCircle2 /> : resultado && resultado.estado !== 'provisional' ? <XCircle /> : <Clock3 />}</span>
      <div className="access-result__copy"><strong>{procesando ? 'Validando movimiento...' : resultado?.titulo || 'Esperando lectura'}</strong>
        {resultado?.acceso ? <><span>{resultado.acceso.titular?.nombre} {resultado.acceso.titular?.apellido}</span><span>{sedeNombre}{hora && ` · ${new Date(hora).toLocaleString('es-AR', { timeZone: 'America/Argentina/Buenos_Aires', hour12: false })}`}</span></> : <span>{resultado?.mensaje || 'El resultado aparecerá acá. Podés procesar una persona por vez.'}</span>}
      </div>
      {fotoValida && !fotoFallida && <img className="access-result__photo" src={foto} onError={() => setFotoFallida(true)} alt="Foto del titular" width="48" height="48" />}
    </div>}
  </section>;
}
