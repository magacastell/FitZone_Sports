// Ejecutar desde frontend: node --experimental-vm-modules scripts/test-dominio.mjs
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire(path.join(process.cwd(), 'package.json'));
const { transformSync } = require('esbuild');
const sources = {
 layout:'src/components/Layout.jsx', perfil:'src/modules/m1-usuarios/MembresiaUsuario.jsx',contrato:'src/modules/m1-usuarios/ContratacionMembresia.jsx',cuenta:'src/modules/m1-usuarios/PerfilUsuario.jsx',renew:'src/modules/m1-usuarios/RenovacionMembresia.jsx',
 route:'src/routes/AppRoutes.jsx', qr:'src/modules/m2-acceso/SocioQRModal.jsx', login:'src/modules/auth/LoginPage.jsx', register:'src/modules/auth/RegisterPage.jsx', protected:'src/components/ProtectedRoute.jsx', receipts:'src/modules/m5-pagos/HistorialComprobante.jsx', recepcion:'src/modules/m2-acceso/ControlAccesoSede.jsx', lector:'src/modules/m2-acceso/LectorAcceso.jsx'
};
let current;
const fragment = Symbol('fragment');
const jsx = (type, props, key) => ({type, props:props || {}, key});
const depsSame=(a,b)=>a && b && a.length===b.length && a.every((v,i)=>Object.is(v,b[i]));
const hooks = {
 useState(initial) {
  const r=current,i=r.index++;
  if(!r.slots[i])r.slots[i]={value:typeof initial==='function'?initial():initial};
  return [r.slots[i].value,v=>{r.slots[i].value=typeof v==='function'?v(r.slots[i].value):v;r.writes++;}];
 },
 useRef(initial) {const r=current,i=r.index++;return r.slots[i]??(r.slots[i]={current:initial});},
 useCallback(fn,deps) {const r=current,i=r.index++;if(!r.slots[i]||!depsSame(r.slots[i].deps,deps))r.slots[i]={value:fn,deps};return r.slots[i].value;},
 useEffect(fn,deps) {
  const r=current,i=r.index++;
  if(!r.slots[i]||!depsSame(r.slots[i].deps,deps)){
   const old=r.slots[i];r.slots[i]={deps,fn,cleanup:old?.cleanup};
   r.pending.push(()=>{r.slots[i].cleanup?.();r.slots[i].cleanup=fn();});
  }
 }
};
const react = {...hooks,Fragment:fragment,createElement:(t,p,...c)=>jsx(t,{...p,children:c})};
function deferred(){let resolve,reject;const promise=new Promise((a,b)=>{resolve=a;reject=b;});return{promise,resolve,reject};}
function storage(){const map=new Map;return{getItem:k=>map.has(k)?map.get(k):null,setItem:(k,v)=>map.set(k,String(v)),removeItem:k=>map.delete(k)};}
function env(){
 const e={shared:null,user:{rol:'USUARIO'},token:'sesion-A',members:[],profiles:[],plans:[],contracts:[],renewals:[],qrs:[],pdfs:[],aforos:[],sedes:[],ingresos:[],salidas:[],downloads:[],revoked:[],timers:new Map(),timerId:0,nav:[],listeners:new Map(),runners:[],uuids:0,
 localStorage:storage(),sessionStorage:storage(),visibilityState:'visible'};
 e.localStorage.setItem('token',e.token);
 const call=(name,args)=>{const d=deferred();d.args=args;e[name].push(d);return d.promise;};
 e.services={
  consultarMiMembresia:()=>call('members',[]),consultarMiPerfil:()=>call('profiles',[]),
  listarPlanes:()=>call('plans',[]),contratarMembresia:(...a)=>call('contracts',a),renovarMembresia:(...a)=>call('renewals',a)
 };
 e.m2={consultarAforo:(...a)=>call('aforos',a),listarSedesAcceso:(...a)=>call('sedes',a),registrarIngreso:(...a)=>call('ingresos',a),registrarSalida:(...a)=>call('salidas',a)};
 e.focus=()=>{for(const f of e.listeners.get('focus')??[])f();};
 return e;
}
function synthetic(values,context){return new vm.SyntheticModule(Object.keys(values),function(){for(const[k,v]of Object.entries(values))this.setExport(k,v);},{context});}
async function runner(name,e,props={},target='default'){
 const context=vm.createContext({
  console,Date,JSON,Math,Number,String,Promise,Error,globalThis:undefined,
  localStorage:e.localStorage,sessionStorage:e.sessionStorage,
  document:{get visibilityState(){return e.visibilityState;},createElement:()=>({click(){e.downloads.push(this.download);}})},
  URL:{createObjectURL:()=> 'blob:pdf-real',revokeObjectURL:url=>e.revoked.push(url)},
  window:{addEventListener:(k,f)=>{if(!e.listeners.has(k))e.listeners.set(k,new Set);e.listeners.get(k).add(f);},removeEventListener:(k,f)=>e.listeners.get(k)?.delete(f),confirm:()=>true},
  crypto:{randomUUID:()=>{e.uuids++;return '00000000-0000-4000-8000-'+String(e.uuids).padStart(12,'0');}},
  setTimeout:(fn,ms)=>{const id=++e.timerId;e.timers.set(id,{fn,ms});return id;},clearTimeout:id=>e.timers.delete(id),setInterval:(fn)=>{e.intervals=(e.intervals||0)+1;e.poll=fn;return 2;},clearInterval:()=>{e.clearedIntervals=(e.clearedIntervals||0)+1;},
  atob:s=>Buffer.from(s,'base64').toString()
 });
 vm.runInContext('globalThis = this',context);
 let code=fs.readFileSync(sources[name],'utf8');
 if(target!=='default')code+='\nexport { '+target+' };';
 code=transformSync(code,{loader:'jsx',format:'esm',jsx:'automatic'}).code;
 const mod=new vm.SourceTextModule(code,{context});
 const router={
  useLocation:()=>({pathname:e.pathname||'/perfil'}),useNavigate:()=>p=>e.nav.push(p),useOutletContext:()=>e.shared,
  Outlet:({context})=>{e.shared=context;return jsx('outlet',{});},
  NavLink:({to,children})=>jsx('a',{href:to,children}),Link:({to,children})=>jsx('a',{href:to,children}),
  BrowserRouter:()=>null,Routes:()=>null,Route:()=>null,Navigate:p=>jsx('navigate',p)
 };
 const linker=async spec=>{
  if(spec==='react')return synthetic({...react,default:react},context);
  if(spec==='react/jsx-runtime')return synthetic({jsx,jsxs:jsx,Fragment:fragment},context);
  if(spec==='react-router-dom')return synthetic(router,context);
  if(spec.includes('AuthContext'))return synthetic({useAuth:()=>({token:e.token,user:e.user,loading:!!e.loading,login:e.login,register:e.register,isAuthenticated:!!e.token,logout:()=>{e.loggedOut=true;e.token=null;}})},context);
  if(spec.includes('m1Service'))return synthetic(e.services,context);
  if(spec.includes('m2Service'))return synthetic(e.m2,context);
  if(spec.includes('pagosService'))return synthetic({descargarComprobante:id=>{const d=deferred();d.args=[id];e.pdfs.push(d);return d.promise;}},context);
  if(spec.includes('services/api'))return synthetic({fetchAPI:(...a)=>{const d=deferred();d.args=a;e.qrs.push(d);return d.promise;}},context);
  if(spec==='qrcode.react')return synthetic({QRCodeSVG:p=>jsx('qr-svg',p)},context);
  if(spec==='lucide-react')return synthetic(Object.fromEntries(['CalendarDays','ChartColumn','DoorOpen','Dumbbell','LayoutGrid','LogOut','QrCode','ReceiptText','UserRound','Wrench','List','Menu','X','ShieldCheck','Mail','Fingerprint','MapPin','FileText','ArrowRight','ArrowDownToLine','ArrowUpFromLine','CheckCircle2','Clock3','ScanLine','XCircle','Users','RefreshCw'].map(k=>[k,()=>jsx('svg',{})])),context);
  if(spec.endsWith('LectorAcceso'))return synthetic({default:p=>{e.lectorProps=p;return jsx('lector',p);}},context);
  if(spec.endsWith('useAforoSede')||spec.endsWith('TarjetaAforo')){
   const file=spec.endsWith('useAforoSede')?'src/modules/m2-acceso/useAforoSede.js':'src/modules/m2-acceso/TarjetaAforo.jsx';
   const child=new vm.SourceTextModule(transformSync(fs.readFileSync(file,'utf8'),{loader:'jsx',format:'esm',jsx:'automatic'}).code,{context});
   await child.link(linker);await child.evaluate();return child;
  }
  if(['PortalSocioCards','RenovacionMembresia','FitZoneUI','CatalogoPlanes','ContratacionMembresia','estadoCuenta'].some(n=>spec.endsWith(n))){
 const file=spec.endsWith('estadoCuenta')?'src/modules/m1-usuarios/estadoCuenta.js':spec.endsWith('CatalogoPlanes')?'src/modules/m1-usuarios/CatalogoPlanes.jsx':spec.endsWith('ContratacionMembresia')?'src/modules/m1-usuarios/ContratacionMembresia.jsx':spec.endsWith('FitZoneUI')?'src/components/ui/FitZoneUI.jsx':spec.endsWith('PortalSocioCards')?'src/modules/m1-usuarios/PortalSocioCards.jsx':'src/modules/m1-usuarios/RenovacionMembresia.jsx';
 const child=new vm.SourceTextModule(transformSync(fs.readFileSync(file,'utf8'),{loader:'jsx',format:'esm',jsx:'automatic'}).code,{context});
 await child.link(linker);await child.evaluate();return child;
 }
 if(spec.endsWith('SocioQRModal'))return synthetic({default:p=>{e.modal=p;return jsx('qr-modal',p);}},context);
  return synthetic({default:()=>null},context);
 };
 await mod.link(linker);
 await mod.evaluate();
 const r={slots:[],index:0,pending:[],writes:0,alive:true,props,
 render(){
  current=this;this.index=0;this.tree=mod.namespace[target](this.props);
  const expand=n=>{
   if(n==null||typeof n!=='object')return n;
   if(Array.isArray(n))return n.map(expand);
   if(n.type?.name==='RenovacionMembresia'){e.renewalProps=n.props;return jsx('renewal',n.props);}
   if(n.type==='input'&&n.props.ref)n.props.ref.current={focus:()=>{e.focos=(e.focos||0)+1;}};
   if(typeof n.type==='function')return expand(n.type(n.props));
   return{...n,props:{...n.props,children:expand(n.props.children)}};
  };
  this.view=expand(this.tree);current=null;
  for(const f of this.pending.splice(0))f();
  return this.view;
 },
 unmount(){for(const s of this.slots)s?.cleanup?.();this.alive=false;},
 strictEffects(){for(const s of this.slots)if(s?.fn){s.cleanup?.();s.cleanup=s.fn();}}
 };
 e.runners.push(r);r.render();return r;
}
async function settle(e){for(let i=0;i<12;i++){await Promise.resolve();for(const r of e.runners)if(r.alive)r.render();}}
function nodes(n,filter,out=[]){if(!n||typeof n!=='object')return out;if(Array.isArray(n)){for(const c of n)nodes(c,filter,out);return out;}if(filter(n))out.push(n);nodes(n.props?.children,filter,out);return out;}
function text(n){if(n==null||typeof n==='boolean')return '';if(Array.isArray(n))return n.map(text).join(' ');if(typeof n!=='object')return String(n);return text(n.props?.children);}
function button(r,label){const found=nodes(r.view,n=>n.type==='button'&&text(n).replace(/\s+/g,' ').includes(label));assert.equal(found.length,1,'Boton '+label);return found[0];}
function hasQr(r){return nodes(r.view,n=>n.type==='a'&&n.props.href==='/mi-qr').length>0;}
function err(status,message='Fallo real'){return Object.assign(new Error(message),status?{status}:{});}
function dto(estado='ACTIVA',extra={}){return{id:22,usuarioId:7,estado,planId:3,periodoVigente:null,periodos:[],...extra};}
async function layout(e){return runner('layout',e,{},'LayoutAutenticado');}
async function setMember(e,data){e.members.at(-1).resolve(data);await settle(e);}
async function initialError(e,error){e.members.at(-1).reject(error);await settle(e);}
async function startContract(e){
 const p=await runner('perfil',e);
 e.profiles.at(-1).resolve({id:7,nombre:'Ana',apellido:'Perez',email:'real@fitzone',dni:'123',sedeNombre:'Central'});
 e.plans.at(-1).resolve([{id:3,nombre:'Plan real',duracionMeses:1,precio:100}]);await settle(e);
 button(p,'Elegir plan').props.onClick();p.render();
 const submit=nodes(p.view,n=>n.type==='form')[0].props.onSubmit;
 const pending=submit({preventDefault(){}});return{p,submit,pending};
}
let passed=0;
async function test(name,fn){try{await fn();passed++;console.log('OK '+name);}catch(e){console.error('FAIL '+name+': '+e.message);process.exitCode=1;}}
await test('USUARIO ACTIVA: QR por membresia, sin servicios demo',async()=>{
 const e=env(),l=await layout(e);
 assert.equal(e.shared.membresia.estado,'cargando');assert.equal(hasQr(l),false);assert.equal(e.members.length,1);
 await setMember(e,dto());assert.equal(hasQr(l),true);assert.equal(e.shared.rolActivo,'USUARIO');
 assert.equal(nodes(l.view,n=>n.type==='a'&&n.props.href==='/canchas').length,0);
});
for(const state of ['VENCIDA','SUSPENDIDA'])await test('USUARIO '+state+' sin QR ni selector',async()=>{
 const e=env();e.user.rol='USUARIO';const l=await layout(e);await setMember(e,dto(state));
 assert.equal(hasQr(l),false);assert.equal(nodes(l.view,n=>n.type==='select').length,0);assert.equal(e.shared.rolActivo,'USUARIO');
});for(const status of [404,403,500,undefined])await test('GET membresia '+(status??'red')+' semantica correcta',async()=>{
 const e=env(),l=await layout(e);await initialError(e,err(status));
 assert.equal(e.shared.membresia.estado,status===404?'sin-membresia':'error');assert.equal(hasQr(l),false);
 if(status!==404)assert.equal(e.shared.membresia.status,status);
});
await test('foco visible revalida, oculta no; consultas simultaneas comparten promesa',async()=>{
 const e=env();await layout(e);await setMember(e,dto());
 e.visibilityState='hidden';e.focus();assert.equal(e.members.length,1);
 e.visibilityState='visible';e.focus();const a=e.shared.refrescarMembresia(),b=e.shared.refrescarMembresia();
 assert.equal(a,b);assert.equal(e.members.length,2);await setMember(e,dto('VENCIDA'));
 assert.equal(e.shared.puedeAbrirQr,false);
});
await test('GET viejo no sobrescribe DTO del POST ni borra una consulta nueva',async()=>{
 const e=env();await layout(e);const old=e.members[0];e.shared.actualizarMembresia({estado:'cargada',datos:dto()});await settle(e);
 const newer=e.shared.refrescarMembresia();old.resolve(dto('VENCIDA'));await settle(e);
 assert.equal(e.shared.puedeAbrirQr,true);assert.equal(newer,e.shared.refrescarMembresia());
 e.members[1].resolve(dto('SUSPENDIDA'));await settle(e);assert.equal(e.shared.puedeAbrirQr,false);
});
await test('cleanup ignora respuestas tardias y elimina listener',async()=>{
 const e=env(),l=await layout(e);const writes=l.writes;l.unmount();e.members[0].resolve(dto());await settle(e);
 assert.equal(l.writes,writes);assert.equal(e.listeners.get('focus').size,0);
});
await test('StrictMode: primera respuesta descartada tras cleanup y nueva ejecucion',async()=>{
 const e=env(),l=await layout(e);l.strictEffects();assert.equal(e.members.length,2);
 e.members[1].resolve(dto('VENCIDA'));await settle(e);e.members[0].resolve(dto());await settle(e);
 assert.equal(e.shared.membresia.datos.estado,'VENCIDA');
});
await test('sesion: key por token, nuevo arbol sin DTO previo; logout sigue navegando',async()=>{
 const e=env(),wrapper=await runner('layout',e);assert.equal(wrapper.tree.key,'sesion-A');wrapper.unmount();
 const l=await layout(e);await setMember(e,dto());l.unmount();e.token='sesion-B';e.user={rol:'USUARIO'};
 const w=await runner('layout',e);assert.equal(w.tree.key,'sesion-B');w.unmount();
 const l2=await layout(e);assert.equal(e.shared.membresia.estado,'cargando');assert.equal(hasQr(l2),false);
 button(l2,'Cerrar sesión').props.onClick();assert.equal(e.loggedOut,true);assert.equal(e.nav.at(-1),'/login');
});
for(const state of ['cargando','sin-membresia','error','ACTIVA','VENCIDA','SUSPENDIDA'])await test('URL directa /mi-qr: '+state,async()=>{
 const e=env();let refresh=0;e.shared={
  membresia:['ACTIVA','VENCIDA','SUSPENDIDA'].includes(state)?{estado:'cargada',datos:dto(state)}:{estado:state,mensaje:'Error de consulta'},
  puedeAbrirQr:state==='ACTIVA',refrescarMembresia:()=>{refresh++;}
 };
 const r=await runner('route',e,{},'SocioQRRoute');
 assert.equal(nodes(r.view,n=>n.type==='qr-modal').length,state==='ACTIVA'?1:0);assert.equal(e.nav.length,0);
 if(state==='error'){button(r,'Reintentar consulta').props.onClick();assert.equal(refresh,1);}
 if(state==='ACTIVA'){e.modal.onClose();assert.equal(e.nav[0],'/');}
});
await test('perfil comparte GET; contratacion/doble click actualiza menu sin nuevo GET',async()=>{
 const e=env(),l=await layout(e);await initialError(e,err(404));const {p,submit,pending}=await startContract(e);
 assert.equal(e.members.length,1);assert(!text(p.view).includes('Datos personales'));await submit({preventDefault(){}});
 assert.equal(e.contracts.length,1);assert.equal(e.uuids,1);e.contracts[0].resolve(dto());await pending;await settle(e);
 assert.equal(hasQr(l),true);assert(text(p.view).includes('Ana'));assert(text(p.view).includes('Contratación confirmada'));assert.equal(e.members.length,1);
 e.renewalProps.onRenovada(dto('VENCIDA'));await settle(e);assert.equal(hasQr(l),false);
});
for(const status of [200,404,403,500])await test('contratacion 409 reconciliacion compartida '+status,async()=>{
 const e=env(),l=await layout(e);await initialError(e,err(404));const {p,pending}=await startContract(e);
 e.contracts[0].reject(err(409,'Conflicto backend'));await settle(e);assert.equal(e.members.length,2);
 if(status===200)e.members[1].resolve(dto());else e.members[1].reject(err(status,'Error reconciliacion'));
 await pending;await settle(e);assert(!text(p.view).includes('Contratación confirmada'));assert.equal(e.uuids,1);
 if(status===200){assert.equal(hasQr(l),true);assert(text(p.view).includes('Se actualizó'));}
 else if(status===404){assert(text(p.view).includes('Actualizar planes'));}
 else{assert.equal(e.shared.membresia.estado,'error');button(p,'Reintentar verificación').props.onClick();assert.equal(e.members.length,3);}
});
for(const status of [403,500,undefined])await test('M2 '+(status??'red')+': mensaje real y revalidacion solo 403',async()=>{
 const e=env(),l=await layout(e);await setMember(e,dto());const route=await runner('route',e,{},'SocioQRRoute');
 const modal=await runner('qr',e,e.modal);assert.equal(e.qrs[0].args[0],'/accesos/qr');
 e.qrs[0].reject(err(status,'Denegacion real M2'));await settle(e);assert(text(modal.view).includes('Denegacion real M2'));
 assert.equal(e.members.length,status===403?2:1);
 if(status===403){
  e.members[1].resolve(dto('VENCIDA'));await settle(e);assert.equal(hasQr(l),false);
  assert.equal(nodes(route.view,n=>n.type==='qr-modal').length,0);assert(text(route.view).includes('Denegacion real M2'));
 }
});
await test('QR real usa token del backend; cierre/unmount impide notificacion tardia',async()=>{
 const e=env();let denied=0;const r=await runner('qr',e,{isOpen:true,onClose(){},onAccesoDenegado(){denied++;}});
 e.qrs[0].resolve({token:'header.'+Buffer.from(JSON.stringify({iat:100,exp:160})).toString('base64')+'.sig'});await settle(e);
 assert.equal(nodes(r.view,n=>n.type==='qr-svg').length,1);assert.equal(denied,0);
 const e2=env(),r2=await runner('qr',e2,{isOpen:true,onClose(){},onAccesoDenegado(){denied++;}});
 r2.unmount();e2.qrs[0].reject(err(403));await settle(e2);assert.equal(denied,0);
});
await test('renovacion: sessionStorage, red, remount/replay misma clave y DTO compartido',async()=>{
 const e=env(),l=await layout(e);await setMember(e,dto());
 const profile=await runner('perfil',e);e.profiles[0].resolve({id:7});await settle(e);
 let r=await runner('renew',e,e.renewalProps);await settle(e);
 button(r,'Renovar plan').props.onClick();e.plans[0].resolve([{id:3,nombre:'Plan',duracionMeses:1,precio:100}]);await settle(e);
 const send=button(r,'Confirmar renovación').props.onClick;const first=send();send();
 assert.equal(e.renewals.length,1);const key=e.renewals[0].args[2];assert(key);
 assert(e.sessionStorage.getItem('fitzone:m1:renovacion:7:22').includes(key));
 e.renewals[0].reject(err(undefined,'Red'));await first;await settle(e);r.unmount();
 r=await runner('renew',e,e.renewalProps);await settle(e);
 const second=button(r,'Reintentar renovación pendiente').props.onClick();assert.equal(e.renewals[1].args[2],key);assert.equal(e.uuids,1);
 e.renewals[1].resolve(dto('ACTIVA',{periodos:[{id:9,estado:'PROGRAMADA',nombrePlan:'Plan',inicio:'2026-11-01T00:00:00-03:00',fin:'2026-12-01T00:00:00-03:00'}]}));
 await second;await settle(e);assert.equal(e.sessionStorage.getItem('fitzone:m1:renovacion:7:22'),null);
 assert.equal(e.members.length,1);assert.equal(hasQr(l),true);r.props=e.renewalProps;r.render();assert(text(profile.view).includes('Próximo período'));assert.equal(e.shared.membresia.datos.periodos[0].estado,'PROGRAMADA');
});


