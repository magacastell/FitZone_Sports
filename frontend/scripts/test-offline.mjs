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

await import('fake-indexeddb/auto');
const storage=new Map();
Object.defineProperty(globalThis,'localStorage',{value:{getItem:k=>storage.get(k)??null,setItem:(k,v)=>storage.set(k,v)},configurable:true});
localStorage.setItem('token','x.'+btoa(JSON.stringify({sub:'operador@test.invalid'}))+'.x');
const {db,idTerminal,guardarCopia,copiaActual}=await import('../src/services/offline/db.js');
assert.equal(await idTerminal(),await idTerminal());
const dos=await Promise.all([idTerminal(),idTerminal()]);assert.equal(dos[0],dos[1]);
async function firmarCopia(datos={}) {
 return new SignJWT({tipo:'m2-copia',revision:'revision-test',terminalId:dos[0],operadorId:1,sedeId:1,capacidad:20,miembros:[],presencias:[],...datos})
 .setProtectedHeader({alg:'RS256'}).setIssuer('fitzone-m2').setNotBefore(now).setExpirationTime(now+7200).sign(privateKey);
}
await guardarCopia({evidencia:await firmarCopia(),jwk,servidorAhora:Date.now(),sedeNombre:'Prueba'});
assert.equal((await copiaActual()).copia.datos.sedeId,1);
db.close();await db.open();assert.equal((await copiaActual()).copia.datos.sedeId,1);
await db.movimientos.put({id:'pendiente',estado:'PENDIENTE'});
const evidenciaNueva=await firmarCopia();
await assert.rejects(()=>guardarCopia({evidencia:evidenciaNueva,jwk,servidorAhora:Date.now()}),/Sincronizá/);
await db.movimientos.clear();
console.log('OK offline: terminal estable, preparación firmada y persistencia tras reapertura de IndexedDB');

const {registrarLocal}=await import('../src/services/offline/movimientos.js');
const miembro={id:7,nombre:'Socio',habilitado:true,suspendido:false,lotes:['lote'],periodos:[{inicio:(now-60)*1000,fin:(now+3600)*1000}]};
await guardarCopia({evidencia:await firmarCopia({miembros:[miembro]}),jwk,servidorAhora:Date.now()});
const qr=await new SignJWT({tipo:'m2-qr',uid:7,sid:1,bid:'lote',jti:'lote:1'}).setProtectedHeader({alg:'RS256'})
 .setIssuer('fitzone-m2').setNotBefore(now).setExpirationTime(now+60).sign(privateKey);
const entradas=await Promise.allSettled([registrarLocal('INGRESO',qr),registrarLocal('INGRESO',qr)]);
assert.equal(entradas.filter(r=>r.status==='fulfilled').length,1);assert.equal(await db.movimientos.count(),1);assert.equal(await db.presencias.count(),1);
db.close();await db.open();assert.equal(await db.movimientos.count(),1);
await registrarLocal('SALIDA',qr);assert.equal(await db.presencias.count(),0);assert.equal(await db.movimientos.count(),2);
await assert.rejects(()=>registrarLocal('INGRESO',qr),/ya se utilizó/);
await db.movimientos.clear();await db.usos.clear();
await guardarCopia({evidencia:await firmarCopia({miembros:[{...miembro,suspendido:true}]}),jwk,servidorAhora:Date.now()});
await assert.rejects(()=>registrarLocal('INGRESO',qr),/no autoriza/);
await guardarCopia({evidencia:await firmarCopia({miembros:[{...miembro,periodos:[{inicio:0,fin:1}]}]}),jwk,servidorAhora:Date.now()});
await assert.rejects(()=>registrarLocal('INGRESO',qr),/no autoriza/);
await guardarCopia({evidencia:await firmarCopia({miembros:[miembro]}),jwk,servidorAhora:Date.now()});
const fallo=()=>{throw new DOMException('Sin espacio','QuotaExceededError');};db.movimientos.hook('creating',fallo);
await assert.rejects(()=>registrarLocal('INGRESO',qr),/Sin espacio/);assert.equal(await db.presencias.count(),0);assert.equal(await db.usos.count(),0);
db.movimientos.hook('creating').unsubscribe(fallo);
await db.meta.update('copia',{desfase:7201000});await assert.rejects(()=>registrarLocal('INGRESO',qr));
console.log('OK offline: concurrencia local, reapertura, egreso, replay, suspensión, vigencia, caducidad y rollback ante falta de espacio');
await db.delete();
