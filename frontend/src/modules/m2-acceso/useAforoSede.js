import { useCallback, useEffect, useRef, useState } from 'react';
import { consultarAforo } from '../../services/m2Service';

const REFRESCO_MS = 15000;

export default function useAforoSede(sedeId) {
  const [aforo, setAforo] = useState({ sedeId, estado: 'cargando', datos: null });
  const montado = useRef(false);
  const revision = useRef(0);
  const pendiente = useRef(null);

  const refrescar = useCallback((forzar = false) => {
    if (!sedeId || !montado.current) return Promise.resolve();
    // Después de un movimiento, una lectura anterior no debe restaurar el aforo viejo.
    if (forzar) { revision.current++; pendiente.current = null; }
    if (pendiente.current) return pendiente.current;
    const version = revision.current;
    setAforo((actual) => ({ ...actual, estado: actual.datos ? actual.estado : 'cargando', actualizando: true }));
    const consulta = consultarAforo(sedeId).then(
      (datos) => { if (montado.current && version === revision.current) setAforo({ sedeId, estado: 'cargado', datos, actualizando: false }); },
      () => { if (montado.current && version === revision.current) setAforo((actual) => ({ ...actual, estado: 'error', actualizando: false })); },
    ).finally(() => { if (pendiente.current === consulta) pendiente.current = null; });
    pendiente.current = consulta;
    return consulta;
  }, [sedeId]);

  useEffect(() => {
    montado.current = true;
    revision.current++;
    setAforo({ sedeId, estado: 'cargando', datos: null });
    refrescar();
    const intervalo = sedeId ? setInterval(refrescar, REFRESCO_MS) : null;
    return () => {
      montado.current = false;
      revision.current++;
      pendiente.current = null;
      if (intervalo != null) clearInterval(intervalo);
    };
  }, [sedeId, refrescar]);

  return { aforo: aforo.sedeId === sedeId ? aforo : { estado: 'cargando', datos: null }, refrescar };
}
