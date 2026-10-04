import { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Info } from 'lucide-react';

export default function GrillaCanchas() {
  const { rolActivo } = useOutletContext();
  const [bloqueoTiempo, setBloqueoTiempo] = useState(null); // Temporizador de 10 min (600s)

  useEffect(() => {
    let timer;
    if (bloqueoTiempo > 0) {
      timer = setInterval(() => setBloqueoTiempo((t) => t - 1), 1000);
    }
    return () => clearInterval(timer);
  }, [bloqueoTiempo]);

  const iniciarReserva = () => {
    // Bloquea el turno en backend/DB por 10 minutos
    setBloqueoTiempo(600);
  };

  return (
    <div style={{ maxWidth: '900px', background: '#fff', padding: '1.5rem', borderRadius: '8px' }}>
      <h2>M4 — Reserva de Canchas Deportivas</h2>
      <p>Rol detectado: <strong>{rolActivo}</strong></p>

      {/* Banner de Precio Dinámico Strategy */}
      <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', padding: '1rem', borderRadius: '6px', marginBottom: '1.5rem' }}>
        <p style={{ margin: 0, color: '#166534' }}>
          <Info className="inline-icon" size={18} aria-hidden="true" />
          <strong>Reglas de Precio:</strong> Costo base por tipo de cancha. {rolActivo === 'SOCIO' ? 'Tenés 15% de descuento aplicado por ser Socio.' : 'Precio estándar (Registrate como socio para 15% OFF).'} Recargo hora pico entre las 19:00 y 21:00.
        </p>
      </div>

      {/* Ejemplo de Turno Disponible */}
      <div style={{ border: '1px solid #cbd5e1', padding: '1rem', borderRadius: '6px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h4>Cancha de Pádel 1 (Sede Central)</h4>
          <p style={{ margin: 0, color: '#64748b' }}>Horario: 19:30 - 20:30 hs (Hora Pico)</p>
          <p style={{ margin: '0.2rem 0', fontWeight: 'bold' }}>
            Precio Final: {rolActivo === 'SOCIO' ? '$8.500 (con 15% desc.)' : '$10.000'}
          </p>
        </div>

        {bloqueoTiempo === null ? (
          <button onClick={iniciarReserva} style={{ padding: '0.6rem 1.2rem', background: '#16a34a', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
            Reservar Turno
          </button>
        ) : (
          <div style={{ textAlign: 'right' }}>
            <span style={{ color: '#dc2626', fontWeight: 'bold', display: 'block' }}>
              Turno Bloqueado: {Math.floor(bloqueoTiempo / 60)}:{(bloqueoTiempo % 60).toString().padStart(2, '0')} min
            </span>
            <button style={{ marginTop: '0.4rem', padding: '0.4rem 0.8rem', background: '#2563eb', color: '#fff', border: 'none', borderRadius: '4px' }}>
              Ir a Pagar (M5)
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
