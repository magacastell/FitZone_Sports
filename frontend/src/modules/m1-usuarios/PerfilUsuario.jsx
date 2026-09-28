export default function PerfilUsuario() {
  return (
    <div style={{ maxWidth: '600px', background: '#fff', padding: '1.5rem', borderRadius: '8px' }}>
      <h2>M1 — Perfil y Membresía</h2>
      <div style={{ border: '1px solid #e2e8f0', padding: '1rem', borderRadius: '6px', marginTop: '1rem' }}>
        <h3>Estado de Membresía: <span style={{ color: '#10b981' }}>ACTIVA</span></h3>
        <p><strong>Plan:</strong> Anual</p>
        <p><strong>Vencimiento:</strong> 15/11/2026</p>
        <button style={{ padding: '0.5rem 1rem', background: '#3b82f6', color: '#fff', border: 'none', borderRadius: '4px', marginTop: '1rem' }}>
          Renovar Membresía (M5)
        </button>
      </div>
    </div>
  );
}