const BASE_URL = import.meta.env.VITE_API_URL || '/api/v1';

export async function fetchAPI(endpoint, options = {}) {
  const token = localStorage.getItem('token');

  const headers = {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` }),
    ...options.headers,
  };

  const response = await fetch(`${BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  // Token vencido o inválido: se limpia la sesión y se vuelve al login
  // (solo si había token; un 401 en /auth/login es "credenciales incorrectas")
  if (response.status === 401 && token) {
    localStorage.removeItem('token');
    window.location.href = '/login';
  }

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.detail || errorData.message || 'Error en la petición');
  }

  return response.status !== 204 ? response.json() : null;
}