import { Link } from 'react-router-dom';

export default function FeaturePlaceholder({ title, description }) {
  return (
    <section className="feature-placeholder">
      <h2>{title}</h2>
      <p>{description}</p>
      <p>Esta pantalla es un punto de navegación inicial. La funcionalidad todavía no está implementada.</p>
      <Link to="/canchas">Volver al inicio</Link>
    </section>
  );
}