for(const estado of ['ACTIVA','VENCIDA','SUSPENDIDA'])await test('presentacion real '+estado+' con snapshot y sin datos mock',async()=>{
 const e=env();await layout(e);
 await setMember(e,dto(estado,{periodoVigente:estado==='VENCIDA'?null:{nombrePlan:'Plan real confirmado',precio:12500.75,duracionMeses:3,inicio:'2026-10-01T15:00:00-03:00',fin:'2027-01-01T15:00:00-03:00'},
 periodos:[{id:18,estado:'PROGRAMADA',nombrePlan:'Futuro real',inicio:'2027-01-01T15:00:00-03:00',fin:'2027-04-01T15:00:00-03:00'}]}));
 const r=await runner('perfil',e);e.profiles[0].resolve({id:7,nombre:'Nombre real',apellido:'Apellido',email:'real@fitzone',dni:'12345',sedeNombre:'Sede real',rol:'USUARIO'});await settle(e);
 const t=text(r.view);for(const x of ['Nombre real','Sede real','Futuro real','Datos personales'])assert(t.includes(x), 'Falta '+x+': '+t);
 if(estado!=='VENCIDA'){assert(t.includes('Plan real confirmado'));assert(t.includes('12.500,75'));assert(t.includes('15:00'));}
 assert.equal(nodes(r.view,n=>n.type==='a'&&n.props.href==='/mi-qr').length>0,estado==='ACTIVA');
 for(const x of ['FZ-28415','Palermo','Socio desde'])assert(!t.includes(x));
});
for(const rol of ['GERENTE','RECEPCIONISTA'])await test('perfil interno separado y membresia directa redirige '+rol,async()=>{
 const e=env();e.user={rol};await layout(e);const r=await runner('cuenta',e);
 e.profiles[0].resolve({id:7,nombre:'Cuenta interna',apellido:'Real',email:'interna@fitzone',dni:'444',sedeNombre:'Central',rol});await settle(e);
 assert(text(r.view).includes('Cuenta interna'));assert(!text(r.view).includes('Mi membresía'));assert.equal(e.plans.length,0);assert.equal(e.members.length,0);
 const portal=await runner('perfil',e);assert.equal(nodes(portal.view,n=>n.type==='navigate')[0].props.to,'/perfil');
});
for(const [rol,ruta] of [['USUARIO','/membresia'],['RECEPCIONISTA','/recepcion/acceso'],['GERENTE','/gestion/planes']])await test('destino real '+rol,async()=>{
 const e=env();e.user={rol};const r=await runner('route',e,{},'InicioPorRol');assert.equal(nodes(r.view,n=>n.type==='navigate')[0].props.to,ruta);
});
for(const status of [400,402,403,404,500,undefined])await test('contratacion conserva recuperacion '+(status??'red'),async()=>{
 const e=env();await layout(e);await initialError(e,err(404));const {p,pending}=await startContract(e);const args=e.contracts[0].args;
 e.contracts[0].reject(err(status,'Failed to fetch'));await pending;await settle(e);assert(!text(p.view).includes('Failed to fetch'));
 if([400,403].includes(status)){assert.equal(nodes(p.view,n=>n.type==='button'&&text(n).includes('Iniciar nueva')).length,0);}
 if(status===402||status===500||!status){
  const next=nodes(p.view,n=>n.type==='form')[0].props.onSubmit({preventDefault(){}});
  assert.equal(e.contracts[1].args[0],args[0]);assert.equal(e.contracts[1].args[1],args[1]);assert.equal(e.uuids,1);
  e.contracts[1].resolve(dto());await next;await settle(e);
 }
 if(status===404){
  const refresh=button(p,'Actualizar planes').props.onClick();assert.equal(e.uuids,1);
  e.plans[1].resolve([{id:3,nombre:'Actualizado',precio:100,duracionMeses:1}]);await refresh;await settle(e);
  button(p,'Elegir plan').props.onClick();p.render();
  const next=nodes(p.view,n=>n.type==='form')[0].props.onSubmit({preventDefault(){}});assert.equal(e.uuids,2);
  e.contracts[1].resolve(dto());await next;await settle(e);
 }
});
await test('Perfil de cliente no incluye capacidades comerciales ni planes',async()=>{
 const e=env();e.shared={membresia:{estado:'sin-membresia'}};const r=await runner('cuenta',e);e.profiles[0].resolve({id:7,nombre:'Cuenta real',apellido:'Persona',rol:'USUARIO'});await settle(e);
 assert.equal(e.plans.length,0);assert.equal(e.members.length,0);assert(nodes(r.view,n=>n.type==='a'&&n.props.href==='/membresia').length);
});

