import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { fetchAPI } from '../../services/api';

// RF-05: el aforo se refresca solo para que recepción lo vea "en tiempo real".
const REFRESCO_AFORO_MS = 15000;

// RF-04: el lector 2D escribe el contenido del QR en el campo y envía Enter.
function EscanerQr({ titulo, etiquetaBoton, ruta, tituloExito, sedeId, deshabilitado, onRegistrado, autoFocus }) {
  const [qrToken, setQrToken] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [resultado, setResultado] = useState(null);
  const inputRef = useRef(null);

  const enviar = async (e) => {
    e.preventDefault();
    setEnviando(true);
    setResultado(null);
    try {
      const acceso = await fetchAPI(ruta, {
        method: 'POST',
        body: JSON.stringify({ qrToken: qrToken.trim(), ...(sedeId && { sedeId }) }),
      });
      setResultado({ ok: true, acceso });
      onRegistrado();
    } catch (err) {
      setResultado({ ok: false, mensaje: err.message });
    } finally {
      setQrToken('');
      setEnviando(false);
      inputRef.current?.focus();
    }
  };

  return (
    <form onSubmit={enviar} style={{ border: '1px solid #e2e8f0', padding: '1rem', borderRadius: '6px' }}>
      <h4>{titulo}</h4>
      <input
        ref={inputRef}
        type="text"
        autoFocus={autoFocus}
        required
        autoComplete="off"
        value={qrToken}
        onChange={(e) => setQrToken(e.target.value)}
        placeholder="Escanear código QR..."
        aria-label={`Contenido del código QR (${etiquetaBoton})`}
        style={{ width: '100%', padding: '0.5rem', marginBottom: '0.5rem', boxSizing: 'border-box' }}
      />
      <button type="submit" disabled={enviando || deshabilitado} style={{ width: '100%', padding: '0.5rem', background: '#0284c7', color: '#fff', border: 'none' }}>
        {enviando ? 'Procesando...' : etiquetaBoton}
      </button>

      <div aria-live="polite" style={{ marginTop: '0.75rem' }}>
        {resultado?.ok && (
          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', padding: '0.5rem', background: '#ecfdf5', borderRadius: '6px', color: '#065f46' }}>
            {resultado.acceso.titular.foto && (
              <img src={resultado.acceso.titular.foto} alt="" width="48" height="48" style={{ borderRadius: '50%', objectFit: 'cover' }} />
            )}
            <div>
              <strong>{tituloExito}</strong>
              <div>{resultado.acceso.titular.nombre} {resultado.acceso.titular.apellido}</div>
            </div>
          </div>
        )}
        {resultado && !resultado.ok && (
          <div role="alert" style={{ padding: '0.5rem', background: '#fef2f2', borderRadius: '6px', color: '#b91c1c' }}>
            {resultado.mensaje}
          </div>
        )}
      </div>
    </form>
  );
}

export default function ControlAccesoSede() {
  const { user } = useAuth();
  const esGerente = user?.rol === 'GERENTE';

  const [sedes, setSedes] = useState([]);
  const [sedeId, setSedeId] = useState(null);
  const [aforo, setAforo] = useState(null);
  const [errorAforo, setErrorAforo] = useState('');

  // Recepción opera la sede de su usuario; el gerente elige entre todas.
  useEffect(() => {
    let activo = true;
    (async () => {
      try {
        const [yo, todas] = await Promise.all([
          fetchAPI('/usuarios/me'),
          esGerente ? fetchAPI('/sedes') : Promise.resolve([]),
        ]);
        if (!activo) return;
        setSedes(esGerente ? todas : [{ id: yo.sedeId, nombre: yo.sedeNombre }]);
        setSedeId(esGerente ? todas[0]?.id ?? null : yo.sedeId);
      } catch (err) {
        if (activo) setErrorAforo(err.message);
      }
    })();
    return () => { activo = false; };
  }, [esGerente]);

  const refrescarAforo = useCallback(async () => {
    if (!sedeId) return;
    try {
      setAforo(await fetchAPI(`/accesos/sedes/${sedeId}/aforo`));
      setErrorAforo('');
    } catch (err) {
      setErrorAforo(err.message);
    }
  }, [sedeId]);

  useEffect(() => {
    setAforo(null);
    refrescarAforo();
    const intervalo = setInterval(refrescarAforo, REFRESCO_AFORO_MS);
    return () => clearInterval(intervalo);
  }, [refrescarAforo]);

  const sedeActual = sedes.find((s) => s.id === sedeId);
  const completo = aforo && aforo.ocupacionActual >= aforo.capacidadMaxima;
  // Al gerente hay que decirle la sede; recepción la toma el servidor de su usuario.
  const sedeParaEnviar = esGerente ? sedeId : undefined;

  return (
    <div style={{ maxWidth: '800px', background: '#fff', padding: '1.5rem', borderRadius: '8px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
        <h2>M2 — Control de Acceso{sedeActual && !esGerente ? ` (${sedeActual.nombre})` : ''}</h2>
      </div>

      {esGerente && (
        <div style={{ marginTop: '1rem' }}>
          <label htmlFor="acceso-sede" style={{ marginRight: '0.5rem' }}>Sede:</label>
          <select id="acceso-sede" value={sedeId ?? ''} onChange={(e) => setSedeId(Number(e.target.value))}>
            {sedes.map((s) => <option key={s.id} value={s.id}>{s.nombre}</option>)}
          </select>
        </div>
      )}

      {/* RF-05: aforo actual y máximo de la sede */}
      <div style={{ margin: '1.5rem 0', padding: '1rem', background: '#f8fafc', borderLeft: `4px solid ${completo ? '#ef4444' : '#0284c7'}` }}>
        <h3 aria-live="polite">
          {aforo
            ? `Aforo Actual de la Sede: ${aforo.ocupacionActual} / ${aforo.capacidadMaxima} personas`
            : errorAforo || 'Calculando aforo...'}
        </h3>
        {completo && (
          <p role="status" style={{ color: '#b91c1c', fontWeight: 'bold' }}>
            La sede alcanzó su capacidad máxima. Es un aviso: no se bloquean ingresos.
          </p>
        )}
        <p style={{ fontSize: '0.9rem', color: '#64748b' }}>
          * Cuenta a las personas con un ingreso sin salida registrada. Es informativo. Las reservas de gimnasio no existen.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem' }}>
        <EscanerQr
          titulo="Validar acceso (lector QR 2D)"
          etiquetaBoton="Validar ingreso"
          ruta="/accesos/ingresos"
          tituloExito="Ingreso registrado"
          sedeId={sedeParaEnviar}
          deshabilitado={!sedeId}
          onRegistrado={refrescarAforo}
          autoFocus
        />

        <EscanerQr
          titulo="Salida (Lector QR 2D)"
          etiquetaBoton="Registrar Salida"
          ruta="/accesos/salidas"
          tituloExito="Salida registrada"
          deshabilitado={!sedeId}
          onRegistrado={refrescarAforo}
        />

      </div>
    </div>
  );
}
