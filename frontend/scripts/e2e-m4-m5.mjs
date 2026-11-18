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
const pg=`fitzone-m4m5-e2e-pg-${id}`,java=`fitzone-m4m5-e2e-java-${id}`;
const out=resolve(root,'target/e2e-m4-m5',id);await mkdir(out,{recursive:true});
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
 const sede=Number(sql("INSERT INTO sede(nombre,capacidad_maxima) VALUES ('Sede M4 E2E',20) RETURNING id;").split('\n')[0]);
 const vacia=Number(sql("INSERT INTO sede(nombre,capacidad_maxima) VALUES ('Sede vacía E2E',20) RETURNING id;").split('\n')[0]);
 const plan=Number(sql("INSERT INTO plan_membresia(nombre,duracion_meses,precio) VALUES ('Plan M4 E2E',1,100) RETURNING id;").split('\n')[0]);
 const planTrimestral=Number(sql("INSERT INTO plan_membresia(nombre,duracion_meses,precio) VALUES ('Trimestral E2E',3,250) RETURNING id;").split('\n')[0]);
 const password='Prueba-'+randomUUID();
 async function apiJson(path,token,body,expected=200,method=body===undefined?'GET':'POST',headers={}) {
  const r=await fetch(api+path,{method,headers:{'Content-Type':'application/json',Authorization:'Bearer '+token,...headers},...(body!==undefined?{body:JSON.stringify(body)}:{})});
  assert.equal(r.status,expected,'HTTP '+path+': '+r.status+' '+(r.ok?'':await r.text()));return r.status===204?null:r.json();
 }
 async function registrar(nombre,dni=nombre+'-'+id) {
  const email=nombre+'-'+id+'@e2e.invalid',form=new FormData();
  form.append('datos',new Blob([JSON.stringify({nombre,apellido:'Prueba',dni,email,password})],{type:'application/json'}));
  form.append('foto',new Blob([png()],{type:'image/png'}),'foto.png');
  const r=await fetch(api+'/auth/register',{method:'POST',body:form});assert.equal(r.status,201);return {email,token:(await r.json()).token};
 }
 const gerente=await registrar('Gerente'),socio=await registrar('Socio'),externo=await registrar('Externo'),rechazado=await registrar('Rechazado','99999999');
 const recepcion=await registrar('Recepcion');
 sql("UPDATE usuario SET rolid=(SELECT id FROM rol WHERE nombre='GERENTE'),sedeid="+sede+" WHERE email='"+gerente.email+"';");
 sql(`UPDATE usuario SET rolid=(SELECT id FROM rol WHERE nombre='RECEPCIONISTA'),sedeid=${sede} WHERE email='${recepcion.email}';`);
 gerente.token=(await apiJson('/auth/login','',{email:gerente.email,password})).token;
 recepcion.token=(await apiJson('/auth/login','',{email:recepcion.email,password})).token;
 await apiJson('/membresias',socio.token,{planId:plan,sedeId:sede},201,'POST',{'Idempotency-Key':randomUUID()});
 const instructor=await apiJson('/instructores',gerente.token,{nombre:'Lucía',apellido:'E2E'},201);
 const tipoClase=await apiJson('/tipos-clase',gerente.token,{nombre:'Pilates E2E'},201);
 const diaClase=new Date(Date.now()+4*86400000).toLocaleDateString('en-CA',{timeZone:'America/Argentina/Buenos_Aires'});
 const clase=await apiJson('/clases',gerente.token,{tipoClaseId:tipoClase.id,instructorId:instructor.id,sedeId:sede,
  inicio:diaClase+'T15:00:00-03:00',fin:diaClase+'T16:00:00-03:00',cupo:12},201);
 const listarClasesRecepcion=await apiJson(`/clases?sedeId=${sede}`,recepcion.token);
 assert(listarClasesRecepcion.items.some(item=>item.id===clase.id));
 assert.equal((await fetch(`${api}/clases?sedeId=${vacia}`,{headers:{Authorization:`Bearer ${recepcion.token}`}})).status,403);
 assert.equal((await fetch(`${api}/clases/${clase.id}/reservas`,{method:'POST',headers:{Authorization:`Bearer ${externo.token}`}})).status,403);
 const tipo=await apiJson('/tipos-cancha',gerente.token,{nombre:'Tenis E2E '+id,precioHora:10000},201);
 await apiJson('/sedes/'+sede+'/recargo-pico',gerente.token,{recargoPico:20},200,'PUT');
 const cancha=await apiJson('/canchas',gerente.token,{nombre:'Cancha E2E',tipo:tipo.nombre,sedeId:sede,activa:true},201);
 const fecha=new Date(Date.now()+86400000).toLocaleDateString('en-CA',{timeZone:'America/Argentina/Buenos_Aires'});
 const crearTurno=hora=>apiJson('/canchas/'+cancha.id+'/turnos',gerente.token,{inicio:fecha+'T'+hora+':00:00-03:00',fin:fecha+'T'+String(Number(hora)+1).padStart(2,'0')+':00:00-03:00'},201);
 const turno=await crearTurno('19'),otro=await crearTurno('20');await crearTurno('14');
 const turnos=await apiJson('/canchas/'+cancha.id+'/turnos?desde='+fecha+'&hasta='+fecha,externo.token);
 assert.equal(Number(turnos.find(t=>t.id===turno.id).precio.total),12000);assert.equal(Number(turnos.find(t=>t.inicio.includes('14:00')).precio.total),10000);
 const conDescuento=await apiJson('/canchas/'+cancha.id+'/turnos?desde='+fecha+'&hasta='+fecha,socio.token);
 assert.equal(Number(conDescuento.find(t=>t.id===turno.id).precio.total),10200);paso('HTTP real: disponibilidad, externo 12000, normal 10000 y socio pico 10200');
 server=createServer(async(req,res)=>{
  if(req.url.startsWith('/api/')) {
   const destino=new URL(req.url,api.replace('/api/v1',''));
   const omitir=perderRespuesta && req.url==='/api/v1/pagos' && req.method==='POST';
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

 async function iniciarSesion(pagina,cuenta,rutaInicial){
  await pagina.goto(base+'/login');
  await pagina.getByLabel('Email',{exact:true}).fill(cuenta.email);
  await pagina.getByLabel('Contraseña',{exact:true}).fill(password);
  await pagina.getByRole('button',{name:'Ingresar',exact:true}).click();
  await expect(pagina).toHaveURL(base+rutaInicial);
 }

 telefono=await chromium.launch({channel:'chrome',headless:true});terminal=await chromium.launch({channel:'chrome',headless:true});
 const contextoSocio=await telefono.newContext({acceptDownloads:true,viewport:{width:1100,height:850}});const page=await contextoSocio.newPage();terminalPage=page;
 await iniciarSesion(page,socio,'/membresia');
 await expect(page.getByRole('heading',{name:'Plan M4 E2E',exact:true})).toBeVisible();
 await page.goto(base+'/canchas');
 await page.locator('.m4-filtros select').selectOption(String(sede));await page.locator('.m4-cancha-card').filter({hasText:'Cancha E2E'}).click();
 const filtroFecha=page.getByLabel('Fecha',{exact:true});
 await expect(filtroFecha).toHaveValue(fecha);
 await expect(page.getByText('Descuento de socio aplicado',{exact:false}).first()).toBeVisible();
 const fechaSinTurnos=new Date(Date.now()+2*86400000).toLocaleDateString('en-CA',{timeZone:'America/Argentina/Buenos_Aires'});
 await filtroFecha.fill(fechaSinTurnos);
 await expect(page.getByText('Sin horarios para esta fecha',{exact:true})).toBeVisible();
 await filtroFecha.fill(fecha);
 await expect(page.getByText('Descuento de socio aplicado',{exact:false}).first()).toBeVisible();
 const elegirTurno=page.locator('.m4-turno').nth(conDescuento.findIndex(t=>t.id===turno.id)).getByRole('button',{name:'Elegir turno',exact:true});
 await elegirTurno.click();
 const revision=page.getByRole('dialog',{name:'Confirmá tu turno'});
 await expect(revision).toBeVisible();
 await expect(revision.getByText('Tiempo para pagar',{exact:false})).toBeVisible();
 const abandonada=(await apiJson('/reservas/me',socio.token))[0];
 await revision.getByRole('button',{name:'Salir',exact:true}).click();
 await expect(page.getByRole('dialog')).toBeHidden();
 const liberada=await apiJson('/reservas/'+abandonada.id,socio.token);
 assert.equal(liberada.estado,'CANCELADA');assert.equal(liberada.pagoId,null);
 await expect(page.getByRole('button',{name:'Pagar reserva',exact:true})).toHaveCount(0);
 await elegirTurno.click();await expect(revision).toBeVisible();
 const reserva=(await apiJson('/reservas/me',socio.token))[0];assert.equal(reserva.precioAplicado,10200);assert.equal(reserva.turnoId,turno.id);
 assert.notEqual(reserva.id,abandonada.id);
 const claveReserva=await page.evaluate(({sedeCancha,turnoId,email})=>localStorage.getItem('fitzone:m4:intencion:'+email+':'+sedeCancha+':'+turnoId),{sedeCancha:cancha.id,turnoId:turno.id,email:socio.email});
 assert.match(claveReserva,/^[a-f0-9-]{36}$/);
 perderRespuesta=true;await revision.getByRole('button',{name:'Confirmar pago',exact:true}).click();
 const aprobado=page.getByRole('dialog',{name:'Pago aprobado'});
 await expect(aprobado.getByRole('status')).toContainText('Recuperamos el resultado',{timeout:25000});assert(respuestaPerdida);perderRespuesta=false;
 await page.screenshot({path:resolve(out,'pago-aprobado.png')});
 const confirmada=await apiJson('/reservas/'+reserva.id,socio.token);assert.equal(confirmada.estado,'CONFIRMADA');
 assert.equal(Number(sql("SELECT count(*) FROM pago WHERE tipo_referencia='RESERVA_CANCHA' AND referencia_id="+reserva.id)),1);
 const repetida=await apiJson('/canchas/'+cancha.id+'/reservas',socio.token,{turnoId:turno.id},201,'POST',{'Idempotency-Key':claveReserva});assert.equal(repetida.id,reserva.id);assert.equal(repetida.estado,'CONFIRMADA');
 await expect(aprobado.getByRole('link',{name:'Ir a Mis pagos'})).toBeVisible();
 await aprobado.getByRole('link',{name:'Ir a mis reservas'}).click();await expect(page).toHaveURL(base+'/mis-reservas#canchas');
 const bloqueCanchas=page.getByRole('region',{name:'Reservas de canchas'});
 const bloqueClases=page.getByRole('region',{name:'Reservas de clases'});
 await expect(bloqueCanchas).toContainText('Cancha E2E');
 await expect(bloqueCanchas.locator('article')).toHaveCount(1);
 await page.getByRole('link',{name:'Mis pagos',exact:true}).click();await expect(page).toHaveURL(base+'/pagos');
 await expect(page.getByRole('heading',{name:'Mis pagos',exact:true,level:2})).toBeVisible();
 const tarjeta=page.locator('.receipt-card').filter({hasText:'Pago #'+confirmada.pagoId});
 const descarga=page.waitForEvent('download');await tarjeta.getByRole('button',{name:'Descargar PDF',exact:false}).click();await (await descarga).saveAs(resolve(out,'comprobante-cancha.pdf'));
 const obtenerPdf=async()=>{const r=await fetch(api+'/pagos/'+confirmada.pagoId+'/comprobante',{headers:{Authorization:'Bearer '+socio.token}});assert.equal(r.status,200);return Buffer.from(await r.arrayBuffer());};
 const original=await obtenerPdf();assert.equal(original.subarray(0,4).toString(),'%PDF');
 paso('Chrome real: fecha automática y manual, descuento visible, Salir libera sin pago, confirmación recuperada por GET y descarga PDF desde Mis pagos');
 const admin=await terminal.newContext();const ap=await admin.newPage();await ap.goto(base+'/login');await ap.evaluate(t=>localStorage.setItem('token',t),gerente.token);await ap.goto(base+'/admin/canchas');
 await ap.locator('select').first().selectOption(String(sede));await ap.locator('.admin-canchas-item').filter({hasText:'Cancha E2E'}).click();
 const mantenimiento=ap.locator('form').filter({has:ap.getByRole('button',{name:'Registrar mantenimiento',exact:true})});
 await mantenimiento.getByLabel('Inicio',{exact:true}).fill(fecha+'T19:00');await mantenimiento.getByLabel('Fin (opcional)',{exact:true}).fill(fecha+'T20:00');await mantenimiento.getByLabel('Motivo',{exact:true}).fill('No borrar ante conflicto');
 await mantenimiento.getByRole('button',{name:'Registrar mantenimiento',exact:true}).click();await expect(ap.getByRole('alert')).toBeVisible();await expect(mantenimiento.getByLabel('Motivo',{exact:true})).toHaveValue('No borrar ante conflicto');
 await ap.locator('select').first().selectOption(String(vacia));await expect(ap.getByLabel('Recargo porcentual (0 a 100)',{exact:true})).toHaveValue('');
 terminalPage=ap;
 await ap.goto(base+'/clases');
 await ap.locator('.agenda-filtros select').selectOption(String(sede));
 await expect(ap.getByRole('article',{name:/^Pilates E2E,/})).toBeVisible();
 await expect(ap.getByRole('button',{name:'Nueva clase'})).toBeVisible();

 const contextoRecepcion=await terminal.newContext();
 const rp=await contextoRecepcion.newPage();
 terminalPage=rp;
 await iniciarSesion(rp,recepcion,'/recepcion/acceso');
 await rp.getByRole('link',{name:'Aforo',exact:true}).click();
 await expect(rp).toHaveURL(base+'/recepcion/aforo');
 await rp.getByRole('link',{name:'Clases',exact:true}).click();
 const selectorSedeRecepcion=rp.locator('.agenda-filtros select');
 await expect(selectorSedeRecepcion).toBeDisabled();
 await expect(selectorSedeRecepcion).toHaveValue(String(sede));
 await expect(rp.getByRole('article',{name:/^Pilates E2E,/})).toBeVisible();
 await expect(rp.getByRole('button',{name:'Nueva clase'})).toBeVisible();
 await expect(rp.getByRole('link',{name:'Mis reservas',exact:true})).toHaveCount(0);
 await rp.goto(base+'/mis-reservas');
 await expect(rp).toHaveURL(base+'/perfil');
 await contextoRecepcion.close();
 paso('Chrome y HTTP reales: Gerencia administra canchas y consulta clases; Recepción conserva acceso, aforo y agenda de su sede');

 terminalPage=page;
 await page.goto(base+'/clases');
 await page.getByRole('article',{name:/^Pilates E2E,/}).getByRole('button',{name:'Reservar',exact:true}).click();
 const reservaClase=page.getByRole('dialog',{name:'Tu reserva está confirmada'});
 await reservaClase.getByRole('link',{name:'Ir a mis reservas'}).click();
 await expect(page).toHaveURL(base+'/mis-reservas#clases');
 await expect(bloqueClases).toContainText('Pilates E2E');await expect(bloqueCanchas).toContainText('Cancha E2E');
 assert.equal((await apiJson('/clases/me',socio.token)).reservas[0].reserva.claseId,clase.id);
 await page.screenshot({path:resolve(out,'mis-reservas-escritorio.png'),fullPage:true});
 const movilSocio=await telefono.newContext({viewport:{width:390,height:850}});
 const mp=await movilSocio.newPage();
 await mp.goto(base+'/login');await mp.evaluate(t=>localStorage.setItem('token',t),socio.token);
 await mp.goto(base+'/mis-reservas');
 await expect(mp.getByRole('region',{name:'Reservas de canchas'})).toContainText('Cancha E2E');
 await expect(mp.getByRole('region',{name:'Reservas de clases'})).toContainText('Pilates E2E');
 assert(await mp.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 await mp.screenshot({path:resolve(out,'mis-reservas-movil.png'),fullPage:true});
 await movilSocio.close();

 await bloqueClases.getByRole('button',{name:'Cancelar reserva'}).click();
 const cancelarClase=page.getByRole('dialog',{name:'¿Cancelar tu reserva?'});
 await cancelarClase.getByRole('button',{name:'Confirmar cancelación'}).click();
 await expect(bloqueClases).toContainText('Todavía no tenés clases reservadas');
 assert.equal((await apiJson('/clases/me',socio.token)).reservas.length,0);
 await bloqueCanchas.getByRole('button',{name:'Cancelar reserva'}).click();
 const cancelarTurno=page.getByRole('dialog',{name:'¿Cancelar tu turno?'});
 await cancelarTurno.getByRole('button',{name:'Mantener reserva'}).click();
 assert.equal((await apiJson('/reservas/'+reserva.id,socio.token)).estado,'CONFIRMADA');
 await bloqueCanchas.getByRole('button',{name:'Cancelar reserva'}).click();
 await cancelarTurno.getByRole('button',{name:'Confirmar cancelación'}).click();
 await expect(page.getByRole('status').filter({hasText:'cancelada correctamente'})).toBeVisible();
 paso('Mis reservas en Chrome: canchas y clases juntas en escritorio y móvil; accesos desde ambos modales y cancelaciones independientes');
 const pago=await apiJson('/pagos/'+confirmada.pagoId,socio.token);assert.equal(pago.estado,'REEMBOLSADO');assert.equal(Number(pago.montoReembolsado),10200);assert.deepEqual(await obtenerPdf(),original);
 const contextoExterno=await telefono.newContext({viewport:{width:390,height:850}});
 const ep=await contextoExterno.newPage();
 terminalPage=ep;
 await iniciarSesion(ep,rechazado,'/membresia');
 await ep.goto(base+'/canchas');
 await ep.locator('.m4-filtros select').selectOption(String(sede));
 await expect(ep.getByLabel('Fecha',{exact:true})).toHaveValue(fecha);
 await expect(ep.getByText('Tarifa general',{exact:true}).first()).toBeVisible();
 await expect(ep.getByText('Descuento de socio aplicado',{exact:false})).toHaveCount(0);
 await ep.locator('.m4-turno').nth(turnos.findIndex(t=>t.id===otro.id)).getByRole('button',{name:'Elegir turno',exact:true}).click();
 const revisionExterno=ep.getByRole('dialog',{name:'Confirmá tu turno'});
 await expect(revisionExterno).toBeVisible();
 const reservaRechazada=(await apiJson('/reservas/me',rechazado.token))[0];
 assert.equal(reservaRechazada.turnoId,otro.id);
 await revisionExterno.getByRole('button',{name:'Confirmar pago'}).click();
 const rechazo=ep.getByRole('dialog',{name:'Pago rechazado'});
 await expect(rechazo).toBeVisible();
 await ep.screenshot({path:resolve(out,'pago-rechazado-movil.png')});
 await rechazo.getByRole('button',{name:'Cerrar'}).click();
 await expect(rechazo).toBeHidden();
 await expect(ep).toHaveURL(base+'/canchas');
 const registroRechazado=await apiJson('/reservas/'+reservaRechazada.id,rechazado.token);
 const pagoRechazado=await apiJson('/pagos/'+registroRechazado.pagoId,rechazado.token);assert.equal(pagoRechazado.estado,'RECHAZADO');
 assert.equal((await fetch(api+'/pagos/'+pagoRechazado.id+'/comprobante',{headers:{Authorization:'Bearer '+rechazado.token}})).status,409);
 assert.equal((await apiJson('/reservas/'+reservaRechazada.id,rechazado.token)).estado,'RECHAZADA');
 await page.goto(base+'/pagos');await expect(page.locator('.receipt-card').filter({hasText:'Pago #'+confirmada.pagoId})).toContainText('Reembolsado');
 await page.screenshot({path:resolve(out,'historial-reembolso.png'),fullPage:true});
 paso('Chrome/HTTP reales: mantenimiento en conflicto conserva formulario, sede vacía limpia recargo, cancelación reembolsa y PDF histórico no cambia; rechazo libera turno sin PDF');

 const contextoMembresia=await telefono.newContext();
 const mpago=await contextoMembresia.newPage();
 terminalPage=mpago;
 await iniciarSesion(mpago,externo,'/membresia');
 await mpago.getByRole('button',{name:/Elegir este plan.*Plan M4 E2E/}).click();
 await mpago.locator('#sede-habitual').selectOption(String(sede));
 await mpago.getByRole('button',{name:'Confirmar contratación'}).click();
 const resumenMembresia=mpago.getByRole('article',{name:'Resumen de membresía'});
 await expect(resumenMembresia.getByRole('heading',{name:'Plan M4 E2E',exact:true})).toBeVisible();
 await expect(mpago.getByRole('button',{name:'Renovar plan'})).toHaveCount(0);
 const primera=await apiJson('/membresias/me',externo.token);
 assert.equal(primera.estado,'ACTIVA');
 assert.equal(primera.periodos.length,1);
 const ahoraLocal="timezone('America/Argentina/Buenos_Aires', now())";
 // Se acorta la vigencia únicamente en la base descartable para ejercitar la ventana de renovación.
 sql(`UPDATE periodo_membresia SET fin=${ahoraLocal} + interval '3 days' WHERE id=${primera.periodoVigente.id};
      UPDATE membresia SET fecha_fin=(SELECT fin FROM periodo_membresia WHERE id=${primera.periodoVigente.id}) WHERE id=${primera.id};`);
 const porVencer=await apiJson('/membresias/me',externo.token);
 await mpago.reload();
 await mpago.getByRole('button',{name:'Renovar plan'}).click();
 await mpago.getByRole('button',{name:/Elegir este plan.*Trimestral E2E/}).click();
 await mpago.getByRole('button',{name:'Confirmar renovación'}).click();
 await expect(mpago.getByRole('status').filter({hasText:'Renovación confirmada'})).toBeVisible();
 const renovada=await apiJson('/membresias/me',externo.token);
 assert.equal(renovada.periodos.length,2);
 assert.deepEqual(renovada.periodoVigente,porVencer.periodoVigente);
 const siguiente=renovada.periodos.find(periodo=>periodo.estado==='PROGRAMADA');
 assert.equal(siguiente.planId,planTrimestral);
 assert.equal(siguiente.inicio,renovada.periodoVigente.fin);
 await expect(resumenMembresia.getByRole('heading',{name:'Plan M4 E2E',exact:true})).toBeVisible();
 await expect(mpago.locator('.member-payments-panel')).toContainText('Trimestral E2E');
 await mpago.screenshot({path:resolve(out,'membresia-pagos-vigentes.png'),fullPage:true});
 await mpago.goto(base+'/comprobantes');
 await expect(mpago).toHaveURL(base+'/pagos');
 await expect(mpago.getByRole('heading',{name:'Mis pagos',exact:true,level:2})).toBeVisible();
 await contextoMembresia.close();
 paso('Chrome y HTTP reales: login de Socio y Cliente Externo, contratación, renovación con cambio de plan y enlace anterior de comprobantes');

 await writeFile(resolve(out,'resultado.json'),JSON.stringify({aprobada:true,fecha:new Date().toISOString(),pasos,reserva:reserva.id,pago:confirmada.pagoId,respuestaPerdida,duplicados:0},null,2));console.log('E2E APROBADA: '+out);
} catch(error) {
 if(terminalPage)await terminalPage.screenshot({path:resolve(out,'fallo.png'),fullPage:true}).catch(()=>{});
 await writeFile(resolve(out,'resultado.json'),JSON.stringify({aprobada:false,pasos,error:error.message},null,2));throw error;
} finally {
 await terminal?.close().catch(()=>{});await telefono?.close().catch(()=>{});if(server)await new Promise(r=>server.close(r));
 if(javaCreado)docker(['rm','-f',java]);if(pgCreado)docker(['rm','-f',pg]);await unlink(resolve(out,'backend.env')).catch(()=>{});consola.end();proceso?.kill();
}
