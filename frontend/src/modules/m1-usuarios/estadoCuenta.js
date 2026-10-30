export function nombreActor(rol, membresia) {
  if (rol === 'RECEPCIONISTA') return 'Recepción';
  if (rol === 'GERENTE') return 'Gerencia';
  if (rol !== 'USUARIO') return 'Mi cuenta';
  if (!membresia || ['cargando', 'error'].includes(membresia.estado)) return 'Mi cuenta';
  return membresia.estado === 'cargada' && membresia.datos.estado === 'ACTIVA' ? 'Socio' : 'Cliente';
}

export function periodosConPago(membresia) {
  return membresia?.estado === 'cargada' ? (membresia.datos.periodos || []).filter((p) => p.pagoId != null) : [];
}
