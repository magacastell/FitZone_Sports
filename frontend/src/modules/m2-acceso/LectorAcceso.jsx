import { useEffect, useRef, useState } from 'react';
import { ArrowDownToLine, ArrowUpFromLine, CheckCircle2, Clock3, QrCode, ScanLine, XCircle } from 'lucide-react';
import { AppButton, PanelHeading } from '../../components/ui/FitZoneUI';
import { registrarIngreso, registrarSalida } from '../../services/m2Service';
import EscanerQr from './EscanerQr';

function errorMovimiento(error, modo) {
  const status = error.status;
  if (!status || status >= 500) return {
    estado: 'error', titulo: 'No pudimos confirmar el movimiento',
    mensaje: 'El servidor pudo haber guardado el movimiento. Verificá el resultado con la sede antes de registrarlo otra vez, incluso en la terminal de contingencia.',
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
  return { estado: 'rechazo', titulo: modo === 'ingreso' ? 'Acceso rechazado' : 'Salida no registrada', mensaje: typeof detalle === 'string' ? detalle : motivos[status] || 'No se pudo registrar el movimiento.' };
}

export default function LectorAcceso({ sedeId, sedeNombre, esGerente, onMovimiento, procesarMovimiento, bloqueado = false }) {
  const [modo, setModo] = useState('ingreso');
  const [codigo, setCodigo] = useState('');
  const [procesando, setProcesando] = useState(false);
  const [resultado, setResultado] = useState(null);
  const [fotoFallida, setFotoFallida] = useState(false);
  const [identificacionSalida, setIdentificacionSalida] = useState('qr');
  const [camara, setCamara] = useState(false);
  const [incierto, setIncierto] = useState(false);
  const enviando = useRef(false);
  const montado = useRef(false);
  const input = useRef(null);
  useEffect(() => { montado.current = true; return () => { montado.current = false; }; }, []);
  useEffect(() => { if (!procesando) input.current?.focus(); }, [procesando, modo]);

  const cambiarModo = (nuevo) => {
    if (enviando.current) return;
    setModo(nuevo); setIdentificacionSalida('qr'); setCodigo(''); setResultado(null); setFotoFallida(false);
  };
  const enviarCodigo = async (lectura) => {
    lectura = lectura.trim();
    if (enviando.current || incierto || bloqueado || !lectura) return;
    const porId = modo === 'salida' && identificacionSalida === 'id';
    if (porId && (!/^[1-9]\d*$/.test(lectura) || Number(lectura) > 2147483647)) {
      setResultado({ estado: 'rechazo', titulo: 'Salida no registrada', mensaje: 'Indicá un número de ingreso válido.' });
      return;
    }
    enviando.current = true;
    setProcesando(true); setResultado(null); setFotoFallida(false);
    try {
      const enLinea = () => modo === 'ingreso'
        ? registrarIngreso(lectura, esGerente ? sedeId : undefined)
        : porId ? registrarSalida(null, Number(lectura)) : registrarSalida(lectura);
      const respuesta = procesarMovimiento
        ? await procesarMovimiento(modo === 'ingreso' ? 'INGRESO' : 'SALIDA', lectura, porId, enLinea)
        : { acceso: await enLinea() };
      if (!montado.current) return;
      setResultado(respuesta.acceso
        ? { estado: 'exito', titulo: modo === 'ingreso' ? 'Acceso autorizado' : 'Salida registrada', acceso: respuesta.acceso, modo }
        : { estado: 'provisional', titulo: 'Movimiento provisional', mensaje: respuesta.mensaje });
      onMovimiento();
    } catch (error) {
      if (!montado.current) return;
      setResultado(errorMovimiento(error, modo));
      // Puede haberse confirmado en servidor y perdido la respuesta: consultar, no sumar/restar localmente.
      if (!error.status || error.status >= 500) {
        if (!procesarMovimiento) setIncierto(true);
        onMovimiento();
      }
    } finally {
      enviando.current = false;
      if (montado.current) { setCodigo(''); setProcesando(false); }
    }
  };
  const hora = resultado?.acceso?.[resultado.modo === 'ingreso' ? 'ingreso' : 'salida'];
  const foto = resultado?.acceso?.titular?.foto;
  const fotoValida = typeof foto === 'string' && /^data:image\/(png|jpeg);base64,[A-Za-z0-9+/]+={0,2}$/.test(foto);
  return <section className="panel reader-panel" aria-label="Validar movimiento">
    <PanelHeading title="Validar movimiento" description="Escaneá el QR de la credencial digital." action={<span className="reader-ready"><ScanLine size={16} aria-hidden="true" />{procesando ? 'Procesando' : 'Esperando QR'}</span>} />
    <div className="reader-tabs" role="group" aria-label="Tipo de movimiento">
      <button type="button" aria-pressed={modo === 'ingreso'} className={`reader-tab${modo === 'ingreso' ? ' reader-tab--active' : ''}`} disabled={procesando} onClick={() => cambiarModo('ingreso')}><ArrowDownToLine aria-hidden="true" />Ingreso</button>
      <button type="button" aria-pressed={modo === 'salida'} className={`reader-tab${modo === 'salida' ? ' reader-tab--active' : ''}`} disabled={procesando} onClick={() => cambiarModo('salida')}><ArrowUpFromLine aria-hidden="true" />Salida</button>
    </div>
    <form className="reader-form" onSubmit={evento => { evento.preventDefault(); return enviarCodigo(codigo); }} aria-busy={procesando}>
      {modo === 'salida' && <label>Identificar salida mediante<select value={identificacionSalida} disabled={procesando}
        onChange={(event) => { setIdentificacionSalida(event.target.value); setCodigo(''); setResultado(null); setFotoFallida(false); }}>
        <option value="qr">Código QR vigente</option><option value="id">Número de ingreso</option>
      </select></label>}
      <label htmlFor="access-code">{modo === 'salida' && identificacionSalida === 'id' ? 'Número de ingreso' : 'Contenido del código QR'}</label>
      <div className="reader-input-row"><QrCode aria-hidden="true" /><input ref={input} id="access-code" value={codigo} onChange={(e) => setCodigo(e.target.value)} disabled={procesando || incierto || bloqueado} required autoComplete="off" spellCheck={false} autoCapitalize="none" aria-describedby="access-code-help" placeholder="Escaneá o pegá el contenido del QR" /><AppButton type="submit" disabled={procesando || incierto || bloqueado || !codigo.trim()}><ScanLine aria-hidden="true" />{procesando ? 'Procesando...' : modo === 'ingreso' ? 'Validar ingreso' : 'Registrar salida'}</AppButton></div>
      <p className="reader-helper" id="access-code-help">{modo === 'salida' && identificacionSalida === 'id' ? 'Ingresá el número de la confirmación de ingreso. Permite registrar la salida aunque el QR o la membresía hayan vencido.' : 'Usá el lector 2D o pegá el contenido completo del QR y presioná Enter.'}</p>
    </form>
    {identificacionSalida === 'qr' && <AppButton type="button" onClick={() => setCamara(true)} disabled={procesando || incierto || bloqueado}>Escanear QR</AppButton>}
    {camara && <EscanerQr onCerrar={() => setCamara(false)} onLeer={lectura => { setCamara(false); enviarCodigo(lectura); }} />}
    <div className={`access-result access-result--${resultado?.estado || 'inicial'}`} role={resultado && ['rechazo', 'error'].includes(resultado.estado) ? 'alert' : 'status'}>
      <span className="access-result__icon" aria-hidden="true">{resultado?.estado === 'exito' ? <CheckCircle2 /> : resultado && resultado.estado !== 'provisional' ? <XCircle /> : <Clock3 />}</span>
      <div className="access-result__copy"><strong>{procesando ? 'Validando movimiento...' : resultado?.titulo || 'Esperando lectura'}</strong>
        {resultado?.acceso && <span>Ingreso #{resultado.acceso.id}</span>}
        {resultado?.acceso ? <><span>{resultado.acceso.titular?.nombre} {resultado.acceso.titular?.apellido}</span><span>{sedeNombre}{hora && ` · ${new Date(hora).toLocaleString('es-AR', { timeZone: 'America/Argentina/Buenos_Aires', hour12: false })}`}</span></> : <span>{resultado?.mensaje || 'El resultado aparecerá acá. Podés procesar una persona por vez.'}</span>}
      </div>
      {fotoValida && !fotoFallida && <img className="access-result__photo" src={foto} onError={() => setFotoFallida(true)} alt="Foto del titular" width="48" height="48" />}
    </div>
    {incierto && <AppButton type="button" variant="secondary" onClick={() => { setIncierto(false); setResultado(null); }}>Ya verifiqué el resultado</AppButton>}
  </section>;
}
