import assert from 'node:assert/strict';
import { generateKeyPair, exportJWK, SignJWT } from 'jose';
import { verificar, tokenActual } from '../src/services/offline/crypto.js';

const { privateKey, publicKey } = await generateKeyPair('RS256');
const jwk = await exportJWK(publicKey);
const now = Math.floor(Date.now()/1000);
const token = await new SignJWT({ tipo:'m2-qr', uid:7 }).setProtectedHeader({alg:'RS256'})
  .setIssuer('fitzone-m2').setNotBefore(now).setExpirationTime(now+60).sign(privateKey);
assert.equal((await verificar(token,jwk,'m2-qr',now*1000)).uid,7);
await assert.rejects(()=>verificar(token,jwk,'m2-snapshot',now*1000));
await assert.rejects(()=>verificar(token,jwk,'m2-qr',(now+60)*1000));
await assert.rejects(()=>verificar(token,jwk,'m2-qr',(now-1)*1000));
await assert.rejects(()=>verificar(token.slice(0,-8)+'AAAAAAAA',jwk,'m2-qr',now*1000));
assert.equal(tokenActual([token],now*1000),token);
assert.equal(tokenActual([token],(now+60)*1000),undefined);
console.log('OK offline: firma pública, tipo, manipulación y ventanas estrictas de 60 s');
