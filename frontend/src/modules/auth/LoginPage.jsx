import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const result = await login({ email, password });
    
    if (result.success) {
      navigate('/canchas');
    } else {
      setError(result.message);
    }
  };

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: '#f1f5f9' }}>
      <form onSubmit={handleSubmit} style={{ background: '#fff', padding: '2.5rem', borderRadius: '12px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)', width: '320px' }}>
        <h2 style={{ textAlign: 'center', marginBottom: '0.5rem', color: '#0f172a' }}>FitZone Sports</h2>
        <p style={{ textAlign: 'center', marginBottom: '2rem', color: '#64748b', fontSize: '0.9rem' }}>Ingresa a tu cuenta</p>
        
        {error && <p style={{ color: '#ef4444', fontSize: '0.9rem', marginBottom: '1rem', textAlign: 'center' }}>{error}</p>}
        
        <div style={{ marginBottom: '1rem' }}>
          <label htmlFor="login-email" style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', color: '#334155' }}>Email</label>
          <input 
            id="login-email"
            type="email" 
            value={email} 
            onChange={(e) => setEmail(e.target.value)} 
            style={{ width: '100%', padding: '0.75rem', borderRadius: '6px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }}
            required 
          />
        </div>
        
        <div style={{ marginBottom: '2rem' }}>
          <label htmlFor="login-password" style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', color: '#334155' }}>Contraseña</label>
          <input 
            id="login-password"
            type="password" 
            value={password} 
            onChange={(e) => setPassword(e.target.value)} 
            style={{ width: '100%', padding: '0.75rem', borderRadius: '6px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }}
            required 
          />
        </div>
        
        <button type="submit" className="button button--primary" style={{ width: '100%', padding: '0.75rem', borderRadius: '6px', fontWeight: 'bold', fontSize: '1rem' }}>
          Ingresar
        </button>
        <p style={{ textAlign: 'center', marginTop: '1rem', color: '#64748b', fontSize: '0.8rem' }}>Usa: socio@fitzone.com / 1234</p>
      </form>
    </div>
  );
}
