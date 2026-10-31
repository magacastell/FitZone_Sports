import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';

let response, failure, call;
const saved = new Map([['token','jwt-prueba']]);
const location = { href: '' };
const context = vm.createContext({
  localStorage: { getItem: (key) => saved.get(key), removeItem: (key) => saved.delete(key) },
  window: { location },
  fetch: async (...args) => { call = args; if (failure) throw failure; return response; },
  Error,
});
const mod = new vm.SourceTextModule(fs.readFileSync('src/services/api.js','utf8'), {
  context, initializeImportMeta(meta) { meta.env = {}; },
});
await mod.link(() => {});
await mod.evaluate();
const api = mod.namespace.fetchAPI;
let passed = 0;
const test = async (name, fn) => { await fn(); passed++; console.log('OK '+name); };
await test('JSON y headers/JWT conservados',async()=>{
  response={ok:true,status:200,json:async()=>({id:1})};
  assert.equal((await api('/usuarios/me',{headers:{Accept:'application/json'}})).id,1);
  assert.equal(call[0],'/api/v1/usuarios/me');assert.equal(call[1].headers.Authorization,'Bearer jwt-prueba');
});
await test('204 devuelve null',async()=>{response={ok:true,status:204};assert.equal(await api('/x'),null);});
for(const status of [400,402,403,404,409,500])await test('error '+status+' conserva message/status/data',async()=>{
  response={ok:false,status,json:async()=>({detail:'Mensaje real',codigo:'X'})};
  await assert.rejects(api('/x'),e=>e.status===status&&e.message==='Mensaje real'&&e.data.codigo==='X');
});
await test('error no JSON',async()=>{
 response={ok:false,status:502,json:async()=>{throw new Error('html');}};
 await assert.rejects(api('/x'),e=>e.status===502&&e.message==='Error en la petición');
});
await test('401 conserva redireccion y error',async()=>{
 response={ok:false,status:401,json:async()=>({message:'Sesión inválida'})};
 await assert.rejects(api('/x'),e=>e.status===401);assert.equal(saved.has('token'),false);assert.equal(location.href,'/login');
});
await test('red propaga la misma excepcion',async()=>{
 failure=new Error('Red');await assert.rejects(api('/x'),e=>e===failure);failure=null;
});
await test('PDF binario usa el mismo transporte sin alterar JSON predeterminado',async()=>{
 const pdf={bytes:'%PDF'};response={ok:true,status:200,blob:async()=>pdf};
 assert.equal(await api('/pagos/9/comprobante',{responseType:'blob',headers:{Accept:'application/pdf'}}),pdf);
 assert(!('responseType' in call[1]));assert.equal(call[1].headers.Accept,'application/pdf');
});

const m2=new vm.SourceTextModule(fs.readFileSync('src/services/m2Service.js','utf8'),{context});
const sedesMod=new vm.SourceTextModule(fs.readFileSync('src/services/sedesService.js','utf8'),{context});
await sedesMod.link(()=>mod);await sedesMod.evaluate();
await m2.link(spec=>spec.includes('sedesService')?sedesMod:mod);await m2.evaluate();
await test('M2 GET aforo/sedes y POST ingreso/salida respetan contrato real',async()=>{
 saved.set('token','jwt-real');response={ok:true,status:200,json:async()=>({id:1})};
 await m2.namespace.consultarAforo(12);assert.equal(call[0],'/api/v1/accesos/sedes/12/aforo');assert.equal(call[1].method,undefined);
 await m2.namespace.listarSedesAcceso();assert.equal(call[0],'/api/v1/sedes');
 await m2.namespace.registrarIngreso('Aa.Qr');assert.equal(call[0],'/api/v1/accesos/ingresos');assert.equal(call[1].method,'POST');assert.equal(call[1].body,JSON.stringify({qrToken:'Aa.Qr'}));
 assert.equal(call[1].headers['Idempotency-Key'],undefined);
 await m2.namespace.registrarIngreso('Aa.Qr',12);assert.equal(call[1].body,JSON.stringify({qrToken:'Aa.Qr',sedeId:12}));
 await m2.namespace.registrarSalida('Aa.Qr');assert.equal(call[0],'/api/v1/accesos/salidas');assert.equal(call[1].body,JSON.stringify({qrToken:'Aa.Qr'}));assert.equal(call[1].headers.Authorization,'Bearer jwt-real');
});


const planesMod=new vm.SourceTextModule(fs.readFileSync('src/services/planesService.js','utf8'),{context});
await planesMod.link(()=>mod);await planesMod.evaluate();
const m1=new vm.SourceTextModule(fs.readFileSync('src/services/m1Service.js','utf8'),{context});
await m1.link(spec=>spec.includes('sedesService')?sedesMod:spec.includes('planesService')?planesMod:mod);await m1.evaluate();
await test('Alta M1 transporta plan+sede con clave en header; renovacion no envia sede',async()=>{
 await m1.namespace.contratarMembresia(3,'uuid-intencion',28);
 assert.equal(call[0],'/api/v1/membresias');assert.equal(call[1].method,'POST');assert.equal(call[1].headers['Idempotency-Key'],'uuid-intencion');
 assert.equal(call[1].body,JSON.stringify({planId:3,sedeId:28}));assert(!JSON.parse(call[1].body).idempotencyKey);
 await m1.namespace.renovarMembresia(22,null,'otra-clave');assert.equal(call[1].body,'{}');assert.equal(call[0],'/api/v1/membresias/22/renovaciones');
 await m1.namespace.listarSedes();assert.equal(call[0],'/api/v1/sedes');assert.equal(call[1].method,undefined);
});
console.log('RESULTADO: '+passed+' aprobadas');
