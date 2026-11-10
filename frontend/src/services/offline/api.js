import { fetchAPI,BASE_URL } from '../api';
import { guardarCopia, guardarLote, idTerminal,cuentaActual,db } from './db';

export async function prepararTerminal() {
  const cuenta=cuentaActual(),token=localStorage.getItem('token');
  const respuesta=await fetchAPI('/accesos/offline/preparacion',{method:'POST',body:JSON.stringify({terminalId:await idTerminal()})});
  if(cuentaActual()!==cuenta || localStorage.getItem('token')!==token)throw Error('Cambió la sesión durante la preparación.');
  const copia=await guardarCopia(respuesta);
  if(globalThis.navigator?.storage?.persist) {
    const persistente=await navigator.storage.persist().catch(()=>false);
    await db.meta.update('copia',{persistente});
  }
  return copia;
}
export async function prepararCredenciales(sedeId) {
  const cuenta=cuentaActual(),token=localStorage.getItem('token');
  const respuesta=await fetchAPI('/accesos/offline/credenciales',{method:'POST',body:JSON.stringify({sedeId:Number(sedeId)})});
  if(cuentaActual()!==cuenta || localStorage.getItem('token')!==token)throw Error('Cambió la sesión durante la preparación.');
  await guardarLote(respuesta);return respuesta;
}
export async function hayConexion() {
  const token=localStorage.getItem('token');
  const respuesta=await fetch(`${BASE_URL}/accesos/offline/conexion`,{headers:{Authorization:`Bearer ${token}`},cache:'no-store',signal:AbortSignal.timeout(4000)});
  if(!respuesta.ok)throw Object.assign(Error('La sesión del operador necesita conexión para renovarse.'),{status:respuesta.status});
  return true;
}
