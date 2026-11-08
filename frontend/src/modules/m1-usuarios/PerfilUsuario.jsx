import { useOutletContext } from 'react-router-dom';
import { useEffect, useRef, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { actualizarMiFoto, actualizarMiPerfil, consultarMiPerfil } from '../../services/m1Service';
import SelectorFoto from '../../components/SelectorFoto';
import { validarFoto } from '../../services/fotoPerfil';
import { DatosPersonales, mensajePortal } from './PortalSocioCards';
import { AppButton, AppLink, DataCard, PageHeading } from '../../components/ui/FitZoneUI';
import './PortalSocio.css';

export default function PerfilUsuario() {
  const { user, token } = useAuth();
  const { membresia, actualizarPerfil } = useOutletContext();
  const [perfil, setPerfil] = useState({ estado: 'cargando' });
  const [edicion, setEdicion] = useState(null);
  const [mensaje, setMensaje] = useState(null);
  const guardando = useRef(false);
  const sesion = useRef(null);
  const montado = useRef(false);
  const [consulta, setConsulta] = useState(0);
  const [foto, setFoto] = useState(null);
  const [estadoFoto, setEstadoFoto] = useState({ estado: 'inicial' });
  useEffect(() => {
    let activo = true;
    montado.current = true;
    sesion.current = token;
    setPerfil({ estado: 'cargando' });
    setEdicion(null);
    setMensaje(null);
    setFoto(null);
    setEstadoFoto({ estado: 'inicial' });
    consultarMiPerfil().then(
      (datos) => { if (activo && localStorage.getItem('token') === token) setPerfil({ estado: 'cargado', datos }); },
      (error) => { if (activo) setPerfil({ estado: 'error', mensaje: error.message }); },
    );
    return () => { activo = false; montado.current = false; };
  }, [token, consulta]);

  const guardar = async (event) => {
    event.preventDefault();
    if (guardando.current || !edicion) return;
    if (!sesion.current || localStorage.getItem('token') !== sesion.current) {
      setMensaje({ error: true, texto: 'La sesión cambió. Recargá antes de editar el perfil.' });
      return;
    }
    if ([edicion.nombre, edicion.apellido].some((valor) => !/\S/.test(valor) || valor.length > 255)) {
      setMensaje({ error: true, texto: 'Nombre y apellido deben contener texto y tener hasta 255 caracteres.' });
      return;
    }
    guardando.current = true;
    const tokenEnvio = sesion.current;
    setMensaje({ texto: 'Guardando perfil…' });
    try {
      const datos = await actualizarMiPerfil({ nombre: edicion.nombre, apellido: edicion.apellido });
      if (!montado.current || localStorage.getItem('token') !== tokenEnvio) return;
      setPerfil({ estado: 'cargado', datos });
      actualizarPerfil?.(datos);
      setEdicion(null);
      setMensaje({ texto: 'Perfil actualizado.' });
    } catch (error) {
      if (montado.current && localStorage.getItem('token') === tokenEnvio) {
        setMensaje({ error: true, texto: `${mensajePortal(error.message)} Podés volver a guardar los mismos datos o recargar el perfil para verificar el resultado.` });
      }
    } finally {
      guardando.current = false;
    }
  };
  const guardarFoto = async (event) => {
    event.preventDefault();
    if (guardando.current) return;
    const problema = validarFoto(foto);
    if (problema) { setEstadoFoto({ estado: 'error', mensaje: problema }); return; }
    if (!token || localStorage.getItem('token') !== token) {
      setEstadoFoto({ estado: 'error', mensaje: 'La sesión cambió. Recargá antes de continuar.' }); return;
    }
    guardando.current = true;
    setEstadoFoto({ estado: 'guardando' });
    try {
      const datos = await actualizarMiFoto(foto);
      if (!montado.current || localStorage.getItem('token') !== token) return;
      setPerfil({ estado: 'cargado', datos }); actualizarPerfil?.(datos);
      setEstadoFoto({ estado: 'exito', mensaje: 'Foto actualizada.' });
    } catch (error) {
      if (montado.current && localStorage.getItem('token') === token) setEstadoFoto({ estado: 'error', mensaje: `${mensajePortal(error.message)} Podés reintentar con el mismo archivo o recargar para verificar el resultado.` });
    } finally { guardando.current = false; }
  };
  const esCliente = user?.rol === 'USUARIO';
  return (
    <div className="fitzone-ui portal-perfil">
      <PageHeading eyebrow="MI CUENTA" title="Perfil" description="Tu identidad y los datos de tu cuenta FitZone." />
      <DatosPersonales perfil={perfil} mostrarEnlace={false} rol={user?.rol} membresia={membresia} />
      {perfil.estado === 'error' && <AppButton type="button" onClick={() => setConsulta((valor) => valor + 1)}>Reintentar consulta del perfil</AppButton>}
      {perfil.estado === 'cargado' && <DataCard title="Editar datos personales" description="Podés modificar tu nombre y apellido. DNI, correo, rol y sede se conservan.">
        {!edicion ? <AppButton type="button" onClick={() => { setEdicion({ nombre: perfil.datos.nombre || '', apellido: perfil.datos.apellido || '' }); setMensaje(null); }}>Editar perfil</AppButton>
          : <form className="portal-perfil-form" onSubmit={guardar} aria-busy={guardando.current}>
            <fieldset disabled={guardando.current}>
              <legend className="sr-only">Datos editables</legend>
              {['nombre', 'apellido'].map((campo) => <label key={campo} htmlFor={`perfil-${campo}`}>
                {campo === 'nombre' ? 'Nombre' : 'Apellido'}
                <input id={`perfil-${campo}`} name={campo} autoComplete={campo === 'nombre' ? 'given-name' : 'family-name'} required maxLength={255} value={edicion[campo]}
                  onChange={(event) => setEdicion({ ...edicion, [campo]: event.target.value })} />
              </label>)}
            </fieldset>
            <div className="portal-form-actions">
              <AppButton type="submit" disabled={guardando.current}>Guardar cambios</AppButton>
              <AppButton type="button" variant="secondary" disabled={guardando.current} onClick={() => { setEdicion(null); setMensaje(null); }}>Cancelar</AppButton>
              <AppButton type="button" variant="secondary" disabled={guardando.current} onClick={() => setConsulta((valor) => valor + 1)}>Recargar perfil</AppButton>
            </div>
          </form>}
        {mensaje && <p role={mensaje.error ? 'alert' : 'status'}>{mensaje.texto}</p>}
      </DataCard>}
      {perfil.estado === 'cargado' && <DataCard title="Foto de perfil" description="Podés cargar o reemplazar tu foto sin contratar una membresía.">
        <form onSubmit={guardarFoto} aria-busy={estadoFoto.estado === 'guardando'}>
          <SelectorFoto key={consulta} id="perfil-foto" onSeleccionar={setFoto} disabled={guardando.current} />
          <AppButton type="submit" disabled={!foto || guardando.current}>{estadoFoto.estado === 'guardando' ? 'Guardando foto…' : 'Guardar foto'}</AppButton>
          {estadoFoto.mensaje && <p role={estadoFoto.estado === 'error' ? 'alert' : 'status'}>{estadoFoto.mensaje}</p>}
        </form>
      </DataCard>}
      {esCliente && <AppLink variant="primary" to="/membresia">Ir a mi membresía</AppLink>}
    </div>
  );
}
