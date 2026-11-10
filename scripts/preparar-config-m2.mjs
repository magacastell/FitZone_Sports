// Generación explícita y única: jamás se ejecuta al iniciar Spring ni rota claves existentes.
import {randomBytes,generateKeyPairSync,createPrivateKey} from 'node:crypto';
import {existsSync,lstatSync,readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {resolve,relative,isAbsolute,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const archivo=resolve(root,process.argv[2]||'.env');
const ubicacion=relative(root,archivo);
if(ubicacion.startsWith('..')||isAbsolute(ubicacion))throw Error('El archivo debe estar dentro del proyecto.');
if(existsSync(archivo)&&lstatSync(archivo).isSymbolicLink())throw Error('No se modifica un enlace simbólico.');
const previo=existsSync(archivo)?readFileSync(archivo,'utf8'):null;
let contenido=previo??readFileSync(resolve(root,'.env.example'),'utf8');
for(const nombre of ['JWT_SECRET','FITZONE_OFFLINE_PRIVATE_KEY']) {
  const patron=new RegExp(`^${nombre}=([^\\r\\n]*)`,'m');
  const actual=contenido.match(patron);
  if(!actual)throw Error(`Falta ${nombre}; revisar la plantilla sin sobrescribir el archivo existente.`);
  if(actual[1].trim())continue;
  const valor=nombre==='JWT_SECRET'?randomBytes(48).toString('base64')
    :generateKeyPairSync('rsa',{modulusLength:2048}).privateKey.export({type:'pkcs8',format:'der'}).toString('base64');
  contenido=contenido.replace(patron,`${nombre}=${valor}`);
}
// Una clave malformada exige corrección explícita, nunca sustitución silenciosa.
try {
  const valor=contenido.match(/^FITZONE_OFFLINE_PRIVATE_KEY=([^\r\n]*)/m)[1];
  if(!/^[A-Za-z0-9+/]+={0,2}$/.test(valor)||valor.length%4!==0)throw Error();
  const clave=createPrivateKey({key:Buffer.from(valor,'base64'),format:'der',type:'pkcs8'});
  if(clave.asymmetricKeyType!=='rsa'||clave.asymmetricKeyDetails.modulusLength<2048)throw Error();
} catch {throw Error('FITZONE_OFFLINE_PRIVATE_KEY debe ser RSA PKCS8 base64, mínimo 2048 bits; no se modificó el archivo.');}
if(contenido!==previo) {
  mkdirSync(dirname(archivo),{recursive:true});
  writeFileSync(archivo,contenido,{encoding:'utf8',mode:0o600,flag:previo===null?'wx':'w'});
}
console.log(`Configuración preparada en ${ubicacion}. Claves existentes conservadas; valores privados no impresos.`);
if(/^DB_PASSWORD=\s*$/m.test(contenido))console.log('Pendiente: completar DB_PASSWORD para la base elegida.');
