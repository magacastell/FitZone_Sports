import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { listarPlanes, crearPlan, actualizarPlan, desactivarPlan } from '../../services/planesService';
import '../gerencia/Gerencia.css';

const FORMULARIO_INICIAL = { nombre: '', duracionMeses: '1', precio: '', activo: true };

function mensajeError(error) {
  if (!error.status) return 'No pudimos conectar con el servidor. Verificá tu conexión e intentá nuevamente.';
  if (error.status === 401) return 'Tu sesión no es válida. Volvé a iniciar sesión.';
  if (error.status === 403) return 'No tenés permisos para administrar planes.';
  if (error.status === 404) return 'El plan ya no está disponible. Actualizá el listado antes de continuar.';
  if (error.status >= 500) return 'El servidor no pudo completar la operación. Intentá nuevamente más tarde.';
  if (error.status === 409) return 'No se pudo guardar por un conflicto con los datos existentes. Comprobá que el nombre no esté repetido.';
  if (error.status === 400) return 'Revisá los datos: nombre, duración de 1, 3 o 12 meses y precio positivo con hasta dos decimales.';
  return 'No pudimos completar la operación. Intentá nuevamente.';
}

export default function GestionPlanes() {
  const { user } = useAuth();
  if (!user) return <p role="status">Cargando sesión...</p>;
  if (user.rol !== 'GERENTE') return (
    <section>
      <h2>Planes de membresía</h2>
      <p role="alert">No tenés permisos para administrar planes.</p>
      <Link to="/perfil">Volver a mi perfil</Link>
    </section>
  );
  return <GestionPlanesContenido />;
}

