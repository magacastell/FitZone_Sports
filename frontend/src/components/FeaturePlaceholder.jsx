import { Link } from 'react-router-dom';

export default function FeaturePlaceholder({ title, description }) {
  return (
    <section style={{ maxWidth: '700px', background: '#fff', padding: '1.5rem', borderRadius: '8px' }}>
      <h2>{title}</h2>
      <p>{description}</p>
      <p>Esta pantalla es un punto de navegación inicial. La funcionalidad todavía no está implementada.</p>
      <Link to="/canchas">Volver al inicio</Link>
    </section>
  );
}
