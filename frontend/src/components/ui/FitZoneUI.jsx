import { Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { fetchAPI } from '../../services/api';
import './FitZoneUI.css';

// Presentación portada de components/fitzone/shared.tsx de v0. Sin estado de dominio.
const buttonClass = (variant, size, className) => `fit-button fit-button--${variant} fit-button--${size} ${className}`.trim();

export function AppButton({ variant = 'primary', size = 'md', className = '', ...props }) {
  return <button className={buttonClass(variant, size, className)} {...props} />;
}

export function AppLink({ variant = 'secondary', size = 'md', className = '', ...props }) {
  return <Link className={buttonClass(variant, size, className)} {...props} />;
}

export function StatusBadge({ tone = 'neutral', children }) {
  return <span className={`status-badge status-badge--${tone}`}>{children}</span>;
}

export function PageHeading({ eyebrow, title, description, actions }) {
  return <div className="page-heading">
    <div className="page-heading__copy"><p className="eyebrow">{eyebrow}</p><h2>{title}</h2><p className="page-heading__description">{description}</p></div>
    {actions && <div className="page-heading__actions">{actions}</div>}
  </div>;
}

export function PanelHeading({ title, description, action }) {
  return <div className="panel-heading">
    <div><h3>{title}</h3>{description && <p>{description}</p>}</div>
    {action && <div className="panel-heading__action">{action}</div>}
  </div>;
}

export function DataCard({ className = '', title, description, action, children, ...props }) {
  return <section className={`panel ${className}`.trim()} aria-label={title} {...props}>
    <PanelHeading title={title} description={description} action={action} />
    {children}
  </section>;
}

export function AvatarCircle({ initials, foto, size = 'md', className }) {
  const { token } = useAuth();
  const [imagen, setImagen] = useState(null);
  useEffect(() => {
    let activo = true, url;
    setImagen(null);
    // Sólo referencias propias generadas por el servidor; no cargar URLs externas.
    if (token && /^\/usuarios\/me\/foto\?version=[0-9a-f-]{36}$/.test(foto || '')) {
      fetchAPI(foto, { responseType: 'blob' }).then((blob) => {
        if (activo && localStorage.getItem('token') === token) {
          url = URL.createObjectURL(blob); setImagen(url);
        }
      }).catch(() => { /* Mantener iniciales si no hay imagen disponible. */ });
    }
    return () => { activo = false; if (url) URL.revokeObjectURL(url); };
  }, [foto, token]);
  return <span className={className || `avatar-circle avatar-circle--${size}`} aria-hidden="true">{imagen ? <img src={imagen} alt="" onError={() => setImagen(null)} /> : initials}</span>;
}

export function EmptyState({ title, description, icon: Icon, action }) {
  return <div className="empty-state">
    <span className="empty-state__icon" aria-hidden="true"><Icon /></span><h4>{title}</h4><p>{description}</p>
    {action && <div className="empty-state__action">{action}</div>}
  </div>;
}
