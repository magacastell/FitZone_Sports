import { useEffect, useState } from 'react';
import { validarFoto } from '../services/fotoPerfil';

export default function SelectorFoto({ id, onSeleccionar, required = false, disabled = false }) {
  const [archivo, setArchivo] = useState(null);
  const [error, setError] = useState(null);
  const [vista, setVista] = useState(null);
  useEffect(() => {
    if (!archivo) { setVista(null); return; }
    const url = URL.createObjectURL(archivo);
    setVista(url);
    return () => URL.revokeObjectURL(url);
  }, [archivo]);
  return <div className="selector-foto" style={{ marginBlock: '1rem' }}>
    <label htmlFor={id}>Foto de perfil{required ? ' (obligatoria)' : ''}</label>
    <p id={`${id}-ayuda`} style={{ fontSize: '0.85rem' }}>PNG o JPEG, hasta 2 MB. Máximo 4096 px por lado y 8 megapíxeles.</p>
    <input id={id} type="file" accept="image/png,image/jpeg" required={required} disabled={disabled} aria-describedby={`${id}-ayuda`} aria-invalid={!!error}
      onChange={(event) => {
        const seleccionado = event.target.files?.[0];
        const problema = validarFoto(seleccionado);
        setError(problema); setArchivo(problema ? null : seleccionado); onSeleccionar(problema ? null : seleccionado);
      }} style={{ maxWidth: '100%' }} />
    {error && <p role="alert">{error}</p>}
    {vista && <img src={vista} alt="Vista previa de la foto seleccionada" style={{ display: 'block', width: 72, height: 72, objectFit: 'cover', borderRadius: '50%', marginTop: 12 }} />}
  </div>;
}