const cardSource=fs.readFileSync('src/modules/m1-usuarios/PortalSocioCards.jsx','utf8');
const visual=vm.runInNewContext('('+cardSource.slice(cardSource.indexOf('export function presentacionVigencia'),cardSource.indexOf('function VigenciaPeriodo')).replace('export ','').trim()+')');
const now=Date.parse('2026-10-29T12:00:00-03:00');
for(const [days,tone] of [[6,'normal'],[5,'advertencia'],[3,'advertencia'],[2,'critico'],[1,'critico'],[0,'critico'],[-2,'critico']])await test('barra visual: dias '+days+' / '+tone,async()=>{
 const start=now-10*86400000, end=now+days*86400000;
 const view=visual({inicio:new Date(start).toISOString(),fin:new Date(end).toISOString()},now);
 assert.equal(view.tono,tone);assert.equal(view.porcentaje,Math.max(0,days/(10+days)*100));
 assert(view.texto.includes(days<=0?'finalizado':String(days)));
});
await test('barra: fechas ausentes, invalidas, iguales o invertidas sin indicador',async()=>{
 for(const period of [null,{}, {inicio:null,fin:'2026-11-01'},{inicio:'invalida',fin:'2026-11-01'},{inicio:'2026-11-01',fin:'2026-11-01'},{inicio:'2026-12-01',fin:'2026-11-01'}])assert.equal(visual(period,now),null);
});
await test('barra: offset, aproximacion 24h y limites de porcentaje',async()=>{
 const a=visual({inicio:'2026-10-28T12:00:00-03:00',fin:'2026-10-30T12:00:00-03:00'},now);
 const b=visual({inicio:'2026-10-28T15:00:00Z',fin:'2026-10-30T15:00:00Z'},now);
 assert.equal(a.porcentaje,50);assert.equal(a.porcentaje,b.porcentaje);assert.equal(a.texto,b.texto);
 const future=visual({inicio:'2026-11-01',fin:'2026-12-01'},now);assert.equal(future.porcentaje,100);assert(future.texto.includes('no comenz'));
 const half=visual({inicio:new Date(now-86400000).toISOString(),fin:new Date(now+43200000).toISOString()},now);assert(half.texto.includes('1 d'));
});
await test('barra: cleanup elimina temporizador y no consulta backend',async()=>{
 const e=env();await layout(e);await setMember(e,dto('ACTIVA',{periodoVigente:{inicio:'2026-10-01',fin:'2026-11-01',nombrePlan:'Plan'}}));
 const r=await runner('perfil',e);assert.equal(e.intervals,1);const requests=e.members.length;r.unmount();assert.equal(e.clearedIntervals,1);assert.equal(e.members.length,requests);
});
await test('contratacion: respuesta posterior al desmontaje no actualiza membresia',async()=>{
 const e=env();await layout(e);await initialError(e,err(404));const {p,pending}=await startContract(e);const writes=p.writes;p.unmount();e.contracts[0].resolve(dto());await pending;await settle(e);
 assert.equal(p.writes,writes);assert.equal(e.shared.membresia.estado,'sin-membresia');
});
await test('renovacion: una sesion nueva bloquea envio con el intento previo',async()=>{
 const e=env();const r=await runner('renew',e,{perfil:{id:7},membresia:dto(),onRenovada(){throw Error('No debe actualizar');}});await settle(e);
 button(r,'Renovar plan').props.onClick();e.plans[0].resolve([{id:3,nombre:'Plan',precio:100,duracionMeses:1}]);await settle(e);e.localStorage.setItem('token','sesion-B');
 await button(r,'Confirmar renovaci').props.onClick();await settle(e);assert.equal(e.renewals.length,0);assert.equal(e.uuids,0);assert(text(r.view).includes('Recarg'));
});


