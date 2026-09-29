import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token') || null);
  const [loading, setLoading] = useState(true);

  // Simula la persistencia de sesión al recargar la página
  useEffect(() => {
    if (token) {
      setUser({ rol: 'SOCIO' });
    }
    setLoading(false);
  }, [token]);

  // Función de login con un mock (simulación)
  const login = async (credentials) => {
    return new Promise((resolve) => {
      setTimeout(() => {
        if (credentials.email === 'socio@fitzone.com' && credentials.password === '1234') {
          const fakeToken = 'ey.simulacion.jwt';
          setUser({ rol: 'SOCIO' });
          setToken(fakeToken);
          localStorage.setItem('token', fakeToken);
          resolve({ success: true });
        } else {
          resolve({ success: false, message: 'Credenciales incorrectas' });
        }
      }, 800);
    });
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('token');
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, logout, isAuthenticated: !!token }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);