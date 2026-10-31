import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { execFileSync } from 'node:child_process';
const require = createRequire(path.join(process.cwd(), 'package.json'));
const { transformSync } = require('esbuild');
const sources = {
 gestion:'src/modules/m1-usuarios/GestionPlanes.jsx',layout:'src/components/Layout.jsx', perfil:'src/modules/m1-usuarios/PerfilUsuario.jsx',
 route:'src/routes/AppRoutes.jsx', qr:'src/modules/m2-acceso/SocioQRModal.jsx', login:'src/modules/auth/LoginPage.jsx', register:'src/modules/auth/RegisterPage.jsx', protected:'src/components/ProtectedRoute.jsx'
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
 const e={shared:null,user:{rol:'USUARIO'},token:'sesion-A',members:[],profiles:[],plans:[],contracts:[],renewals:[],qrs:[],nav:[],listeners:new Map(),runners:[],uuids:0,
 localStorage:storage(),sessionStorage:storage(),visibilityState:'visible'};
 e.localStorage.setItem('token',e.token);
 const call=(name,args)=>{const d=deferred();d.args=args;e[name].push(d);return d.promise;};
 e.services={
  consultarMiMembresia:()=>call('members',[]),consultarMiPerfil:()=>call('profiles',[]),
  listarPlanes:()=>call('plans',[]),contratarMembresia:(...a)=>call('contracts',a),renovarMembresia:(...a)=>call('renewals',a)
 };
 e.focus=()=>{for(const f of e.listeners.get('focus')??[])f();};
 return e;
}
function synthetic(values,context){return new vm.SyntheticModule(Object.keys(values),function(){for(const[k,v]of Object.entries(values))this.setExport(k,v);},{context});}
async function runner(name,e,props={},target='default'){
 const context=vm.createContext({
  console,Date,JSON,Math,Number,String,Promise,Error,globalThis:undefined,
  localStorage:e.localStorage,sessionStorage:e.sessionStorage,
  document:{get visibilityState(){return e.visibilityState;}},
  window:{addEventListener:(k,f)=>{if(!e.listeners.has(k))e.listeners.set(k,new Set);e.listeners.get(k).add(f);},removeEventListener:(k,f)=>e.listeners.get(k)?.delete(f),confirm:()=>true},
  crypto:{randomUUID:()=>{e.uuids++;return '00000000-0000-4000-8000-'+String(e.uuids).padStart(12,'0');}},
  setTimeout:()=>1,clearTimeout:()=>{},setInterval:()=>2,clearInterval:()=>{},
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
 await mod.link(async spec=>{
  if(spec.endsWith('estadoCuenta')){const child=new vm.SourceTextModule(fs.readFileSync('src/modules/m1-usuarios/estadoCuenta.js','utf8'),{context});await child.link(()=>{});await child.evaluate();return child;}
  if(spec==='react')return synthetic({...react,default:react},context);
  if(spec==='react/jsx-runtime')return synthetic({jsx,jsxs:jsx,Fragment:fragment},context);
  if(spec==='react-router-dom')return synthetic(router,context);
  if(spec.includes('AuthContext'))return synthetic({useAuth:()=>({token:e.token,user:e.user,loading:!!e.loading,login:e.login,register:e.register,isAuthenticated:!!e.token,logout:()=>{e.loggedOut=true;e.token=null;}})},context);
  if(spec.includes('planesService'))return synthetic(e.planServices,context);if(spec.includes('m1Service'))return synthetic(e.services,context);
  if(spec.includes('services/api'))return synthetic({fetchAPI:(...a)=>{const d=deferred();d.args=a;e.qrs.push(d);return d.promise;}},context);
  if(spec==='qrcode.react')return synthetic({QRCodeSVG:p=>jsx('qr-svg',p)},context);
  if(spec==='lucide-react')return synthetic(Object.fromEntries(['CalendarDays','ChartColumn','DoorOpen','Dumbbell','LayoutGrid','LogOut','QrCode','ReceiptText','UserRound','Wrench','List','Menu','X','CreditCard','MapPin'].map(k=>[k,()=>jsx('svg',{})])),context);
  if(spec.endsWith('SocioQRModal'))return synthetic({default:p=>{e.modal=p;return jsx('qr-modal',p);}},context);
  return synthetic({default:()=>null},context);
 });
 await mod.evaluate();
 const r={slots:[],index:0,pending:[],writes:0,alive:true,props,
 render(){
  current=this;this.index=0;this.tree=mod.namespace[target](this.props);
  const expand=n=>{
   if(n==null||typeof n!=='object')return n;
   if(Array.isArray(n))return n.map(expand);
   if(n.type?.name==='RenovacionMembresia'){e.renewalProps=n.props;return jsx('renewal',n.props);}
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
function button(r,label){const found=nodes(r.view,n=>n.type==='button'&&text(n).includes(label));assert.equal(found.length,1,'Boton '+label);return found[0];}
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
 nodes(p.view,n=>n.type==='select')[0].props.onChange({target:{value:'3'}});p.render();
 const submit=nodes(p.view,n=>n.type==='form')[0].props.onSubmit;
 const pending=submit({preventDefault(){}});return{p,submit,pending};
}
let passed=0;
async function test(name,fn){try{await fn();passed++;console.log('OK '+name);}catch(e){console.error('FAIL '+name+': '+e.message);process.exitCode=1;}}
const gestionEnv=()=>{const e=env();e.user={rol:'GERENTE'};e.planGets=[];e.planPosts=[];e.planPatches=[];e.planDeletes=[];
 const call=(list,args)=>{const d=deferred();d.args=args;e[list].push(d);return d.promise;};
 e.planServices={listarPlanes:(...args)=>call('planGets',args),crearPlan:(...args)=>call('planPosts',args),actualizarPlan:(...args)=>call('planPatches',args),desactivarPlan:(...args)=>call('planDeletes',args)};
 return e;};
const plan={id:15,nombre:'Plan actual',duracionMeses:3,precio:123.45,activo:true};
async function pantalla(datos=[]){const e=gestionEnv();const r=await runner('gestion',e,{},'GestionPlanesContenido');e.planGets[0].resolve(datos);await settle(e);return{e,r};}
function fill(r,id,value){nodes(r.view,n=>n.props?.id===id)[0].props.onChange({target:{value}});r.render();}
function submit(r){return nodes(r.view,n=>n.type==='form')[0].props.onSubmit({preventDefault(){}});}
await test('listado completo, vacio y campos reales',async()=>{
 const {e,r}=await pantalla();assert.equal(e.planGets[0].args[0],true);assert(text(r.view).includes('No hay planes registrados'));
 button(r,'Actualizar listado').props.onClick();e.planGets[1].resolve([plan,{...plan,id:16,activo:false}]);await settle(e);
 assert(text(r.view).includes('Activo'));assert(text(r.view).includes('Inactivo'));assert(text(r.view).includes('123,45'));
});
await test('alta: payload, bloqueo inmediato, refresco y formulario limpio',async()=>{
 const {e,r}=await pantalla();fill(r,'plan-nombre','Nuevo');fill(r,'plan-precio','15000.50');fill(r,'plan-duracion','12');
 const a=submit(r);submit(r);assert.equal(e.planPosts.length,1);
 assert.equal(JSON.stringify(e.planPosts[0].args[0]),JSON.stringify({nombre:'Nuevo',duracionMeses:12,precio:'15000.50'}));
 e.planPosts[0].resolve({...plan,nombre:'Nuevo'});await settle(e);assert.equal(e.planGets.length,2);e.planGets[1].resolve([{...plan,nombre:'Nuevo'}]);await a;await settle(e);
 assert(text(r.view).includes('Plan creado correctamente'));assert.equal(nodes(r.view,n=>n.props?.id==='plan-nombre')[0].props.value,'');
});
await test('edicion admite campos backend y reactivacion; cancelar no escribe',async()=>{
 const {e,r}=await pantalla([{...plan,activo:false}]);button(r,'Editar').props.onClick();await settle(e);assert(text(r.view).includes('Editar plan: Plan actual'));
 nodes(r.view,n=>n.type==='input'&&n.props.type==='checkbox')[0].props.onChange({target:{checked:true}});r.render();
 const a=submit(r);assert.equal(e.planPatches[0].args[0],15);assert.equal(e.planPatches[0].args[1].activo,true);
 e.planPatches[0].resolve(plan);await settle(e);e.planGets[1].resolve([plan]);await a;await settle(e);
 assert(text(r.view).includes('Plan actualizado'));button(r,'Editar').props.onClick();await settle(e);button(r,'Cancelar edición').props.onClick();assert.equal(e.planPatches.length,1);
});
await test('desactivacion explicita, DELETE sin body y doble clic bloqueado',async()=>{
 const {e,r}=await pantalla([plan]);button(r,'Desactivar').props.onClick();r.render();assert.equal(e.planDeletes.length,0);
 button(r,'Cancelar').props.onClick();r.render();assert.equal(e.planDeletes.length,0);
 button(r,'Desactivar').props.onClick();r.render();const confirm=button(r,'Confirmar desactivación').props.onClick;
 const a=confirm();confirm();assert.equal(e.planDeletes.length,1);assert.equal(e.planDeletes[0].args[0],15);
 e.planDeletes[0].resolve(null);await settle(e);e.planGets[1].resolve([{...plan,activo:false}]);await a;await settle(e);assert(text(r.view).includes('Inactivo'));
});
for(const status of [400,403,404,409,500,undefined])await test('error '+(status??'red')+' mantiene formulario y mensaje comprensible',async()=>{
 const {e,r}=await pantalla();fill(r,'plan-nombre','Conservar');fill(r,'plan-precio','100');const a=submit(r);e.planPosts[0].reject(err(status,'Failed to fetch'));await a;await settle(e);
 assert(!text(r.view).includes('Failed to fetch'));assert.equal(nodes(r.view,n=>n.props?.id==='plan-nombre')[0].props.value,'Conservar');assert(nodes(r.view,n=>n.props?.role==='alert').length);
});
await test('error de carga recuperable y respuesta tardia ignorada',async()=>{
 const e=gestionEnv(),r=await runner('gestion',e,{},'GestionPlanesContenido');e.planGets[0].reject(err(500));await settle(e);assert(text(r.view).includes('servidor'));
 button(r,'Actualizar listado').props.onClick();r.unmount();const writes=r.writes;e.planGets[1].resolve([plan]);await settle(e);assert.equal(r.writes,writes);
});
await test('POST exitoso con fallo de refresco no invita a repetir alta',async()=>{
 const {e,r}=await pantalla();fill(r,'plan-nombre','Guardado');fill(r,'plan-precio','100');const a=submit(r);e.planPosts[0].resolve(plan);await settle(e);e.planGets[1].reject(err(500));await a;await settle(e);
 assert(text(r.view).includes('Plan creado correctamente'));assert(text(r.view).includes('servidor'));assert.equal(nodes(r.view,n=>n.props?.id==='plan-nombre')[0].props.value,'');
});
for(const rol of ['USUARIO','RECEPCIONISTA'])await test('URL directa y menu restringidos: '+rol,async()=>{
 const e=gestionEnv();e.user={rol};const r=await runner('gestion',e);assert(text(r.view).includes('No tenés permisos'));assert.equal(e.planGets.length,0);
 const l=await layout(e);assert.equal(nodes(l.view,n=>n.type==='a'&&n.props.href==='/gestion/planes').length,0);
});
await test('gerente ve Planes e inicia Panel general; otros destinos conservados',async()=>{
 for(const [rol,destino]of [['GERENTE','/gestion/panel'],['RECEPCIONISTA','/recepcion/acceso'],['USUARIO','/membresia'],['USUARIO','/membresia']]){
 const e=gestionEnv();e.user={rol};const l=await layout(e);assert.equal(nodes(l.view,n=>n.type==='a'&&n.props.href==='/gestion/planes').length,rol==='GERENTE'?1:0);
 const r=await runner('route',e,{},'InicioPorRol');assert.equal(nodes(r.view,n=>n.type==='navigate')[0].props.to,destino);
 }
});
await test('servicio transporte y reexport S4 mantienen rutas y errores',async()=>{
 const context=vm.createContext({});const calls=[];let fallo;
 const fetchAPI=(...args)=>{calls.push(args);return fallo?Promise.reject(fallo):Promise.resolve(null);};
 const stub=synthetic({fetchAPI},context),mod=new vm.SourceTextModule(fs.readFileSync('src/services/planesService.js','utf8'),{context});
 await mod.link(()=>stub);await mod.evaluate();const p=mod.namespace;
 await p.listarPlanes();await p.listarPlanes(true);await p.crearPlan({nombre:'X',precio:'1.20',duracionMeses:1});await p.actualizarPlan(9,{activo:true});await p.desactivarPlan(9);
 assert.equal(calls[0][0],'/planes');assert.equal(calls[0].length,1);assert.equal(calls[1][0],'/planes?incluirInactivos=true');
 assert.equal(calls[2][1].method,'POST');assert.equal(JSON.parse(calls[2][1].body).precio,'1.20');assert.equal(calls[3][1].method,'PATCH');assert.equal(calls[4][1].method,'DELETE');
 fallo=new Error('original');try{await p.listarPlanes();assert.fail();}catch(e){assert.equal(e,fallo);}
 const sedes=new vm.SourceTextModule(fs.readFileSync('src/services/sedesService.js','utf8'),{context});await sedes.link(()=>stub);await sedes.evaluate();
 const m1=new vm.SourceTextModule(fs.readFileSync('src/services/m1Service.js','utf8'),{context});await m1.link(spec=>spec.includes('planesService')?mod:spec.includes('sedesService')?sedes:stub);await m1.evaluate();assert.equal(m1.namespace.listarPlanes,p.listarPlanes);
});
console.log('RESULTADO: '+passed+' aprobadas');