for(const [state,start,end] of [['ACTIVA','2020-01-01','2020-02-01'],['VENCIDA','2090-01-01','2091-01-01'],['SUSPENDIDA','2026-01-01','2091-01-01']])await test('fecha visual nunca decide QR: '+state,async()=>{
 const e=env();await layout(e);await setMember(e,dto(state,{periodoVigente:{nombrePlan:'Plan real',inicio:start,fin:end,precio:100,duracionMeses:1}}));
 const r=await runner('perfil',e);e.profiles[0].resolve({id:7,nombre:'Cuenta real',rol:'USUARIO'});await settle(e);
 assert.equal(hasQr(r),state==='ACTIVA');assert.equal(e.shared.membresia.datos.estado,state);
 for(const old of ['(aprox.)','El estado y el acceso los confirma','según el backend','FZ-28415','R-10482'])assert(!text(r.view).includes(old));
});
await test('409 red: recuperacion visible conserva intencion y revalida sin POST nuevo',async()=>{
 const e=env();await layout(e);await initialError(e,err(404));const {p,pending}=await startContract(e);
 e.contracts[0].reject(err(409));await settle(e);e.members[1].reject(err(undefined,'Failed to fetch'));await pending;await settle(e);
 assert.equal(e.shared.membresia.estado,'error');assert.equal(e.uuids,1);
 const refresh=button(p,'Reintentar verificacion'.replace('verificacion','verificación')).props.onClick();e.members[2].resolve(dto());await refresh;await settle(e);
 assert.equal(e.contracts.length,1);assert.equal(e.uuids,1);assert(text(p.view).includes('Se actualiz'));
});


