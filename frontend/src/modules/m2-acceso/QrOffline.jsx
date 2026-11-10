import { useEffect,useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { qrPreparado } from '../../services/offline/db';
import { obtenerQrAutomatico } from '../../services/offline/api';
import './OfflineAcceso.css';
export default function QrOffline() {
  const [dato,setDato]=useState(null),[error,setError]=useState('');
  useEffect(()=>{
    let vivo=true;
    const renovar=()=>obtenerQrAutomatico().catch(()=>{});
    renovar();
    const refresco=setInterval(renovar,60000);
    window.addEventListener('online',renovar);
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
    return()=>{vivo=false;clearInterval(timer);clearInterval(refresco);window.removeEventListener('online',renovar);};
  },[]);
  return <main className="fitzone-ui"><section className="panel offline-qr"><h1>Mi QR</h1><p>Rotación de hasta 60 segundos. Sin Internet se usa únicamente una autorización vigente guardada al conectarte.</p>{dato?<><QRCodeSVG value={dato.token} size={220} title="QR offline rotativo"/><p>Vence {dato.venceEn}</p></>:<p role="alert">{error||'Comprobando credencial...'}</p>}<a href="/mi-qr">Volver a Mi QR</a></section></main>;
}
