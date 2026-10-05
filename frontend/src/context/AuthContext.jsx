import React, { createContext, useContext, useState, useEffect } from 'react';
import { fetchAPI } from '../services/api';

const AuthContext = createContext(null);

// El JWT trae "exp" (segundos): si ya venció, no tiene sentido usarlo
const isExpired = (jwt) => {
  try {
    const { exp } = JSON.parse(atob(jwt.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
    return exp * 1000 < Date.now();
  } catch {
    return true;
  }
};

const getStoredToken = () => {
  const stored = localStorage.getItem('token');
  if (stored && isExpired(stored)) {
    localStorage.removeItem('token');
    return null;
  }
  return stored;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(getStoredToken);
  const [loading, setLoading] = useState(true);

  // El rol viene dentro del JWT (claim "roles", ej: ["ROLE_SOCIO_ACTIVO"])
  const userFromToken = (jwt) => {
    try {
      const payload = JSON.parse(atob(jwt.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
      return { email: payload.sub, rol: payload.roles?.[0]?.replace('ROLE_', '') };
    } catch {
      return null;
    }
  };

  // Restaura la sesión al recargar la página
  useEffect(() => {
    setUser(token ? userFromToken(token) : null);
    setLoading(false);
  }, [token]);

  const login = async ({ email, password }) => {
    try {
      const data = await fetchAPI('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });
      localStorage.setItem('token', data.token);
      setToken(data.token);
      return { success: true };
    } catch (err) {
      return { success: false, message: 'Credenciales incorrectas' };
    }
  };

  // El registro público devuelve un JWT: el usuario queda con sesión iniciada
  const register = async (datos) => {
    try {
      const data = await fetchAPI('/auth/register', {
        method: 'POST',
        body: JSON.stringify(datos),
      });
      localStorage.setItem('token', data.token);
      setToken(data.token);
      return { success: true };
    } catch (err) {
      return { success: false, message: err.message };
    }
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('token');
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, register, logout, isAuthenticated: !!token }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);