for(const count of [0,1,3])await test('presentacion de '+count+' periodos futuros sin bloquear renovacion',async()=>{
 const e=env();await layout(e);const futuros=Array.from({length:count},(_,i)=>({id:100+i,estado:'PROGRAMADA',nombrePlan:'Futuro '+i,inicio:'2026-11-29T19:30:44-03:00',fin:'2026-12-29T19:30:44-03:00'}));
 await setMember(e,dto('ACTIVA',{periodos:futuros}));const r=await runner('perfil',e);e.profiles[0].resolve({id:7});await settle(e);
 for(let i=0;i<count;i++)assert(text(r.view).includes('Futuro '+i));assert.equal(hasQr(r),true);
 const ren=await runner('renew',e,e.renewalProps);await settle(e);button(ren,'Renovar plan');assert(!text(ren.view).includes('hora Argentina'));
});


await test('cliente sin membresia ve catalogo real y no capacidades de socio',async()=>{
 const e=env();const l=await layout(e);await initialError(e,err(404));const r=await runner('perfil',e);
 e.plans[0].resolve([{id:3,nombre:'Plan del servidor',duracionMeses:3,precio:45000.25}]);await settle(e);
 assert(text(r.view).includes('Elegí tu plan'));assert(text(r.view).includes('Plan del servidor'));assert(!text(r.view).includes('Tu ingreso'));
 assert(!nodes(l.view,n=>n.type==='a'&&n.props.href==='/comprobantes').length);assert(!hasQr(r));
});
await test('comprobantes solo para periodos con pago real, tambien tras vencimiento',async()=>{
 const e=env();const l=await layout(e);await setMember(e,dto('VENCIDA',{periodos:[{id:9,pagoId:99,estado:'VENCIDA'}]}));
 assert(nodes(l.view,n=>n.type==='a'&&n.props.href==='/comprobantes').length);assert(!hasQr(l));
});
await test('sesion: claims legados o desconocidos se descartan, USUARIO no expira por membresia',async()=>{
 const source=fs.readFileSync('src/context/AuthContext.jsx','utf8');const code=source.slice(source.indexOf('const isExpired'),source.indexOf('const getStoredToken'))+'\nisExpired';
 const expired=vm.runInNewContext(code,{Date,Number,JSON,atob:s=>Buffer.from(s,'base64').toString()});
 const token=rol=>'x.'+Buffer.from(JSON.stringify({exp:Date.now()/1000+1000,roles:['ROLE_'+rol]})).toString('base64')+'.sig';
 assert(!expired(token('USUARIO')));assert(!expired(token('GERENTE')));assert(expired(token('SOCIO_ACTIVO')));assert(expired(token('CLIENTE_EXTERNO')));assert(expired(token('DESCONOCIDO')));
});


