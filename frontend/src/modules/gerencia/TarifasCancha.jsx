import { useEffect, useRef, useState } from 'react';
import { actualizarRecargoPico, actualizarTipoCancha, crearTipoCancha, listarCanchasDeSede, listarTiposCancha } from '../../services/gerenciaService';
import { AppButton, DataCard } from '../../components/ui/FitZoneUI';
import { formatearPesos } from './reportesUtils';

const mensaje = (e) => e?.status === 403 ? 'No tenés autorización para esta operación.' : e?.status === 409 ? 'Ya existe un tipo de cancha con ese nombre.'
  : e?.status === 400 ? (e.message || 'Revisá los datos ingresados.') : e?.status === 404 ? 'No se encontró el recurso solicitado.' : 'No pudimos completar la operación. Reintentá.';

/**
 * Tarifas de cancha que define el Gerente Central: el precio estándar por hora de cada tipo (global) y el recargo del
 * horario pico (19:00 a 21:00) de cada sede. El descuento a socios (15 %) y el cálculo del precio final los hace
 * el servicio de reservas; acá no se calculan importes.
 */
export default function TarifasCancha({ sedes }) {
  const [tipos, setTipos] = useState({ estado: 'cargando' });
  const [form, setForm] = useState({ id: null, nombre: '', precioHora: '' });
  const [aviso, setAviso] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [sedeId, setSedeId] = useState('');
  const [recargo, setRecargo] = useState({ estado: 'inicial' });
  const [nuevoRecargo, setNuevoRecargo] = useState('');
  const [avisoRecargo, setAvisoRecargo] = useState('');
  const [revision, setRevision] = useState(0);
  const enviando = useRef(false);

  useEffect(() => {
    let activo = true;
    listarTiposCancha().then((datos) => { if (activo) setTipos({ estado: 'cargado', datos }); },
      (e) => { if (activo) setTipos({ estado: 'error', mensaje: mensaje(e) }); });
    return () => { activo = false; };
  }, [revision]);

  useEffect(() => {
    if (!sedeId) { setRecargo({ estado: 'inicial' }); return undefined; }
    let activo = true;
    setRecargo({ estado: 'cargando' });
    listarCanchasDeSede(sedeId).then((canchas) => { if (activo) setRecargo({ estado: 'cargado', valor: canchas[0]?.recargoPico ?? null, hayCanchas: canchas.length > 0 }); },
      (e) => { if (activo) setRecargo({ estado: 'error', mensaje: mensaje(e) }); });
    return () => { activo = false; };
  }, [sedeId, revision]);

  const guardarTipo = async (e) => {
    e.preventDefault();
    const precio = Number(form.precioHora);
    if (enviando.current || !form.nombre.trim() || !(precio > 0)) return;
    enviando.current = true; setGuardando(true); setAviso('');
    try {
      const datos = { nombre: form.nombre.trim(), precioHora: precio };
      if (form.id === null) await crearTipoCancha(datos); else await actualizarTipoCancha(form.id, datos);
      setAviso(form.id === null ? 'Tipo de cancha creado.' : 'Tarifa actualizada.');
      setForm({ id: null, nombre: '', precioHora: '' });
      setRevision((v) => v + 1);
    } catch (error) { setAviso(mensaje(error)); }
    finally { enviando.current = false; setGuardando(false); }
  };

  const guardarRecargo = async (e) => {
    e.preventDefault();
    const valor = Number(nuevoRecargo);
    if (enviando.current || !sedeId || nuevoRecargo === '' || !(valor >= 0 && valor <= 100)) return;
    enviando.current = true; setGuardando(true); setAvisoRecargo('');
    try {
      await actualizarRecargoPico(sedeId, valor);
      setAvisoRecargo('Recargo del horario pico actualizado.');
      setNuevoRecargo('');
      setRevision((v) => v + 1);
    } catch (error) { setAvisoRecargo(mensaje(error)); }
    finally { enviando.current = false; setGuardando(false); }
  };

  return <DataCard title="Tarifas de cancha y horario pico"
    description="Precio estándar por hora de cada tipo de cancha (vale para toda la cadena) y recargo del horario pico de 19:00 a 21:00 por sede. El descuento del 15 % a socios y el precio final los calcula el servicio de reservas.">
    <h3>Precio por hora de cada tipo</h3>
    {tipos.estado === 'cargando' && <p role="status">Consultando tarifas...</p>}
    {tipos.estado === 'error' && <p role="alert">{tipos.mensaje}</p>}
    {tipos.estado === 'cargado' && (tipos.datos.length === 0 ? <p>No hay tipos de cancha cargados.</p>
      : <div className="gerencia-tabla" role="region" aria-label="Tarifas por tipo de cancha" tabIndex={0}><table>
        <thead><tr><th>Tipo</th><th className="num">Precio por hora</th><th><span className="gerencia-oculto">Acción</span></th></tr></thead>
        <tbody>{tipos.datos.map((t) => <tr key={t.id}><td>{t.nombre}</td><td className="num">{formatearPesos(t.precioHora)}</td>
          <td><AppButton variant="secondary" onClick={() => { setForm({ id: t.id, nombre: t.nombre, precioHora: String(t.precioHora) }); setAviso(''); }}>Editar<span className="gerencia-oculto"> {t.nombre}</span></AppButton></td></tr>)}</tbody></table></div>)}
    <form onSubmit={guardarTipo}><fieldset disabled={guardando}>
      <h3>{form.id === null ? 'Nuevo tipo de cancha' : 'Editar tarifa'}</h3>
      <div className="gerencia-form">
        <label>Nombre del tipo<input required maxLength={255} value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} /></label>
        <label>Precio por hora (ARS)<input required type="number" min="0.01" step="0.01" value={form.precioHora} onChange={(e) => setForm({ ...form, precioHora: e.target.value })} /></label>
      </div>
      <div className="gerencia-acciones">
        <AppButton type="submit">{guardando ? 'Guardando...' : form.id === null ? 'Crear tipo' : 'Guardar tarifa'}</AppButton>
        {form.id !== null && <AppButton type="button" variant="secondary" onClick={() => { setForm({ id: null, nombre: '', precioHora: '' }); setAviso(''); }}>Cancelar edición</AppButton>}
      </div>
      {aviso && <p role="status">{aviso}</p>}
    </fieldset></form>

    <h3>Recargo del horario pico por sede</h3>
    <form onSubmit={guardarRecargo}><fieldset disabled={guardando}>
      <div className="gerencia-form">
        <label>Sede<select value={sedeId} onChange={(e) => { setSedeId(e.target.value); setAvisoRecargo(''); setNuevoRecargo(''); }}>
          <option value="">Elegí una sede</option>{sedes.map((s) => <option key={s.id} value={s.id}>{s.nombre}</option>)}</select></label>
        <label>Nuevo recargo (%)<input type="number" min="0" max="100" step="0.01" value={nuevoRecargo} disabled={!sedeId} onChange={(e) => setNuevoRecargo(e.target.value)} /></label>
      </div>
      {recargo.estado === 'cargando' && <p role="status">Consultando recargo actual...</p>}
      {recargo.estado === 'error' && <p role="alert">{recargo.mensaje}</p>}
      {recargo.estado === 'cargado' && <p>{recargo.valor === null ? 'Esta sede todavía no tiene canchas, por eso no hay un recargo vigente para mostrar; igual podés configurarlo.' : `Recargo vigente: ${Number(recargo.valor)} % sobre el precio estándar de 19:00 a 21:00.`}</p>}
      <AppButton type="submit">Guardar recargo</AppButton>
      {avisoRecargo && <p role="status">{avisoRecargo}</p>}
    </fieldset></form>
  </DataCard>;
}
