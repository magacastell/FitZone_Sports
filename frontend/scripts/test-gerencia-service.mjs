import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
const context = vm.createContext({ JSON, URLSearchParams });
let llamada;
let error;
const consultaSedes = () => {};
const consultaAforo = () => {};
const api = new vm.SyntheticModule(['fetchAPI','listarSedes','consultarAforo'], function () {
  this.setExport('fetchAPI', (...args) => { llamada=args; if(error)throw error; return Promise.resolve({real:true}); });
  this.setExport('listarSedes',consultaSedes);this.setExport('consultarAforo',consultaAforo);
}, {context});
const mod = new vm.SourceTextModule(fs.readFileSync('src/services/gerenciaService.js','utf8'),{context});
await mod.link(()=>api);await mod.evaluate();
assert.equal(mod.namespace.listarSedes,consultaSedes);assert.equal(mod.namespace.consultarAforo,consultaAforo);
let aprobadas=2;
for(const [fn,args,ruta,metodo,body] of [
  ['listarUsuarios',[],'/usuarios'],
  ['consultarMembresia',[77],'/membresias/77'],
  ['crearSede',[{nombre:'Real',capacidadMaxima:20}],'/sedes','POST',{nombre:'Real',capacidadMaxima:20}],
  ['actualizarSede',[7,{direccion:''}],'/sedes/7','PATCH',{direccion:''}],
  ['consultarReporte',['ocupacion',{sedeId:'28',desde:'inicio',hasta:'fin'}],'/reportes/ocupacion?sedeId=28&desde=inicio&hasta=fin'],
]) {
  assert.equal((await mod.namespace[fn](...args)).real,true);assert.equal(llamada[0],ruta);assert.equal(llamada[1]?.method,metodo);assert.equal(llamada[1]?.body,body?JSON.stringify(body):undefined);
  error=Object.assign(new Error('original'),{status:501});assert.throws(()=>mod.namespace[fn](...args),e=>e===error);error=null;aprobadas++;
}
console.log(`RESULTADO: ${aprobadas} verificaciones de transporte Gerencia aprobadas`);
