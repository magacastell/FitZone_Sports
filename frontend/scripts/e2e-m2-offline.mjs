// Chrome real + aplicación compilada + Spring/PG descartables. No mocks de API.
import assert from 'node:assert/strict';
import {execFileSync,spawn} from 'node:child_process';
import {createServer,request as httpRequest} from 'node:http';
import {createReadStream,createWriteStream} from 'node:fs';
import {mkdir,writeFile,stat,unlink} from 'node:fs/promises';
import {resolve,dirname,extname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {randomUUID,randomBytes,generateKeyPairSync} from 'node:crypto';
import {deflateSync} from 'node:zlib';
import {chromium,expect} from '@playwright/test';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'../..');
const id=process.env.FITZONE_E2E_RUN_ID||randomUUID();assert.match(id,/^[a-f0-9-]{36}$/);
const pg=`fitzone-offline-e2e-pg-${id}`,java=`fitzone-offline-e2e-java-${id}`;
const out=resolve(root,'target/e2e-m2',id);await mkdir(out,{recursive:true});
const docker=(args,input)=>execFileSync('docker',args,{input,encoding:'utf8',windowsHide:true,stdio:['pipe','pipe','pipe']}).trim();
const pause=ms=>new Promise(r=>setTimeout(r,ms));
const pasos=[];function paso(texto){pasos.push({instante:new Date().toISOString(),texto});console.log(texto);}
const consola=createWriteStream(resolve(out,'browser.log'));
let pgCreado=false,javaCreado=false,proceso,server,terminal,telefono,terminalPage,perderRespuesta=false,respuestaPerdida=false;
const sql=q=>docker(['exec','-i',pg,'psql','-U','postgres','-d','fitzone_e2e','-At','-v','ON_ERROR_STOP=1'],q);
async function hasta(tarea,ms=120000){const inicio=Date.now();let ultimo;while(Date.now()-inicio<ms){try{const r=await tarea();if(r)return r;}catch(e){ultimo=e;}await pause(500);}throw Error(`Timeout: ${ultimo?.message||'condición no alcanzada'}`);}
function png(){
 const crc=b=>{let c=0xffffffff;for(const v of b){c^=v;for(let i=0;i<8;i++)c=(c>>>1)^((c&1)?0xedb88320:0);}return(c^0xffffffff)>>>0;};
 const chunk=(t,b)=>{const tipo=Buffer.from(t),n=Buffer.alloc(4),c=Buffer.alloc(4);n.writeUInt32BE(b.length);c.writeUInt32BE(crc(Buffer.concat([tipo,b])));return Buffer.concat([n,tipo,b,c]);};
 const h=Buffer.alloc(13);h.writeUInt32BE(2,0);h.writeUInt32BE(2,4);h[8]=8;h[9]=2;
 return Buffer.concat([Buffer.from('89504e470d0a1a0a','hex'),chunk('IHDR',h),chunk('IDAT',deflateSync(Buffer.alloc(14))),chunk('IEND',Buffer.alloc(0))]);
}
async function registros(page,store){return page.evaluate(store=>new Promise((resolve,reject)=>{const r=indexedDB.open('fitzone-m2-offline');r.onerror=()=>reject(r.error);r.onsuccess=()=>{const db=r.result,q=db.transaction(store).objectStore(store).getAll();q.onsuccess=()=>{resolve(q.result);db.close();};q.onerror=()=>reject(q.error);};}),store);}
const contrato=e=>{const {id,visitaId,usuarioId,tipo,instante,qrToken,revision,secuencia}=e;return {id,visitaId,usuarioId,tipo,instante,qrToken,revision,secuencia};};
async function qrGuardado(page){const datos=await registros(page,'meta');const lote=datos.find(x=>x.id.startsWith('qr:'));const ahora=Date.now()+lote.desfase;return lote.tokens.find(t=>{const p=JSON.parse(Buffer.from(t.split('.')[1],'base64url'));return p.nbf*1000<=ahora && ahora<p.exp*1000;});}
async function abrirTerminal(offline=false){
 const contexto=await chromium.launchPersistentContext(resolve(out,'terminal-profile'),{channel:'chrome',headless:true,offline,viewport:{width:1100,height:850}});
 contexto.setDefaultTimeout(15000);const page=contexto.pages()[0]||await contexto.newPage();return {contexto,page};
}
try {
 docker(['run','-d','--name',pg,'--tmpfs','/var/lib/postgresql','-e','POSTGRES_HOST_AUTH_METHOD=trust','-e','POSTGRES_DB=fitzone_e2e','-p','127.0.0.1::3000','postgres:18']);pgCreado=true;
 await hasta(()=>{docker(['exec',pg,'pg_isready','-U','postgres','-d','fitzone_e2e']);return true;});
 const api=`http://${docker(['port',pg,'3000/tcp'])}/api/v1`;
 const clave=generateKeyPairSync('rsa',{modulusLength:2048}).privateKey.export({type:'pkcs8',format:'der'}).toString('base64');
 const env=resolve(out,'backend.env');
 await writeFile(env,`SPRING_PROFILES_ACTIVE=staging\nDB_URL=jdbc:postgresql://localhost:5432/fitzone_e2e\nDB_USERNAME=postgres\nDB_PASSWORD=\nJWT_SECRET=${randomBytes(48).toString('base64')}\nFITZONE_OFFLINE_PRIVATE_KEY=${clave}\nJAVA_TOOL_OPTIONS=-Duser.timezone=America/Argentina/Buenos_Aires\n`);
 docker(['create','--name',java,'--network',`container:${pg}`,'--mount',`type=bind,source=${root}/src,target=/app/src,readonly`,'--mount',`type=bind,source=${root}/docs,target=/app/docs,readonly`,'--mount',`type=bind,source=${root}/pom.xml,target=/app/pom.xml,readonly`,'--env-file',env,'--entrypoint','/bin/sh','fitzone-tests:local','-c','./mvnw -B -DskipTests package && exec java -jar target/backend-0.0.1-SNAPSHOT.jar']);javaCreado=true;
 proceso=spawn('docker',['start','-a',java],{windowsHide:true,stdio:['ignore','pipe','pipe']});const log=createWriteStream(resolve(out,'backend.log'));proceso.stdout.pipe(log);proceso.stderr.pipe(log);
 await hasta(async()=>{const r=await fetch(api+'/auth/login');return r.status===405;});paso('Spring y PostgreSQL aislados disponibles por HTTP real');
 const sede=Number(sql("INSERT INTO sede(nombre,capacidad_maxima) VALUES ('Sede E2E offline',20) RETURNING id;").split('\n')[0]);
 const plan=Number(sql("INSERT INTO plan_membresia(nombre,duracion_meses,precio) VALUES ('Plan E2E offline',1,100) RETURNING id;").split('\n')[0]);
 const password=`Prueba-${randomUUID()}`;
 async function apiJson(path,token,body,expected=200){const r=await fetch(api+path,{method:body===undefined?'GET':'POST',headers:{'Content-Type':'application/json',...(token?{Authorization:`Bearer ${token}`}:{})},...(body!==undefined?{body:JSON.stringify(body)}:{})});assert.equal(r.status,expected,`HTTP ${path}: ${r.status}`);return r.status===204?null:r.json();}
 async function registrar(nombre){const email=`${nombre}-${id}@e2e.invalid`;const f=new FormData();f.append('datos',new Blob([JSON.stringify({nombre,apellido:'Prueba',dni:email,email,password})],{type:'application/json'}));f.append('foto',new Blob([png()],{type:'image/png'}),'prueba.png');const r=await fetch(api+'/auth/register',{method:'POST',body:f});assert.ok(r.ok,`Registro fixture ${r.status}`);return {email,token:(await r.json()).token};}
 const recepcion=await registrar('Recepcion');
 sql(`UPDATE usuario SET rolid=(SELECT id FROM rol WHERE nombre='RECEPCIONISTA'),sedeid=${sede} WHERE email='${recepcion.email}';`);
 recepcion.token=(await apiJson('/auth/login',null,{email:recepcion.email,password})).token;
 server=createServer(async(req,res)=>{
  if(req.url.startsWith('/api/')) {
   const destino=new URL(req.url,api.replace('/api/v1',''));
   const omitir=perderRespuesta && req.url.includes('/offline/sincronizacion');
   const remoto=httpRequest(destino,{method:req.method,headers:{...req.headers,host:destino.host}},r=>{
    if(omitir){r.resume();r.on('end',()=>{respuestaPerdida=true;res.destroy();});}
    else{res.writeHead(r.statusCode,r.headers);r.pipe(res);}
   });remoto.on('error',()=>{res.writeHead(503);res.end();});req.pipe(remoto);return;
  }
  try {
   let ruta=resolve(root,'frontend/dist','.'+decodeURIComponent(req.url.split('?')[0]));
   if(!ruta.startsWith(resolve(root,'frontend/dist')))throw Error('Ruta inválida');
   try{if(!(await stat(ruta)).isFile())throw Error();}catch{ruta=resolve(root,'frontend/dist/index.html');}
   const tipos={'.html':'text/html','.js':'text/javascript','.css':'text/css','.webmanifest':'application/manifest+json','.svg':'image/svg+xml'};
   res.writeHead(200,{'Content-Type':tipos[extname(ruta)]||'application/octet-stream','Cache-Control':'no-cache'});createReadStream(ruta).pipe(res);
  }catch{res.writeHead(404);res.end();}
 });await new Promise(r=>server.listen(0,'127.0.0.1',r));const base=`http://127.0.0.1:${server.address().port}`;
 ({contexto:terminal,page:terminalPage}=await abrirTerminal());await terminalPage.goto(base+'/login');await terminalPage.evaluate(token=>localStorage.setItem('token',token),recepcion.token);await terminalPage.goto(base+'/terminal-offline');
 await terminalPage.getByRole('button',{name:'Preparar / actualizar terminal'}).click();await expect(terminalPage.getByText('Copia del',{exact:false})).toBeVisible();await terminalPage.evaluate(async()=>{await navigator.serviceWorker.ready;});
 await hasta(()=>terminalPage.evaluate(()=>!!navigator.serviceWorker.controller));
 const copia=(await registros(terminalPage,'meta')).find(x=>x.id==='copia');assert.equal(copia.datos.miembros.length,0);assert.ok(!JSON.stringify(copia.datos).includes('foto'));
 await terminal.setOffline(true);await expect(terminalPage.getByText('sin comunicación',{exact:false})).toBeVisible({timeout:15000});
 paso('Recepción aprovisionada y desconectada antes del registro del socio; copia sin miembros');
 const socio=await registrar('Socio');
 const alta=await fetch(api+'/membresias',{method:'POST',headers:{Authorization:`Bearer ${socio.token}`,'Content-Type':'application/json','Idempotency-Key':randomUUID()},body:JSON.stringify({planId:plan,sedeId:sede})});assert.equal(alta.status,201);
 telefono=await chromium.launchPersistentContext(resolve(out,'socio-profile'),{channel:'chrome',headless:true,viewport:{width:390,height:844}});
 const phone=telefono.pages()[0];phone.on('pageerror',e=>consola.write(e.message+'\n'));phone.on('console',m=>{if(m.type()==='error')consola.write(m.text()+'\n');});await phone.goto(base+'/login');await phone.evaluate(token=>localStorage.setItem('token',token),socio.token);await phone.goto(base+'/mi-qr');
 await expect(phone.getByRole('img',{name:'Código QR de acceso'})).toBeVisible({timeout:15000});
 assert.equal(await phone.getByLabel('Sede offline').count(),0);assert.equal(await phone.getByRole('button',{name:'Preparar QR offline'}).count(),0);
 await phone.goto(base+'/qr-offline');await expect(phone.locator('svg')).toBeVisible({timeout:15000});await phone.evaluate(async()=>{await navigator.serviceWorker.ready;});
 const primerQr=await qrGuardado(phone);
 assert.equal(JSON.parse(Buffer.from(primerQr.split('.')[1],'base64url')).tipo,'m2-autorizacion');
 await terminalPage.getByLabel('Código offline').fill(primerQr);await terminalPage.getByRole('button',{name:'Registrar movimiento preparado'}).click();await expect(terminalPage.getByTestId('pendientes')).toHaveText('1');
 await terminalPage.screenshot({path:resolve(out,'socio-nuevo-sin-padron.png'),fullPage:true});
 await terminalPage.getByLabel('Movimiento offline').selectOption('SALIDA');await terminalPage.getByLabel('Código offline').fill(await qrGuardado(phone));await terminalPage.getByRole('button',{name:'Registrar movimiento preparado'}).click();await expect(terminalPage.getByTestId('pendientes')).toHaveText('2');
 await terminalPage.getByLabel('Movimiento offline').selectOption('INGRESO');
 paso('Socio registrado y contratado por HTTP real después del corte; Mi QR automático sin sede; terminal offline admite sin padrón');
 const anterior=await qrGuardado(phone),svgAnterior=await phone.locator('svg').innerHTML();
 docker(['pause',java]);await terminal.setOffline(true);await telefono.setOffline(true);paso('Spring pausado y red cortada en ambos contextos Chrome, sin respuestas API simuladas');
 await pause(65000);assert.notEqual(await phone.locator('svg').innerHTML(),svgAnterior);const actual=await qrGuardado(phone);assert.notEqual(actual,anterior);
 await terminalPage.getByLabel('Código offline').fill(anterior);await terminalPage.getByRole('button',{name:'Registrar movimiento preparado'}).click();await expect(terminalPage.getByTestId('pendientes')).toHaveText('2');assert.equal((await registros(terminalPage,'movimientos')).length,2);
 paso('Tras 65 segundos el QR rotó y el anterior fue rechazado sin crear movimientos');
 await terminalPage.getByLabel('Código offline').fill(actual);await terminalPage.getByRole('button',{name:'Registrar movimiento preparado'}).click();await expect(terminalPage.getByTestId('pendientes')).toHaveText('3');await expect(terminalPage.getByTestId('aforo-local')).toHaveText('1');
 await terminalPage.screenshot({path:resolve(out,'ingreso-provisional.png'),fullPage:true});paso('Ingreso provisional persistido en IndexedDB; aforo local 1');
 await terminal.close();terminal=null;({contexto:terminal,page:terminalPage}=await abrirTerminal(true));await terminalPage.goto(base+'/terminal-offline');await expect(terminalPage.getByTestId('pendientes')).toHaveText('3');paso('Chrome cerrado y reabierto sin red: aplicación y pendientes conservados');
 await terminalPage.getByLabel('Movimiento offline').selectOption('SALIDA');await terminalPage.getByLabel('Código offline').fill(await qrGuardado(phone));await terminalPage.getByRole('button',{name:'Registrar movimiento preparado'}).click();await expect(terminalPage.getByTestId('pendientes')).toHaveText('4');await expect(terminalPage.getByTestId('aforo-local')).toHaveText('0');
 await terminalPage.setViewportSize({width:390,height:844});assert.ok(await terminalPage.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 assert.ok(await phone.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 await terminalPage.screenshot({path:resolve(out,'terminal-movil.png'),fullPage:true});await terminalPage.setViewportSize({width:1100,height:850});
 const eventos=(await registros(terminalPage,'movimientos')).map(contrato);paso('Egreso provisional persistido; aforo local 0 y cuatro eventos pendientes; sin overflow móvil');
 perderRespuesta=true;docker(['unpause',java]);docker(['restart',java]);await hasta(async()=>{const r=await fetch(api+'/auth/login');return r.status===405;});
 paso('Spring reiniciado con la misma clave privada; datos de PostgreSQL conservados');
 await terminal.setOffline(false);await telefono.setOffline(false);await hasta(()=>respuestaPerdida,20000);
 assert.equal(Number(sql('SELECT count(*) FROM registro_acceso WHERE offline_visita IS NOT NULL;')),2);assert.equal(Number(sql("SELECT count(*) FROM acceso_evento_offline WHERE estado='CONFIRMADO';")),4);
 assert.equal((await registros(terminalPage,'movimientos')).filter(e=>e.estado==='PENDIENTE').length,4);paso('Servidor confirmó dos visitas y cuatro eventos; respuesta HTTP perdida mantuvo los pendientes');
 perderRespuesta=false;await terminalPage.getByRole('button',{name:'Reintentar sincronización'}).click();await expect(terminalPage.getByTestId('pendientes')).toHaveText('0',{timeout:20000});
 const repetidos=await apiJson('/accesos/offline/sincronizacion',recepcion.token,{terminalId:copia.datos.terminalId,eventos});assert.ok(repetidos.every(r=>r.repetido && r.estado==='CONFIRMADO'));
 await hasta(async()=>{
  const actual=(await registros(terminalPage,'meta')).find(x=>x.id==='copia');
  return actual.datos.revision!==copia.datos.revision;
 },20000);
 paso('Terminal conectado actualizó automáticamente su copia después de confirmar todos los pendientes');
 assert.equal(Number(sql('SELECT count(*) FROM registro_acceso WHERE offline_visita IS NOT NULL AND fecha_hora_salida IS NOT NULL;')),2);assert.equal(Number(sql("SELECT count(*) FROM acceso_evento_offline WHERE estado='CONFIRMADO';")),4);
 await terminalPage.screenshot({path:resolve(out,'confirmado.png'),fullPage:true});paso('ACK explícito retiró pendientes; replay HTTP real no duplicó visita ni eventos');
 await writeFile(resolve(out,'resultado.json'),JSON.stringify({aprobada:true,fecha:new Date().toISOString(),navegador:'Chrome real headless',socioPosteriorAlCorte:true,sinPreparacionIndividual:true,pasos,visitas:2,eventos:4,duplicados:0,esperaRealMs:65000},null,2));
 console.log(`E2E APROBADA: ${out}`);
} catch(error) {
 if(terminalPage)await terminalPage.screenshot({path:resolve(out,'fallo.png'),fullPage:true}).catch(()=>{});
 await writeFile(resolve(out,'resultado.json'),JSON.stringify({aprobada:false,pasos,error:error.message},null,2));throw error;
} finally {
 await terminal?.close().catch(()=>{});await telefono?.close().catch(()=>{});
 if(server)await new Promise(r=>server.close(r));
 if(javaCreado){try{if(docker(['inspect','--format','{{.State.Paused}}',java])==='true')docker(['unpause',java]);}catch{}docker(['rm','-f',java]);}if(pgCreado)docker(['rm','-f',pg]);
 await unlink(resolve(out,'backend.env')).catch(()=>{});consola.end();
 proceso?.kill();
 console.log('Contenedores temporales propios eliminados; sin volúmenes de desarrollo');
}
