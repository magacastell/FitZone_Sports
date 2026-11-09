import { useEffect,useState } from 'react';
import { listarSedesAcceso } from '../../services/m2Service';
import { prepararCredenciales } from '../../services/offline/api';
export default function PrepararQrOffline({onPreparado}) {
  const [sedes,setSedes]=useState([]),[sede,setSede]=useState(''),[mensaje,setMensaje]=useState(''),[ocupado,setOcupado]=useState(false);
  useEffect(()=>{let vivo=true;listarSedesAcceso().then(datos=>{if(vivo)setSedes(datos);},()=>{});return()=>{vivo=false;};},[]);
  async function preparar(){
    if(ocupado)return;setOcupado(true);
    try{await prepararCredenciales(sede);setMensaje('QR preparados por hasta dos horas. Pedí a Recepción que actualice su copia.');onPreparado();}
    catch(e){setMensaje(e.message);}finally{setOcupado(false);}
  }
  return <div><label>Sede para acceso sin conexión<select aria-label="Sede offline" value={sede} onChange={e=>setSede(e.target.value)}><option value="">Elegí una sede</option>{sedes.map(s=><option key={s.id} value={s.id}>{s.nombre}</option>)}</select></label><button type="button" onClick={preparar} disabled={!sede||ocupado}>Preparar QR offline</button><p role="status">{mensaje}</p></div>;
}