await test('catalogo: error inicial recuperable sin crear intencion ni POST',async()=>{
 const e=env();await layout(e);await initialError(e,err(404));const r=await runner('perfil',e);e.plans[0].reject(err(500));await settle(e);
 button(r,'Reintentar catálogo').props.onClick();await settle(e);assert.equal(e.plans.length,2);e.plans[1].resolve([{id:3,nombre:'Catálogo recuperado',duracionMeses:1,precio:100}]);await settle(e);
 assert(text(r.view).includes('Catálogo recuperado'));assert.equal(e.contracts.length,0);assert.equal(e.uuids,0);
});

for(const role of ['USUARIO','RECEPCIONISTA','GERENTE'])await test('URL comprobantes sin capacidad: '+role,async()=>{
 const e=env();e.user.rol=role;e.shared={membresia:{estado:role==='USUARIO'?'sin-membresia':'no-aplica'}};
 const r=await runner('receipts',e);
 if(role==='USUARIO')assert(nodes(r.view,n=>n.type==='navigate'&&n.props.to==='/membresia'&&n.props.replace).length);
 else assert(text(r.view).includes('no disponibles'));
 assert.equal(e.pdfs.length,0);assert(!text(r.view).includes('Todavía no'));
});
await test('comprobantes: loading, error recuperable y empty distintos, sin errores tecnicos',async()=>{
 const e=env();let retry=0;e.shared={membresia:{estado:'cargando'},refrescarMembresia:()=>retry++};const r=await runner('receipts',e);
 assert(text(r.view).includes('cargando'));assert(!text(r.view).includes('Todavía no'));
 e.shared.membresia={estado:'error',mensaje:'stack secreto Failed to fetch'};r.render();button(r,'Reintentar consulta').props.onClick();assert.equal(retry,1);assert(!text(r.view).includes('secreto'));
 e.shared.membresia={estado:'cargada',datos:dto()};r.render();assert(text(r.view).includes('Todavía no tenés comprobantes.'));
});
function paidEnv(){const e=env();e.shared={membresia:{estado:'cargada',datos:dto('VENCIDA',{periodos:[
 {id:1,pagoId:41,nombrePlan:'Histórico',precio:16000.75,inicio:'2026-10-30T00:00:00-03:00',fin:'2026-11-30T00:00:00-03:00'},
 {id:2,pagoId:42,nombrePlan:'Reciente',precio:18000,inicio:'2026-11-30T00:00:00-03:00',fin:'2026-12-30T00:00:00-03:00',estado:'CANCELADA'},
 {id:3,pagoId:null,nombrePlan:'Sin pago'}]})}};return e;}
