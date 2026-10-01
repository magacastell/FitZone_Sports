export default function HistorialComprobantes() {
  return (
    <div style={{ maxWidth: '800px', background: '#fff', padding: '1.5rem', borderRadius: '8px' }}>
      <h2>M5 — Mis Comprobantes</h2>
      <div className="table-scroll" role="region" aria-label="Comprobantes de ejemplo: tabla desplazable" tabIndex={0}>
        <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '1rem' }}>
          <thead>
            <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0', textAlign: 'left' }}>
              <th style={{ padding: '0.8rem' }}>Fecha</th>
              <th style={{ padding: '0.8rem' }}>Concepto</th>
              <th style={{ padding: '0.8rem' }}>Monto</th>
              <th style={{ padding: '0.8rem' }}>Estado</th>
            </tr>
          </thead>
          <tbody>
            <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
              <td style={{ padding: '0.8rem' }}>28/09/2026</td>
              <td style={{ padding: '0.8rem' }}>Reserva Cancha Pádel 1</td>
              <td style={{ padding: '0.8rem' }}>$8.500</td>
              <td style={{ padding: '0.8rem', color: '#10b981', fontWeight: 'bold' }}>APROBADO</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
