import { importJWK, jwtVerify, decodeProtectedHeader } from 'jose';

export async function verificar(token, jwk, tipo, ahora = Date.now()) {
  const cabecera=decodeProtectedHeader(token);
  const estricta=tipo==='m2-autorizacion'||cabecera.kid!==undefined;
  if (estricta && (!jwk.kid || cabecera.kid!==jwk.kid)) throw Error('Clave desconocida: actualizá el terminal con conexión.');
  const key = await importJWK(jwk, 'RS256');
  const { payload } = await jwtVerify(token, key, {
    algorithms: ['RS256'], issuer: 'fitzone-m2', currentDate: new Date(ahora), clockTolerance: 0,
    ...(estricta && {audience:'fitzone-acceso',requiredClaims:['iat','nbf','exp']}),
  });
  if (payload.tipo !== tipo) throw Error('Tipo de autorización incorrecto');
  return payload;
}

export async function verificarAutorizacion(token,jwk,ahora) {
  const p=await verificar(token,jwk,'m2-autorizacion',ahora);
  if (!Number.isSafeInteger(p.uid)||p.uid<=0||p.permiso!=='INGRESO'||p.ambito!=='FITZONE'
      ||typeof p.jti!=='string'||!p.jti||p.iat>p.nbf||p.exp-p.nbf>60||p.exp-p.iat>7200)
    throw Error('Autorización de acceso inválida');
  return p;
}

// Reloj corregido al preparar: máximo 30 s de desvío posterior, sin extender exp/nbf.
const relojes=new Map();
export function ahoraAutorizado(material) {
  const ahora = Date.now();
  if (ahora < material.relojLocal - 30000 || ahora < (material.ultimoReloj || material.relojLocal) - 30000)
    throw Error('El reloj retrocedió. Volvé a preparar con conexión.');
  const clave=material.evidencia||material.id;
  if(!relojes.has(clave))relojes.set(clave,{pared:ahora,monotono:performance.now(),servidor:ahora+material.desfase});
  const base=relojes.get(clave),transcurrido=performance.now()-base.monotono;
  if(Math.abs((ahora-base.pared)-transcurrido)>30000)throw Error('El reloj cambió más de 30 segundos. Prepará nuevamente con conexión.');
  return Math.max(ahora+material.desfase,base.servidor+transcurrido);
}

export function tokenActual(tokens, ahora) {
  return tokens.find(token => {
    try {
      const p = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
      return p.nbf * 1000 <= ahora && ahora < p.exp * 1000;
    } catch { return false; }
  });
}
