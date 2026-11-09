import { fetchAPI } from '../api';
import { guardarCopia, guardarLote, idTerminal } from './db';

export async function prepararTerminal() {
  const respuesta=await fetchAPI('/accesos/offline/preparacion',{method:'POST',body:JSON.stringify({terminalId:await idTerminal()})});
  return guardarCopia(respuesta);
}
export async function prepararCredenciales(sedeId) {
  const respuesta=await fetchAPI('/accesos/offline/credenciales',{method:'POST',body:JSON.stringify({sedeId:Number(sedeId)})});
  await guardarLote(respuesta);return respuesta;
}
export async function hayConexion() {
  const token=localStorage.getItem('token');
  const respuesta=await fetch('/api/v1/accesos/offline/conexion',{headers:{Authorization:`Bearer ${token}`},cache:'no-store',signal:AbortSignal.timeout(4000)});
  if(!respuesta.ok)throw Object.assign(Error('La sesión del operador necesita conexión para renovarse.'),{status:respuesta.status});
  return true;
}
