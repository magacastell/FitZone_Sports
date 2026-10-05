import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

// GET /sedes exige sesión, así que el formulario público todavía no puede listar sedes.
// Mientras tanto se usa la sede sembrada en dev ("Sede Central").
const SEDE_ID_POR_DEFECTO = 1;

const inputStyle = { width: '100%', padding: '0.75rem', borderRadius: '6px', border: '1px solid #cbd5e1', boxSizing: 'border-box' };
const labelStyle = { display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', color: '#334155' };

function Campo({ id, label, ...inputProps }) {
  return (
    <div style={{ marginBottom: '1rem' }}>
      <label htmlFor={id} style={labelStyle}>{label}</label>
      <input id={id} style={inputStyle} required {...inputProps} />
    </div>
  );
}

export default function RegisterPage() {
  const [form, setForm] = useState({ nombre: '', apellido: '', dni: '', email: '', password: '', confirmacion: '' });
  const [error, setError] = useState('');
  const [enviando, setEnviando] = useState(false);

  const { register } = useAuth();
  const navigate = useNavigate();

  const cambiar = (campo) => (e) => setForm({ ...form, [campo]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (form.password !== form.confirmacion) {
      setError('Las contraseñas no coinciden');
      return;
    }

    setEnviando(true);
    const { confirmacion, ...datos } = form;
    const result = await register({ ...datos, sedeId: SEDE_ID_POR_DEFECTO });
    setEnviando(false);

    if (result.success) {
      navigate('/canchas');
    } else {
      setError(result.message);
    }
  };

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', background: '#f1f5f9', padding: '1rem', boxSizing: 'border-box' }}>
      <form onSubmit={handleSubmit} style={{ background: '#fff', padding: '2.5rem', borderRadius: '12px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)', width: '320px' }}>
        <h2 style={{ textAlign: 'center', marginBottom: '0.5rem', color: '#0f172a' }}>FitZone Sports</h2>
        <p style={{ textAlign: 'center', marginBottom: '2rem', color: '#64748b', fontSize: '0.9rem' }}>Creá tu cuenta</p>

        {error && <p role="alert" style={{ color: '#ef4444', fontSize: '0.9rem', marginBottom: '1rem', textAlign: 'center' }}>{error}</p>}

        <Campo id="register-nombre" label="Nombre" type="text" autoComplete="given-name" value={form.nombre} onChange={cambiar('nombre')} />
        <Campo id="register-apellido" label="Apellido" type="text" autoComplete="family-name" value={form.apellido} onChange={cambiar('apellido')} />
        <Campo id="register-dni" label="DNI" type="text" inputMode="numeric" value={form.dni} onChange={cambiar('dni')} />
        <Campo id="register-email" label="Email" type="email" autoComplete="email" value={form.email} onChange={cambiar('email')} />
        <Campo id="register-password" label="Contraseña (mínimo 8 caracteres)" type="password" autoComplete="new-password" minLength={8} value={form.password} onChange={cambiar('password')} />
        <Campo id="register-confirmacion" label="Repetir contraseña" type="password" autoComplete="new-password" minLength={8} value={form.confirmacion} onChange={cambiar('confirmacion')} />

        <button type="submit" disabled={enviando} className="button button--primary" style={{ width: '100%', padding: '0.75rem', borderRadius: '6px', fontWeight: 'bold', fontSize: '1rem', marginTop: '1rem' }}>
          {enviando ? 'Registrando...' : 'Registrarme'}
        </button>
        <p style={{ textAlign: 'center', marginTop: '1rem', color: '#64748b', fontSize: '0.85rem' }}>
          ¿Ya tenés cuenta? <Link to="/login">Ingresá</Link>
        </p>
      </form>
    </div>
  );
}
