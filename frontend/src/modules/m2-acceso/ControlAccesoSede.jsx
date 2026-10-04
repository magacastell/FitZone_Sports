import { useState } from 'react';

export default function ControlAccesoSede() {
  // RF-05: Aforo de sede y cálculo de ingreso/salida
  const [aforoActual, setAforoActual] = useState(42);
  const [capacidadMaxima] = useState(100);
  const [modoOffline, setModoOffline] = useState(false);

  return (
    <div style={{ maxWidth: '800px', background: '#fff', padding: '1.5rem', borderRadius: '8px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2>M2 — Control de Acceso (Sede Central)</h2>
        <button 
          onClick={() => setModoOffline(!modoOffline)}
          style={{ padding: '0.4rem 0.8rem', background: modoOffline ? '#ef4444' : '#10b981', color: '#fff', border: 'none', borderRadius: '4px' }}
        >
          {modoOffline ? 'Modo Offline (Caché)' : 'Servidor en Línea'}
        </button>
      </div>

      {/* Pantalla de Aforo de Recepcionista */}
      <div style={{ margin: '1.5rem 0', padding: '1rem', background: '#f8fafc', borderLeft: '4px solid #0284c7' }}>
        <h3>Aforo Actual de la Sede: {aforoActual} / {capacidadMaxima} personas</h3>
        <p style={{ fontSize: '0.9rem', color: '#64748b' }}>
          * El aforo cuenta ingresos/salidas totales de la sede. Las reservas de gimnasio no existen.
        </p>
      </div>

      {/* Simulación de Lectura de Ingreso */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
        <div style={{ border: '1px solid #e2e8f0', padding: '1rem', borderRadius: '6px' }}>
          <h4>Ingreso Socio (Lector QR 2D)</h4>
          <input type="text" placeholder="Escanear QR Dinámico..." style={{ width: '100%', padding: '0.5rem', marginBottom: '0.5rem' }} />
          <button style={{ width: '100%', padding: '0.5rem', background: '#0284c7', color: '#fff', border: 'none' }}>Validar Socio</button>
        </div>

        <div style={{ border: '1px solid #e2e8f0', padding: '1rem', borderRadius: '6px' }}>
          <h4>Ingreso Cliente Externo</h4>
          <input type="text" placeholder="Buscar por DNI o Email..." style={{ width: '100%', padding: '0.5rem', marginBottom: '0.5rem' }} />
          <button style={{ width: '100%', padding: '0.5rem', background: '#475569', color: '#fff', border: 'none' }}>Verificar Reserva Cancha</button>
        </div>
      </div>
    </div>
  );
}