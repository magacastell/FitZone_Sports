import { useCallback, useEffect, useRef, useState } from 'react';
import { listarSedes, consultarReporteAccesos, consultarReporteFinanciero } from '../../services/gerenciaService';
import { AppButton, DataCard } from '../../components/ui/FitZoneUI';
import {
  PERIODOS_RAPIDOS, fechaCorta, fechaHoraLegible, fechaLegible, formatearEntero, formatearMinutos, formatearPesos,
  formatearPorcentaje, hoyArgentina, mensajeDeError, parametrosDeRango, validarRango,
} from './reportesUtils';

const CARGANDO = { estado: 'cargando' };

/** Pide los dos reportes en paralelo; cada uno se muestra con su propio estado, así un error no oculta al otro. */
function useReportes() {
  const [accesos, setAccesos] = useState({ estado: 'inicial' });
  const [finanzas, setFinanzas] = useState({ estado: 'inicial' });
  const pedido = useRef(0);
  const consultar = useCallback((filtros) => {
    const numero = ++pedido.current;
    const params = parametrosDeRango(filtros);
    setAccesos(CARGANDO);
    setFinanzas(CARGANDO);
    const resolver = (promesa, fijar) => promesa.then(
      (datos) => { if (numero === pedido.current) fijar({ estado: 'cargado', datos, filtros }); },
      (error) => { if (numero === pedido.current) fijar({ estado: 'error', mensaje: mensajeDeError(error) }); },
    );
    resolver(consultarReporteFinanciero(params), setFinanzas);
    resolver(consultarReporteAccesos(params), setAccesos);
  }, []);
  useEffect(() => () => { pedido.current += 1; }, []);
  return { accesos, finanzas, consultar };
}

