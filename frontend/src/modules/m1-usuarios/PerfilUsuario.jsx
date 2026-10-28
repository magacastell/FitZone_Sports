import { useEffect, useState } from 'react';
import { consultarMiPerfil, consultarMiMembresia } from '../../services/m1Service';

export default function PerfilUsuario() {
  const [perfil, setPerfil] = useState({ estado: 'cargando' });
  const [membresia, setMembresia] = useState({ estado: 'cargando' });

  useEffect(() => {
    let activo = true;

    consultarMiPerfil().then(
      (datos) => {
        if (activo) setPerfil({ estado: 'cargado', datos });
      },
      (error) => {
        if (activo) setPerfil({ estado: 'error', mensaje: error.message });
      },
    );

    consultarMiMembresia().then(
      (datos) => {
        if (activo) setMembresia({ estado: 'cargada', datos });
      },
      (error) => {
        if (activo) setMembresia(error.status === 404
          ? { estado: 'sin-membresia' }
          : { estado: 'error', mensaje: error.message });
      },
    );

    return () => { activo = false; };
  }, []);

  const periodoVigente = membresia.estado === 'cargada' ? membresia.datos.periodoVigente : null;

  return (
    <div style={{ maxWidth: '600px', background: '#fff', padding: '1.5rem', borderRadius: '8px' }}>
      <h2>M1 — Perfil y Membresía</h2>

      <section aria-labelledby="perfil-titulo" aria-busy={perfil.estado === 'cargando'}>
        <h3 id="perfil-titulo">Mi perfil</h3>
        {perfil.estado === 'cargando' && <p role="status">Cargando perfil...</p>}
        {perfil.estado === 'error' && <p role="alert">No pudimos cargar tu perfil. {perfil.mensaje}</p>}
        {perfil.estado === 'cargado' && (
          <>
            <p><strong>Nombre:</strong> {perfil.datos.nombre} {perfil.datos.apellido}</p>
            <p><strong>Email:</strong> {perfil.datos.email}</p>
            <p><strong>DNI:</strong> {perfil.datos.dni}</p>
            <p><strong>Sede:</strong> {perfil.datos.sedeNombre}</p>
          </>
        )}
      </section>

      <section aria-labelledby="membresia-titulo" aria-busy={membresia.estado === 'cargando'} style={{ border: '1px solid #e2e8f0', padding: '1rem', borderRadius: '6px', marginTop: '1rem' }}>
        <h3 id="membresia-titulo">Mi membresía</h3>
        {membresia.estado === 'cargando' && <p role="status">Cargando membresía...</p>}
        {membresia.estado === 'sin-membresia' && <p>No tenés una membresía.</p>}
        {membresia.estado === 'error' && <p role="alert">No pudimos cargar tu membresía. {membresia.mensaje}</p>}
        {membresia.estado === 'cargada' && (
          <>
            <p><strong>Estado de Membresía:</strong> {membresia.datos.estado}</p>
            {periodoVigente ? (
              <>
                <p><strong>Plan vigente:</strong> {periodoVigente.nombrePlan}</p>
                <p><strong>Fin del período vigente (hora Argentina):</strong> {new Date(periodoVigente.fin).toLocaleString('es-AR', {
                  timeZone: 'America/Argentina/Buenos_Aires',
                  hour12: false,
                })}</p>
              </>
            ) : <p>No hay un período vigente.</p>}
          </>
        )}
        <button type="button" disabled aria-describedby="renovacion-pendiente" style={{ padding: '0.5rem 1rem', background: '#64748b', color: '#fff', border: 'none', borderRadius: '4px', marginTop: '1rem', cursor: 'not-allowed' }}>
          Renovar Membresía
        </button>
        <p id="renovacion-pendiente">La renovación desde esta pantalla todavía no está disponible.</p>
      </section>
    </div>
  );
}
