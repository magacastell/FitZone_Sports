import { ArrowRight, Check, CreditCard } from 'lucide-react';
import { AppButton, StatusBadge } from '../../components/ui/FitZoneUI';

export default function CatalogoPlanes({ planes, seleccionado, bloqueado, onSeleccionar }) {
  return <div className="plan-catalog" role="group" aria-label="Elegí un plan">
    {planes.map((plan) => {
      const elegido = seleccionado === String(plan.id);
      return <article className={`plan-offer${elegido ? ' plan-offer--selected' : ''}`} key={plan.id}>
        <div className="plan-offer__top"><span className="plan-offer__icon" aria-hidden="true"><CreditCard /></span>{elegido && <StatusBadge tone="success">Seleccionado</StatusBadge>}</div>
        <div className="plan-offer__copy"><h4>{plan.nombre}</h4><p>Vigencia de {plan.duracionMeses} {plan.duracionMeses === 1 ? 'mes' : 'meses'}.</p></div>
        <div className="plan-offer__price"><strong>{Number(plan.precio).toLocaleString('es-AR', { style: 'currency', currency: 'ARS' })}</strong><span>por período contratado</span></div>
        <AppButton type="button" variant={elegido ? 'secondary' : 'primary'} aria-pressed={elegido} disabled={bloqueado} onClick={() => onSeleccionar(String(plan.id))}>
          {elegido ? <><Check aria-hidden="true" />Plan seleccionado</> : <>Elegir este plan<ArrowRight aria-hidden="true" /></>}<span className="sr-only">: {plan.nombre}</span>
        </AppButton>
      </article>;
    })}
  </div>;
}