await test('comprobantes: orden por periodo, ARS, referencias reales y sin estado pago inferido',async()=>{
 const e=paidEnv(),original=e.shared.membresia.datos.periodos;const r=await runner('receipts',e);const t=text(r.view);
 assert(t.indexOf('Reciente')<t.indexOf('Histórico'));assert.equal(original[0].id,1);assert(t.includes('16.000,75'));assert(t.includes('#42'));assert(t.includes('Período cancelado'));
 assert(!t.includes('APROBADO'));assert(!t.includes('Reembolsado'));assert(!t.includes('Sin pago'));assert(!t.includes('FZ-P-'));
});
await test('PDF: bloqueo inmediato, ID real, aviso temporal y revocacion URL',async()=>{
 const e=paidEnv(),r=await runner('receipts',e),click=button(r,'pago 42').props.onClick;
 const pending=click();click();assert.equal(e.pdfs.length,1);assert.equal(e.pdfs[0].args[0],42);
 e.pdfs[0].resolve({type:'application/pdf'});await pending;await settle(e);assert.deepEqual(e.downloads,['comprobante-42.pdf']);assert(text(r.view).includes('Descarga iniciada'));
 const revoke=[...e.timers.values()].find(t=>t.ms===1000);revoke.fn();assert.equal(e.revoked[0],'blob:pdf-real');
 const notice=[...e.timers.values()].find(t=>t.ms===4000);notice.fn();await settle(e);assert(!text(r.view).includes('Descarga iniciada'));
});
for(const status of [403,404,500,undefined])await test('PDF: error '+(status??'red')+' sin datos tecnicos y permite reintento',async()=>{
 const e=paidEnv(),r=await runner('receipts',e);const p=button(r,'pago 42').props.onClick();e.pdfs[0].reject(err(status,'stack secreto'));await p;await settle(e);assert(!text(r.view).includes('secreto'));assert(nodes(r.view,n=>n.props.role==='alert').length);
 const retry=button(r,'pago 42').props.onClick();assert.equal(e.pdfs.length,2);e.pdfs[1].resolve({});await retry;await settle(e);assert.equal(e.downloads.length,1);
});
await test('PDF: desmontaje ignora respuesta y limpia aviso temporal',async()=>{
 const e=paidEnv(),r=await runner('receipts',e);const p=button(r,'pago 42').props.onClick(),writes=r.writes;r.unmount();e.pdfs[0].resolve({});await p;assert.equal(r.writes,writes);assert.equal(e.downloads.length,0);
 const next=await runner('receipts',e);const q=button(next,'pago 42').props.onClick();e.pdfs[1].resolve({});await q;await settle(e);next.unmount();assert(![...e.timers.values()].some(t=>t.ms===4000));
});


