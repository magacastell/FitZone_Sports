import { useEffect,useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { qrPreparado } from '../../services/offline/db';
import './OfflineAcceso.css';
export default function QrOffline() {
  const [dato,setDato]=useState(null),[error,setError]=useState('');
  useEffect(()=>{
    let vivo=true;
    const actualizar=async()=>{
      try {
        const d=await qrPreparado(true);
        if(vivo){setDato(d);setError('');}
      } catch(e) {
        if(vivo){setDato(null);setError(e.message);}
      }
    };
    actualizar();
    const timer=setInterval(actualizar,500);
    return()=>{vivo=false;clearInterval(timer);};
  },[]);
  return <main className="fitzone-ui"><section className="panel offline-qr"><h1>Mi QR preparado sin conexión</h1><p>Ventana nominal de 60 segundos. No se generan credenciales nuevas en este dispositivo.</p>{dato?<><QRCodeSVG value={dato.token} size={220} title="QR offline rotativo"/><p>Vence {dato.venceEn}</p></>:<p role="alert">{error||'Comprobando credencial...'}</p>}<a href="/mi-qr">Preparar con conexión</a></section></main>;
}
