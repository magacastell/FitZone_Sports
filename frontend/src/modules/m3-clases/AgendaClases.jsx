export default function AgendaClases() {
  return (
    <div style={{ maxWidth: '800px', background: '#fff', padding: '1.5rem', borderRadius: '8px' }}>
      <h2>M3 — Clases Grupales</h2>
      <p style={{ color: '#64748b' }}>Las reservas abren 48hs antes del inicio de la clase.</p>
      
      <div style={{ border: '1px solid #e2e8f0', padding: '1rem', borderRadius: '6px', marginTop: '1rem', display: 'flex', justifyContent: 'space-between' }}>
        <div>
          <h4>Spinning - Sede Central</h4>
          <p>Hoy - 18:00 hs | Instructor: Martín</p>
          <p style={{ color: '#f59e0b', fontSize: '0.9rem' }}>Cupos: 19/20 (1 lugar disponible)</p>
        </div>
        <button style={{ padding: '0.5rem 1rem', background: '#10b981', color: '#fff', border: 'none', borderRadius: '4px', height: 'fit-content' }}>
          Reservar Clase
        </button>
      </div>
    </div>
  );
}