import { importJWK, jwtVerify } from 'jose';

export async function verificar(token, jwk, tipo, ahora = Date.now()) {
  const key = await importJWK(jwk, 'RS256');
  const { payload } = await jwtVerify(token, key, {
    algorithms: ['RS256'], issuer: 'fitzone-m2', currentDate: new Date(ahora), clockTolerance: 0,
  });
  if (payload.tipo !== tipo) throw Error('Tipo de autorización incorrecto');
  return payload;
}

// Reloj corregido al preparar: máximo 30 s de desvío posterior, sin extender exp/nbf.
export function ahoraAutorizado(material) {
  const ahora = Date.now();
  if (ahora < material.relojLocal - 30000 || ahora < (material.ultimoReloj || material.relojLocal) - 30000)
    throw Error('El reloj retrocedió. Volvé a preparar con conexión.');
  return ahora + material.desfase;
}

export function tokenActual(tokens, ahora) {
  return tokens.find(token => {
    try {
      const p = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
      return p.nbf * 1000 <= ahora && ahora < p.exp * 1000;
    } catch { return false; }
  });
}
