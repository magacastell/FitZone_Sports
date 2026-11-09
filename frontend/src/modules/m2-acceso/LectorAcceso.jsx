import { useEffect, useRef, useState } from 'react';
import { ArrowDownToLine, ArrowUpFromLine, CheckCircle2, Clock3, QrCode, ScanLine, XCircle } from 'lucide-react';
import { AppButton, PanelHeading } from '../../components/ui/FitZoneUI';
import { registrarIngreso, registrarSalida } from '../../services/m2Service';

function errorMovimiento(error, modo) {
  const status = error.status;
  if (!status || status >= 500) return {
    estado: 'error', titulo: 'No pudimos confirmar el movimiento',
    mensaje: 'Revisá el aforo y verificá el resultado antes de volver a intentarlo.',
  };
  const motivos = {
    400: 'El código no es válido o faltan datos. Volvé a escanear el QR.',
    401: 'Tu sesión ya no está disponible. Volvé a ingresar.',
    403: 'No se autorizó la operación. Revisá la membresía, la cuenta o los permisos de sede.',
    404: 'No encontramos el ingreso o los datos necesarios para registrar el movimiento.',
    409: 'El QR puede haber vencido o existir un ingreso incompatible. Verificá el estado antes de continuar.',
  };
  const detalle = error.data?.detail || error.data?.message;
  return { estado: 'rechazo', titulo: modo === 'ingreso' ? 'Acceso rechazado' : 'Salida no registrada', mensaje: typeof detalle === 'string' ? detalle : motivos[status] || 'No se pudo registrar el movimiento.' };
}

export default function LectorAcceso({ sedeId, sedeNombre, esGerente, onMovimiento }) {
  const [modo, setModo] = useState('ingreso');
  const [codigo, setCodigo] = useState('');
  const [procesando, setProcesando] = useState(false);
  const [resultado, setResultado] = useState(null);
  const enviando = useRef(false);
  const montado = useRef(false);
  const input = useRef(null);
  useEffect(() => { montado.current = true; return () => { montado.current = false; }; }, []);
  useEffect(() => { if (!procesando) input.current?.focus(); }, [procesando, modo]);

  const cambiarModo = (nuevo) => {
    if (enviando.current) return;
    setModo(nuevo); setCodigo(''); setResultado(null);
  };
  const enviar = async (event) => {
    event.preventDefault();
    if (enviando.current || !codigo.trim()) return;
    enviando.current = true;
    setProcesando(true); setResultado(null);
    try {
      const acceso = modo === 'ingreso'
        ? await registrarIngreso(codigo.trim(), esGerente ? sedeId : undefined)
        : await registrarSalida(codigo.trim());
      if (!montado.current) return;
      setResultado({ estado: 'exito', titulo: modo === 'ingreso' ? 'Acceso autorizado' : 'Salida registrada', acceso, modo });
      onMovimiento();
    } catch (error) {
      if (!montado.current) return;
      setResultado(errorMovimiento(error, modo));
      // Puede haberse confirmado en servidor y perdido la respuesta: consultar, no sumar/restar localmente.
      if (!error.status || error.status >= 500) onMovimiento();
    } finally {
      enviando.current = false;
      if (montado.current) { setCodigo(''); setProcesando(false); }
    }
  };
  const hora = resultado?.acceso?.[resultado.modo === 'ingreso' ? 'ingreso' : 'salida'];
  return <section className="panel reader-panel" aria-label="Validar movimiento">
    <PanelHeading title="Validar movimiento" description="Escaneá el QR de la credencial digital." action={<span className="reader-ready"><ScanLine size={16} aria-hidden="true" />{procesando ? 'Procesando' : 'Esperando QR'}</span>} />
    <div className="reader-tabs" role="group" aria-label="Tipo de movimiento">
      <button type="button" aria-pressed={modo === 'ingreso'} className={`reader-tab${modo === 'ingreso' ? ' reader-tab--active' : ''}`} disabled={procesando} onClick={() => cambiarModo('ingreso')}><ArrowDownToLine aria-hidden="true" />Ingreso</button>
      <button type="button" aria-pressed={modo === 'salida'} className={`reader-tab${modo === 'salida' ? ' reader-tab--active' : ''}`} disabled={procesando} onClick={() => cambiarModo('salida')}><ArrowUpFromLine aria-hidden="true" />Salida</button>
    </div>
    <form className="reader-form" onSubmit={enviar} aria-busy={procesando}>
      <label htmlFor="access-code">Contenido del código QR</label>
      <div className="reader-input-row"><QrCode aria-hidden="true" /><input ref={input} id="access-code" value={codigo} onChange={(e) => setCodigo(e.target.value)} disabled={procesando} required autoComplete="off" spellCheck={false} autoCapitalize="none" aria-describedby="access-code-help" placeholder="Escaneá o pegá el contenido del QR" /><AppButton type="submit" disabled={procesando || !codigo.trim()}><ScanLine aria-hidden="true" />{procesando ? 'Procesando...' : modo === 'ingreso' ? 'Validar ingreso' : 'Registrar salida'}</AppButton></div>
      <p className="reader-helper" id="access-code-help">Usá el lector 2D o pegá el contenido completo del QR y presioná Enter.</p>
    </form>
    <div className={`access-result access-result--${resultado?.estado || 'inicial'}`} role={resultado && resultado.estado !== 'exito' ? 'alert' : 'status'} aria-live={resultado && resultado.estado !== 'exito' ? 'assertive' : 'polite'}>
      <span className="access-result__icon" aria-hidden="true">{resultado?.estado === 'exito' ? <CheckCircle2 /> : resultado ? <XCircle /> : <Clock3 />}</span>
      <div className="access-result__copy"><strong>{procesando ? 'Validando movimiento...' : resultado?.titulo || 'Esperando lectura'}</strong>
        {resultado?.acceso ? <><span>{resultado.acceso.titular?.nombre} {resultado.acceso.titular?.apellido}</span><span>{sedeNombre}{hora && ` · ${new Date(hora).toLocaleString('es-AR', { timeZone: 'America/Argentina/Buenos_Aires', hour12: false })}`}</span></> : <span>{resultado?.mensaje || 'El resultado aparecerá acá. Podés procesar una persona por vez.'}</span>}
      </div>
      {resultado?.acceso?.titular?.foto && <img className="access-result__photo" src={resultado.acceso.titular.foto} alt="Foto del titular" width="48" height="48" />}
    </div>
  </section>;
}
