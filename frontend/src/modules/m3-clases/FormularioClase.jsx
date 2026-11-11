import { useEffect, useState } from 'react';
import { AppButton, DataCard } from '../../components/ui/FitZoneUI';
import { actualizarClase, crearClase, crearInstructor, crearTipoClase, listarInstructores, listarTiposClase } from '../../services/m3Service';
import { aIsoArgentina, aValorLocal } from './claseUtils';

export default function FormularioClase({ claseEditando, esGerente, sedes, sedeInicial, onGuardada, onCancelar }) {
  const editando = Boolean(claseEditando);
  const [tipos, setTipos] = useState([]);
  const [instructores, setInstructores] = useState([]);
  const [form, setForm] = useState({
    tipoClaseId: claseEditando?.tipoClaseId ?? '',
    instructorId: claseEditando?.instructorId ?? '',
    sedeId: sedeInicial ?? '',
    inicio: claseEditando ? aValorLocal(claseEditando.inicio) : '',
    fin: claseEditando ? aValorLocal(claseEditando.fin) : '',
    cupo: claseEditando?.cupo ?? 20,
  });
  const [nuevoTipo, setNuevoTipo] = useState('');
  const [nuevoInstructor, setNuevoInstructor] = useState({ nombre: '', apellido: '' });
  const [error, setError] = useState('');
  const [enviando, setEnviando] = useState(false);

  const cargarCatalogos = () => Promise.all([listarTiposClase(), listarInstructores()]).then(
    ([t, i]) => { setTipos(t); setInstructores(i); },
    (e) => setError(e.message),
  );
  useEffect(() => { cargarCatalogos(); }, []);

  const cambiar = (campo) => (e) => setForm({ ...form, [campo]: e.target.value });

  const agregarTipo = async () => {
    try {
      const tipo = await crearTipoClase({ nombre: nuevoTipo });
      setNuevoTipo(''); setError('');
      await cargarCatalogos();
      setForm((f) => ({ ...f, tipoClaseId: tipo.id }));
    } catch (e) { setError(e.message); }
  };
  const agregarInstructor = async () => {
    try {
      const instructor = await crearInstructor(nuevoInstructor);
      setNuevoInstructor({ nombre: '', apellido: '' }); setError('');
      await cargarCatalogos();
      setForm((f) => ({ ...f, instructorId: instructor.id }));
    } catch (e) { setError(e.message); }
  };

  const guardar = async (e) => {
    e.preventDefault();
    setError('');
    if (form.fin <= form.inicio) { setError('El fin debe ser posterior al inicio.'); return; }
    setEnviando(true);
    const datos = {
      tipoClaseId: Number(form.tipoClaseId),
      instructorId: Number(form.instructorId),
      inicio: aIsoArgentina(form.inicio),
      fin: aIsoArgentina(form.fin),
      cupo: Number(form.cupo),
      ...(esGerente && !editando && { sedeId: Number(form.sedeId) }),
    };
    try {
      const clase = editando ? await actualizarClase(claseEditando.id, datos) : await crearClase(datos);
      onGuardada(clase, editando);
    } catch (err) {
      setError(err.message);
    } finally {
      setEnviando(false);
    }
  };

  return (
    <DataCard title={editando ? `Editar ${claseEditando.nombre}` : 'Nueva clase'}
      description="El nombre de la clase es el del tipo de actividad. Los horarios son de Argentina.">
      <form className="clase-formulario" onSubmit={guardar}>
        {error && <p role="alert" className="agenda-error">{error}</p>}
        {esGerente && !editando && (
          <label>Sede
            <select value={form.sedeId} onChange={cambiar('sedeId')} required>
              <option value="">Seleccioná una sede</option>
              {sedes.map((s) => <option key={s.id} value={s.id}>{s.nombre}</option>)}
            </select>
          </label>
        )}
        <label>Tipo de clase
          <select value={form.tipoClaseId} onChange={cambiar('tipoClaseId')} required>
            <option value="">Seleccioná un tipo</option>
            {tipos.map((t) => <option key={t.id} value={t.id}>{t.nombre}</option>)}
          </select>
        </label>
        <label>Instructor
          <select value={form.instructorId} onChange={cambiar('instructorId')} required>
            <option value="">Seleccioná un instructor</option>
            {instructores.map((i) => <option key={i.id} value={i.id}>{i.apellido}, {i.nombre}</option>)}
          </select>
        </label>
        <label>Inicio<input type="datetime-local" value={form.inicio} onChange={cambiar('inicio')} required /></label>
        <label>Fin<input type="datetime-local" value={form.fin} onChange={cambiar('fin')} required /></label>
        <label>Cupo (lugares)<input type="number" min="1" max="1000" value={form.cupo} onChange={cambiar('cupo')} required /></label>

        <fieldset className="clase-formulario__alta">
          <legend>¿Falta un tipo o un instructor?</legend>
          <div>
            <input aria-label="Nombre del nuevo tipo de clase" placeholder="Nuevo tipo (ej. Boxeo)" value={nuevoTipo} onChange={(e) => setNuevoTipo(e.target.value)} />
            <AppButton type="button" size="sm" variant="secondary" disabled={!nuevoTipo.trim()} onClick={agregarTipo}>Agregar tipo</AppButton>
          </div>
          <div>
            <input aria-label="Nombre del nuevo instructor" placeholder="Nombre" value={nuevoInstructor.nombre} onChange={(e) => setNuevoInstructor({ ...nuevoInstructor, nombre: e.target.value })} />
            <input aria-label="Apellido del nuevo instructor" placeholder="Apellido" value={nuevoInstructor.apellido} onChange={(e) => setNuevoInstructor({ ...nuevoInstructor, apellido: e.target.value })} />
            <AppButton type="button" size="sm" variant="secondary" disabled={!nuevoInstructor.nombre.trim() || !nuevoInstructor.apellido.trim()} onClick={agregarInstructor}>Agregar instructor</AppButton>
          </div>
        </fieldset>

        <div className="clase-formulario__botones">
          <AppButton type="submit" disabled={enviando}>{enviando ? 'Guardando...' : editando ? 'Guardar cambios' : 'Crear clase'}</AppButton>
          <AppButton type="button" variant="secondary" onClick={onCancelar}>Cancelar</AppButton>
        </div>
      </form>
    </DataCard>
  );
}
