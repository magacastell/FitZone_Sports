const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080/api/v1';

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

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.detail || errorData.message || 'Error en la petición');
  }

  return response.status !== 204 ? response.json() : null;
}