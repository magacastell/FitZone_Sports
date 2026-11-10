import { fetchAPI,BASE_URL } from '../api.js';
import { guardarCopia, guardarLote, idTerminal,cuentaActual,db,qrPreparado } from './db.js';

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
export async function obtenerQrAutomatico() {
  const cuenta=cuentaActual(),token=localStorage.getItem('token');
  let respuesta;
  try { respuesta=await fetchAPI('/accesos/offline/credenciales/automaticas',{method:'POST'}); }
  catch (error) {
    if (!error.status) return qrPreparado();
    if (error.status===403) await db.meta.delete('qr:'+cuenta);
    if (error.status===503) return fetchAPI('/accesos/qr');
    throw error;
  }
  if(cuentaActual()!==cuenta || localStorage.getItem('token')!==token)throw Error('Cambió la sesión durante la preparación.');
  await guardarLote(respuesta);
  return qrPreparado();
}
export async function hayConexion() {
  const token=localStorage.getItem('token');
  const respuesta=await fetch(`${BASE_URL}/accesos/offline/conexion`,{headers:{Authorization:`Bearer ${token}`},cache:'no-store',signal:AbortSignal.timeout(4000)});
  if(!respuesta.ok)throw Object.assign(Error('La sesión del operador necesita conexión para renovarse.'),{status:respuesta.status});
  return true;
}