function GestionPlanesContenido() {
  const [listado, setListado] = useState({ estado: 'cargando', datos: [] });
  const [formulario, setFormulario] = useState(FORMULARIO_INICIAL);
  const [editando, setEditando] = useState(null);
  const [confirmacion, setConfirmacion] = useState(null);
  const [ocupado, setOcupado] = useState(false);
  const [error, setError] = useState('');
  const [exito, setExito] = useState('');
  const enviando = useRef(false);
  const montado = useRef(false);
  const consulta = useRef(0);

  const cargarPlanes = async () => {
    const version = ++consulta.current;
    setListado((anterior) => ({ ...anterior, estado: 'cargando' }));
    try {
      const datos = await listarPlanes(true);
      if (montado.current && version === consulta.current) setListado({ estado: 'cargado', datos });
    } catch (fallo) {
      if (montado.current && version === consulta.current) setListado({ estado: 'error', datos: [], mensaje: mensajeError(fallo) });
    }
  };

  useEffect(() => {
    montado.current = true;
    cargarPlanes();
    return () => { montado.current = false; consulta.current++; };
  }, []);

  const limpiarFormulario = () => {
    setEditando(null);
    setFormulario(FORMULARIO_INICIAL);
    setError('');
  };

  const editar = (plan) => {
    if (enviando.current) return;
    setEditando(plan.id);
    setFormulario({ nombre: plan.nombre, duracionMeses: String(plan.duracionMeses), precio: String(plan.precio), activo: plan.activo });
    setConfirmacion(null);
    setError('');
    setExito('');
  };

  const guardar = async (event) => {
    event.preventDefault();
    if (enviando.current) return;
    enviando.current = true;
    setOcupado(true);
    setError('');
    setExito('');
    const datos = { nombre: formulario.nombre, duracionMeses: Number(formulario.duracionMeses), precio: formulario.precio };
    try {
      if (editando === null) await crearPlan(datos);
      else await actualizarPlan(editando, { ...datos, activo: formulario.activo });
      if (!montado.current) return;
      setExito(editando === null ? 'Plan creado correctamente.' : 'Plan actualizado correctamente.');
      limpiarFormulario();
      await cargarPlanes();
    } catch (fallo) {
      if (montado.current) setError(mensajeError(fallo));
    } finally {
      enviando.current = false;
      if (montado.current) setOcupado(false);
    }
  };

  const confirmarDesactivacion = async () => {
    if (enviando.current || !confirmacion) return;
    enviando.current = true;
    setOcupado(true);
    setError('');
    setExito('');
    try {
      await desactivarPlan(confirmacion.id);
      if (!montado.current) return;
      if (editando === confirmacion.id) limpiarFormulario();
      setConfirmacion(null);
      setExito('Plan desactivado. Ya no estará disponible para nuevas contrataciones.');
      await cargarPlanes();
    } catch (fallo) {
      if (montado.current) setError(mensajeError(fallo));
    } finally {
      enviando.current = false;
      if (montado.current) setOcupado(false);
    }
  };

  const bloqueado = ocupado || listado.estado === 'cargando';
  return (
    <section className="gerencia-planes">
      <h2>Planes de membresía</h2>
      {exito && <p role="status">{exito}</p>}
      {error && <p role="alert">{error}</p>}

      <form onSubmit={guardar} aria-labelledby="plan-formulario-titulo" aria-busy={ocupado}>
        <h3 id="plan-formulario-titulo">{editando === null ? 'Crear plan' : `Editar plan: ${formulario.nombre}`}</h3>
        <fieldset disabled={bloqueado || confirmacion !== null} style={{ display: 'grid', gap: '0.75rem', border: '1px solid #e2e8f0', padding: '1rem' }}>
          <label htmlFor="plan-nombre">Nombre</label>
          <input id="plan-nombre" required maxLength={255} value={formulario.nombre} onChange={(e) => setFormulario({ ...formulario, nombre: e.target.value })} />
          <label htmlFor="plan-duracion">Duración</label>
          <select id="plan-duracion" value={formulario.duracionMeses} onChange={(e) => setFormulario({ ...formulario, duracionMeses: e.target.value })}>
            <option value="1">1 mes</option><option value="3">3 meses</option><option value="12">12 meses</option>
          </select>
          <label htmlFor="plan-precio">Precio (ARS)</label>
          <input id="plan-precio" type="number" required min="0.01" step="0.01" value={formulario.precio} onChange={(e) => setFormulario({ ...formulario, precio: e.target.value })} />
          {editando !== null && <label><input type="checkbox" checked={formulario.activo} onChange={(e) => setFormulario({ ...formulario, activo: e.target.checked })} /> Plan activo</label>}
          <div>
            <button className="button button--primary" type="submit">{ocupado ? 'Guardando...' : editando === null ? 'Crear plan' : 'Guardar cambios'}</button>
            {editando !== null && <button className="button button--secondary" type="button" onClick={limpiarFormulario}>Cancelar edición</button>}
          </div>
        </fieldset>
      </form>

      {confirmacion && <div role="region" aria-label="Confirmar desactivación" style={{ marginBlock: '1rem' }}>
        <p>¿Desactivar el plan «{confirmacion.nombre}»? Dejará de ofrecerse para contratar. Se conservará su registro.</p>
        <button className="button button--primary" type="button" disabled={ocupado} onClick={confirmarDesactivacion}>Confirmar desactivación</button>
        <button className="button button--secondary" type="button" disabled={ocupado} onClick={() => setConfirmacion(null)}>Cancelar</button>
      </div>}

      <h3 style={{ marginTop: '1.5rem' }}>Planes activos e inactivos</h3>
      <button className="button button--secondary" type="button" disabled={bloqueado} onClick={cargarPlanes}>Actualizar listado</button>
      {listado.estado === 'cargando' && <p role="status">Cargando planes...</p>}
      {listado.estado === 'error' && <p role="alert">{listado.mensaje}</p>}
      {listado.estado === 'cargado' && (listado.datos.length === 0 ? <p>No hay planes registrados. Podés crear el primero.</p> : (
        <div className="table-scroll" role="region" aria-label="Planes de membresía" tabIndex={0}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead><tr><th scope="col">Nombre</th><th scope="col">Duración</th><th scope="col">Precio (ARS)</th><th scope="col">Estado</th><th scope="col">Acciones</th></tr></thead>
            <tbody>{listado.datos.map((plan) => <tr key={plan.id}>
              <td>{plan.nombre}</td><td>{plan.duracionMeses} {plan.duracionMeses === 1 ? 'mes' : 'meses'}</td>
              <td>{Number(plan.precio).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
              <td>{plan.activo ? 'Activo' : 'Inactivo'}</td>
              <td>
                <button type="button" disabled={bloqueado || confirmacion !== null} aria-label={`Editar ${plan.nombre}`} onClick={() => editar(plan)}>Editar</button>
                {plan.activo && <button type="button" disabled={bloqueado || confirmacion !== null} aria-label={`Desactivar ${plan.nombre}`} onClick={() => { setConfirmacion(plan); setError(''); setExito(''); }}>Desactivar</button>}
              </td>
            </tr>)}</tbody>
          </table>
        </div>
      ))}
    </section>
  );
}