export default function ReportesGerencia() {
  const hoy = hoyArgentina();
  const inicial = PERIODOS_RAPIDOS[1].rango(hoy);
  const [form, setForm] = useState({ ...inicial, sedeId: '' });
  const [error, setError] = useState('');
  const [sedes, setSedes] = useState({ estado: 'cargando', datos: [] });
  const { accesos, finanzas, consultar } = useReportes();

  useEffect(() => {
    let activo = true;
    listarSedes().then((datos) => { if (activo) setSedes({ estado: 'cargado', datos }); },
      () => { if (activo) setSedes({ estado: 'error', datos: [] }); });
    consultar({ ...inicial, sedeId: '' });
    return () => { activo = false; };
    // Una sola consulta inicial con el período por defecto.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const enviar = (e) => {
    e?.preventDefault();
    const problema = validarRango(form);
    setError(problema);
    if (!problema) consultar(form);
  };
  const aplicarPeriodo = (rapido) => {
    const nuevo = { ...form, ...rapido.rango(hoy) };
    setForm(nuevo);
    setError('');
    consultar(nuevo);
  };
  const nombreSede = (id) => sedes.datos.find((s) => String(s.id) === String(id))?.nombre;

  return <>
    <DataCard title="Período y alcance" description="Elegí los días a analizar y, si querés, una sola sede. Las fechas son inclusivas y en hora argentina.">
      <form onSubmit={enviar} noValidate>
        <div className="gerencia-form">
          <label>Desde<input type="date" required max={form.hasta || hoy} value={form.desde} onChange={(e) => setForm({ ...form, desde: e.target.value })} /></label>
          <label>Hasta (incluido)<input type="date" required value={form.hasta} onChange={(e) => setForm({ ...form, hasta: e.target.value })} /></label>
          <label>Sede
            <select value={form.sedeId} onChange={(e) => setForm({ ...form, sedeId: e.target.value })}>
              <option value="">Toda la cadena</option>
              {sedes.datos.map((s) => <option key={s.id} value={s.id}>{s.nombre}</option>)}
            </select>
          </label>
        </div>
        {sedes.estado === 'error' && <p role="alert">No pudimos cargar la lista de sedes; igual podés consultar toda la cadena.</p>}
        {error && <p role="alert" className="gerencia-error">{error}</p>}
        <div className="gerencia-acciones">
          <AppButton type="submit">Consultar reportes</AppButton>
          {PERIODOS_RAPIDOS.map((p) => <AppButton key={p.id} type="button" variant="secondary" onClick={() => aplicarPeriodo(p)}>{p.etiqueta}</AppButton>)}
        </div>
      </form>
    </DataCard>

    <DataCard title="Cobros y devoluciones" description={descripcion(finanzas, nombreSede, 'Pesos argentinos (ARS). Incluye membresías y reservas de cancha.')}>
      <Estado consulta={finanzas} reintentar={enviar} vacio="Consultá un período para ver cobros y devoluciones.">{(r) => <Finanzas r={r} />}</Estado>
    </DataCard>

    <DataCard title="Accesos a las sedes" description={descripcion(accesos, nombreSede, 'Ingresos históricos registrados. No es el aforo de hoy.')}>
      <Estado consulta={accesos} reintentar={enviar} vacio="Consultá un período para ver los accesos.">{(r) => <Accesos r={r} />}</Estado>
    </DataCard>

    <DataCard title="Cómo leer estos números">
      <ul className="gerencia-glosario">
        <li><strong>Cobros brutos:</strong> pagos aprobados cuya fecha de pago cae en el período. Los pagos rechazados no suman.</li>
        <li><strong>Devoluciones:</strong> reembolsos hechos dentro del período, aunque el pago original sea de otro período.</li>
        <li><strong>Neto:</strong> cobros brutos menos devoluciones. Puede ser negativo si se devolvió más de lo cobrado en el período.</li>
        <li><strong>Sede de un cobro:</strong> la sede de la membresía contratada o de la cancha reservada, no la sede actual del usuario.</li>
        <li><strong>Ingresos:</strong> entradas registradas en la base central. Los ingresos tomados sin conexión aparecen cuando el terminal sincroniza.</li>
        <li><strong>Pico simultáneo:</strong> máximo de personas dentro a la vez entre los ingresos del período, y su porcentaje sobre la capacidad de la sede.</li>
        <li><strong>Aforo actual:</strong> es otra cosa: cuántas personas hay dentro ahora. Se consulta en el Panel general.</li>
      </ul>
    </DataCard>
  </>;
}

function descripcion(consulta, nombreSede, base) {
  if (consulta.estado !== 'cargado') return base;
  const { filtros } = consulta;
  const alcance = filtros.sedeId ? `sede ${nombreSede(filtros.sedeId) || `#${filtros.sedeId}`}` : 'toda la cadena';
  return `${base} Del ${fechaLegible(filtros.desde)} al ${fechaLegible(filtros.hasta)}, ${alcance}. Generado el ${fechaHoraLegible(consulta.datos.generadoEn)}.`;
}

function Estado({ consulta, reintentar, vacio, children }) {
  if (consulta.estado === 'inicial') return <p>{vacio}</p>;
  if (consulta.estado === 'cargando') return <p role="status">Consultando datos...</p>;
  if (consulta.estado === 'error') return <div><p role="alert">{consulta.mensaje}</p><AppButton variant="secondary" onClick={() => reintentar()}>Reintentar</AppButton></div>;
  return children(consulta.datos);
}

function Indicador({ titulo, valor, detalle, tono }) {
  return <div className={`gerencia-indicador${tono ? ` gerencia-indicador--${tono}` : ''}`}>
    <span>{titulo}</span><strong>{valor}</strong>{detalle && <small>{detalle}</small>}
  </div>;
}

function Finanzas({ r }) {
  const t = r.totales;
  const sinMovimientos = t.cantidadCobros === 0 && t.cantidadDevoluciones === 0;
  return <>
    <div className="gerencia-indicadores">
      <Indicador titulo="Cobros brutos" valor={formatearPesos(t.cobrosBrutos)} detalle={`${formatearEntero(t.cantidadCobros)} ${t.cantidadCobros === 1 ? 'cobro' : 'cobros'}`} />
      <Indicador titulo="Devoluciones" valor={formatearPesos(t.devoluciones)} detalle={`${formatearEntero(t.cantidadDevoluciones)} ${t.cantidadDevoluciones === 1 ? 'devolución' : 'devoluciones'}`} />
      <Indicador titulo="Neto" valor={formatearPesos(t.neto)} detalle="Cobros menos devoluciones" tono={t.neto < 0 ? 'negativo' : undefined} />
      <Indicador titulo="Pagos rechazados" valor={formatearEntero(t.operacionesRechazadas)} detalle="No suman a ningún importe" />
    </div>
    {sinMovimientos && <p className="gerencia-sin-datos">No hay cobros ni devoluciones en este período. Probá con un rango más amplio.</p>}
    {!sinMovimientos && <>
      <h3>Evolución diaria</h3>
      <Barras etiqueta="Cobros y devoluciones por día" dias={r.porDia} formato={formatearPesos}
        series={[{ clave: 'cobrosBrutos', nombre: 'Cobros', clase: 'cobros' }, { clave: 'devoluciones', nombre: 'Devoluciones', clase: 'devoluciones' }]} />
      <h3>Por sede</h3>
      <TablaSedes etiqueta="Cobros y devoluciones por sede" filas={r.porSede} clave={(x) => x.sedeId ?? 'sin-sede'}
        activa={(x) => x.cantidadCobros + x.cantidadDevoluciones > 0}
        encabezado={<><th>Sede</th><th className="num">Cobros brutos</th><th className="num">Devoluciones</th><th className="num">Neto</th><th className="num">Cobros</th></>}
        fila={(x) => <><td>{x.sedeNombre ?? 'Sin sede asignable'}</td><td className="num">{formatearPesos(x.cobrosBrutos)}</td>
          <td className="num">{formatearPesos(x.devoluciones)}</td><td className={`num${x.neto < 0 ? ' negativo' : ''}`}>{formatearPesos(x.neto)}</td>
          <td className="num">{formatearEntero(x.cantidadCobros)}</td></>}
        total={<><td>Total</td><td className="num">{formatearPesos(t.cobrosBrutos)}</td><td className="num">{formatearPesos(t.devoluciones)}</td>
          <td className={`num${t.neto < 0 ? ' negativo' : ''}`}>{formatearPesos(t.neto)}</td><td className="num">{formatearEntero(t.cantidadCobros)}</td></>} />
      <h3>Por concepto</h3>
      <div className="gerencia-tabla" role="region" aria-label="Cobros y devoluciones por concepto" tabIndex={0}>
        <table><thead><tr><th>Concepto</th><th className="num">Cobros brutos</th><th className="num">Devoluciones</th><th className="num">Neto</th></tr></thead>
          <tbody>{r.porConcepto.map((c) => <tr key={c.concepto}><td>{c.concepto === 'MEMBRESIA' ? 'Membresías' : c.concepto === 'RESERVA_CANCHA' ? 'Reservas de cancha' : c.concepto}</td>
            <td className="num">{formatearPesos(c.cobrosBrutos)}</td><td className="num">{formatearPesos(c.devoluciones)}</td>
            <td className={`num${c.neto < 0 ? ' negativo' : ''}`}>{formatearPesos(c.neto)}</td></tr>)}</tbody></table>
      </div>
    </>}
    <Advertencias lista={r.advertencias} />
  </>;
}

function Accesos({ r }) {
  const s = r.resumen;
  return <>
    <div className="gerencia-indicadores">
      <Indicador titulo="Ingresos" valor={formatearEntero(s.totalIngresos)} detalle="Entradas registradas" />
      <Indicador titulo="Personas distintas" valor={formatearEntero(s.usuariosUnicos)} detalle="Usuarios únicos que ingresaron" />
      <Indicador titulo="Permanencia media" valor={formatearMinutos(s.permanenciaMediaMinutos)} detalle="Solo ingresos con salida registrada" />
      <Indicador titulo="Ingresos sin salida" valor={formatearEntero(s.ingresosSinSalida)} detalle={`${formatearEntero(s.ingresosOffline)} registrados sin conexión`} />
    </div>
    {s.totalIngresos === 0 ? <p className="gerencia-sin-datos">No hay ingresos registrados en este período.</p> : <>
      <h3>Evolución diaria</h3>
      <Barras etiqueta="Ingresos por día" dias={r.porDia} formato={formatearEntero}
        series={[{ clave: 'totalIngresos', nombre: 'Ingresos', clase: 'ingresos' }]} />
      <h3>Por sede</h3>
      <TablaSedes etiqueta="Accesos por sede" filas={r.porSede} clave={(x) => x.sedeId} activa={(x) => x.totalIngresos > 0}
        encabezado={<><th>Sede</th><th className="num">Ingresos</th><th className="num">Personas</th><th className="num">Pico simultáneo</th><th className="num">Permanencia media</th></>}
        fila={(x) => <><td>{x.sedeNombre}</td><td className="num">{formatearEntero(x.totalIngresos)}</td><td className="num">{formatearEntero(x.usuariosUnicos)}</td>
          <td className="num">{formatearEntero(x.picoSimultaneo)} de {formatearEntero(x.capacidadMaxima)} ({formatearPorcentaje(x.porcentajePico)})</td>
          <td className="num">{formatearMinutos(x.permanenciaMediaMinutos)}</td></>}
        total={<><td>Total</td><td className="num">{formatearEntero(s.totalIngresos)}</td><td className="num">{formatearEntero(s.usuariosUnicos)}</td><td className="num">—</td>
          <td className="num">{formatearMinutos(s.permanenciaMediaMinutos)}</td></>} />
    </>}
    <Advertencias lista={r.advertencias} />
  </>;
}

/** Tabla por sede: primero las sedes con movimiento; las que están en cero quedan plegadas para no tapar el resto. */
function TablaSedes({ etiqueta, filas, clave, activa, encabezado, fila, total }) {
  const [todas, setTodas] = useState(false);
  const conDatos = filas.filter(activa);
  const visibles = todas ? filas : conDatos;
  const ocultas = filas.length - conDatos.length;
  return <>
    <div className="gerencia-tabla" role="region" aria-label={etiqueta} tabIndex={0}>
      <table><thead><tr>{encabezado}</tr></thead>
        <tbody>{visibles.map((x) => <tr key={clave(x)}>{fila(x)}</tr>)}</tbody>
        <tfoot><tr>{total}</tr></tfoot></table>
    </div>
    {ocultas > 0 && <AppButton type="button" variant="secondary" onClick={() => setTodas(!todas)}>
      {todas ? 'Ocultar las sedes sin movimientos' : `Ver las ${ocultas} ${ocultas === 1 ? 'sede' : 'sedes'} sin movimientos`}</AppButton>}
  </>;
}

function Advertencias({ lista }) {
  return <details className="gerencia-notas"><summary>Qué tener en cuenta</summary><ul>{lista.map((a) => <li key={a}>{a}</li>)}</ul></details>;
}

/** Barras simples en SVG con los mismos datos del reporte (sin librerías). Con más de una serie se agrupan por día. */
function Barras({ etiqueta, dias, series, formato }) {
  const ancho = 720, alto = 180, margen = 6;
  const maximo = Math.max(1, ...dias.flatMap((d) => series.map((s) => Number(d[s.clave]))));
  const paso = (ancho - margen * 2) / dias.length;
  const anchoBarra = Math.max(1, Math.min(28, (paso - 2) / series.length));
  const resumen = `${etiqueta}: ${dias.length} días, máximo diario ${formato(maximo)}.`;
  return <figure className="gerencia-grafico">
    <svg viewBox={`0 0 ${ancho} ${alto + 18}`} role="img" aria-label={resumen} preserveAspectRatio="none">
      <line x1="0" x2={ancho} y1={alto} y2={alto} className="eje" />
      {dias.map((d, i) => series.map((s, j) => {
        const valor = Number(d[s.clave]);
        const h = (valor / maximo) * (alto - 14);
        const x = margen + i * paso + (paso - anchoBarra * series.length) / 2 + j * anchoBarra;
        return <rect key={`${d.fecha}-${s.clave}`} x={x} y={alto - h} width={anchoBarra} height={h} className={`barra barra--${s.clase}`}>
          <title>{`${fechaLegible(d.fecha)} · ${s.nombre}: ${formato(valor)}`}</title></rect>;
      }))}
      <text x={margen} y={alto + 14} className="etiqueta">{fechaCorta(dias[0].fecha)}</text>
      <text x={ancho - margen} y={alto + 14} textAnchor="end" className="etiqueta">{fechaCorta(dias[dias.length - 1].fecha)}</text>
    </svg>
    <figcaption>
      {series.map((s) => <span key={s.clave} className="gerencia-leyenda"><i className={`barra--${s.clase}`} />{s.nombre}</span>)}
      <span>Máximo diario: {formato(maximo)}</span>
    </figcaption>
  </figure>;
}
