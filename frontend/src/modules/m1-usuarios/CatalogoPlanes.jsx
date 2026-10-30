import { AppButton } from '../../components/ui/FitZoneUI';

export default function CatalogoPlanes({ planes, seleccionado, bloqueado, onSeleccionar }) {
  return <div className="plan-catalog" role="group" aria-label="Elegí un plan">
    {planes.map((plan) => <article className={`panel plan-offer${seleccionado === String(plan.id) ? ' plan-offer--selected' : ''}`} key={plan.id}>
      <span className="eyebrow">MEMBRESÍA</span><h4>{plan.nombre}</h4>
      <strong className="plan-offer__price">{Number(plan.precio).toLocaleString('es-AR', { style: 'currency', currency: 'ARS' })}</strong>
      <p>{plan.duracionMeses} {plan.duracionMeses === 1 ? 'mes' : 'meses'}</p>
      <AppButton type="button" variant={seleccionado === String(plan.id) ? 'primary' : 'secondary'} aria-pressed={seleccionado === String(plan.id)} disabled={bloqueado} onClick={() => onSeleccionar(String(plan.id))}>
        {seleccionado === String(plan.id) ? 'Plan seleccionado' : 'Elegir plan'}<span className="sr-only">: {plan.nombre}</span>
      </AppButton>
    </article>)}
  </div>;
}