for(const rol of ['USUARIO','RECEPCIONISTA','GERENTE'])await test('Recepcion URL: '+rol,async()=>{
 const e=env();e.user.rol=rol;const r=await runner('recepcion',e);
 if(rol==='USUARIO'){assert(nodes(r.view,n=>n.type==='navigate'&&n.props.to==='/perfil').length);assert.equal(e.profiles.length,0);}
 else {assert.equal(r.tree.key,'sesion-A');assert.equal(e.profiles.length,1);}
 assert.equal(e.members.length,0);
});
async function puesto(rol='RECEPCIONISTA'){
 const e=env();e.user.rol=rol;const r=await runner('recepcion',e,{},'PuestoAcceso');
 e.profiles[0].resolve({sedeId:12,sedeNombre:'Sede real'});
 if(rol==='GERENTE')e.sedes[0].resolve([{id:12,nombre:'Sede real'},{id:13,nombre:'Otra real'}]);
 await settle(e);return {e,r};
}
const aforoDto=(n=0,sedeId=12)=>({sedeId,ocupacionActual:n,capacidadMaxima:10,calculadoEn:'2026-10-30T12:00:00-03:00'});
await test('Recepcion usa sede de perfil, no selector ni membresia ni sedes globales',async()=>{
 const {e,r}=await puesto();assert.equal(e.sedes.length,0);assert.equal(e.members.length,0);assert.equal(e.aforos[0].args[0],12);
 assert.equal(nodes(r.view,n=>n.type==='select').length,0);assert(text(r.view).includes('Sede real'));assert.equal(e.lectorProps.esGerente,false);
});
await test('Gerente conserva seleccion existente, nueva sede descarta aforo anterior',async()=>{
 const {e,r}=await puesto('GERENTE');e.aforos[0].resolve(aforoDto(7));await settle(e);
 nodes(r.view,n=>n.type==='select')[0].props.onChange({target:{value:'13'}});r.render();
 assert.equal(nodes(r.view,n=>n.props?.role==='progressbar').length,0,'No exponer aforo de sede anterior ni un render');await settle(e);
 assert.equal(e.aforos[1].args[0],13);assert.equal(nodes(r.view,n=>n.props?.role==='progressbar').length,0);
 e.aforos[1].resolve(aforoDto(2,13));await settle(e);assert.equal(e.lectorProps.sedeId,13);
});
await test('Recepcion error de perfil recuperable y desmontaje ignora respuesta',async()=>{
 const e=env();e.user.rol='RECEPCIONISTA';const r=await runner('recepcion',e,{},'PuestoAcceso');e.profiles[0].reject(err(500));await settle(e);
 button(r,'Reintentar sede').props.onClick();await settle(e);const writes=r.writes;r.unmount();e.profiles[1].resolve({sedeId:12});await settle(e);assert.equal(r.writes,writes);assert.equal(e.aforos.length,0);
});
await test('Aforo real: loading, porcentaje y capacidad informativa sin umbrales inventados',async()=>{
 const {e,r}=await puesto();assert(text(r.view).includes('Consultando aforo'));
 e.aforos[0].resolve(aforoDto(12));await settle(e);const bar=nodes(r.view,n=>n.props.role==='progressbar')[0];
 assert.equal(bar.props['aria-valuenow'],100);assert.equal(bar.props['aria-valuetext'],'120% de capacidad');assert(text(r.view).includes('Capacidad alcanzada'));assert(text(r.view).includes('no bloquea'));
});
await test('Aforo error inicial sin cero ficticio; retry muestra respuesta real',async()=>{
 const {e,r}=await puesto();e.aforos[0].reject(err(500));await settle(e);assert.equal(nodes(r.view,n=>n.props.role==='progressbar').length,0);
 const p=button(r,'Reintentar aforo').props.onClick();e.aforos[1].resolve(aforoDto(3));await p;await settle(e);assert.equal(nodes(r.view,n=>n.props.role==='progressbar')[0].props['aria-valuenow'],30);
});
await test('Aforo polling sin duplicar; POST invalida lectura vieja; error retiene dato marcado',async()=>{
 const {e,r}=await puesto();e.aforos[0].resolve(aforoDto(0));await settle(e);e.poll();e.poll();assert.equal(e.aforos.length,2);
 e.lectorProps.onMovimiento();assert.equal(e.aforos.length,3);e.aforos[2].resolve(aforoDto(1));await settle(e);e.aforos[1].resolve(aforoDto(0));await settle(e);
 assert.equal(nodes(r.view,n=>n.props.role==='progressbar')[0].props['aria-valuenow'],10);
 e.poll();e.aforos[3].reject(err(undefined));await settle(e);assert(text(r.view).includes('último dato disponible'));assert(text(r.view).includes('SIN ACTUALIZAR'));
 r.unmount();assert.equal(e.clearedIntervals,1);
});
await test('Aforo desmontado no escribe, StrictMode descarta consulta previa',async()=>{
 const {e,r}=await puesto();const writes=r.writes;r.unmount();e.aforos[0].resolve(aforoDto(5));await settle(e);assert.equal(r.writes,writes);
 const x=env();x.user.rol='RECEPCIONISTA';const rx=await runner('recepcion',x,{},'PuestoAcceso');rx.strictEffects();assert.equal(x.profiles.length,2);
 x.profiles[0].resolve({sedeId:99,sedeNombre:'Vieja'});x.profiles[1].resolve({sedeId:12,sedeNombre:'Actual'});await settle(x);assert.equal(x.aforos[0].args[0],12);
});
const accesoDto={id:88,sedeId:12,ingreso:'2026-10-30T12:00:00-03:00',salida:'2026-10-30T12:05:00-03:00',titular:{nombre:'Titular real',apellido:'Prueba'}};
async function lector(){const e=env();e.refrescos=0;const r=await runner('lector',e,{sedeId:12,sedeNombre:'Sede real',esGerente:false,onMovimiento:()=>e.refrescos++});return{e,r};}
function escanear(r,valor='Aa.Qr-Sensible'){nodes(r.view,n=>n.type==='input')[0].props.onChange({target:{value:valor}});r.render();return nodes(r.view,n=>n.type==='form')[0].props.onSubmit;}
await test('Lector Enter/form preserva QR, bloqueo ref inmediato, limpia y recupera foco',async()=>{
 const {e,r}=await lector(),submit=escanear(r,'  Aa.Qr-Sensible  '),p=submit({preventDefault(){}});submit({preventDefault(){}});
 assert.equal(e.ingresos.length,1);assert.equal(e.ingresos[0].args[0],'Aa.Qr-Sensible');assert.equal(e.ingresos[0].args[1],undefined);
 button(r,'Salida').props.onClick();r.render();assert.equal(button(r,'Ingreso').props['aria-pressed'],true);
 e.ingresos[0].resolve(accesoDto);await p;await settle(e);assert.equal(e.refrescos,1);assert(text(r.view).includes('Acceso autorizado'));assert(text(r.view).includes('Titular real'));assert(e.focos>=2);
 assert.equal(nodes(r.view,n=>n.type==='input')[0].props.value,'');
});
await test('Salida usa operacion real, no ingreso; cambio de modo limpia lectura y resultado',async()=>{
 const {e,r}=await lector();escanear(r);button(r,'Salida').props.onClick();r.render();assert.equal(nodes(r.view,n=>n.type==='input')[0].props.value,'');
 const p=escanear(r)( {preventDefault(){}});assert.equal(e.ingresos.length,0);assert.equal(e.salidas.length,1);e.salidas[0].resolve(accesoDto);await p;await settle(e);assert(text(r.view).includes('Salida registrada'));assert.equal(e.refrescos,1);
});
for(const status of [400,403,404,409,500,undefined])await test('Lector rechazo/error '+(status??'red')+' sin exito ni optimismo',async()=>{
 const {e,r}=await lector();const p=escanear(r)({preventDefault(){}});const error=err(status,'stack tecnico');if(status===409)error.data={detail:'El QR venció: pedí uno nuevo'};
 e.ingresos[0].reject(error);await p;await settle(e);assert(!text(r.view).includes('stack tecnico'));assert(!text(r.view).includes('Acceso autorizado'));assert(nodes(r.view,n=>n.props.role==='alert').length);
 assert.equal(e.refrescos,!status||status>=500?1:0);if(status===409)assert(text(r.view).includes('El QR venció'));
 assert.equal(button(r,'Ingreso').props.disabled,false);
});
await test('Lector desmontado ignora resultado/callback; nueva sesion inicia limpia',async()=>{
 const {e,r}=await lector();const p=escanear(r)({preventDefault(){}}),writes=r.writes;r.unmount();e.ingresos[0].resolve(accesoDto);await p;assert.equal(r.writes,writes);assert.equal(e.refrescos,0);
 const next=await runner('lector',e,{sedeId:13,sedeNombre:'Otra cuenta',onMovimiento(){}});assert(!text(next.view).includes('Titular real'));assert.equal(nodes(next.view,n=>n.type==='input')[0].props.value,'');
});
await test('Recepcion token nuevo remonta contexto sin sede/datos previos',async()=>{
 const e=env();e.user.rol='RECEPCIONISTA';const r=await runner('recepcion',e);assert.equal(r.tree.key,'sesion-A');r.unmount();e.token='sesion-B';
 const next=await runner('recepcion',e);assert.equal(next.tree.key,'sesion-B');assert.equal(e.lectorProps,undefined);assert(text(next.view).includes('Consultando tu sede'));
});

console.log('RESULTADO: '+passed+' aprobadas'+(process.exitCode?' con fallos':''));
