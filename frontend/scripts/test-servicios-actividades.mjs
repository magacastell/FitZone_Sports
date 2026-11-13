
// Ejecutar desde frontend:
// node --experimental-vm-modules scripts/test-servicios-actividades.mjs

import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';

let llamada;
let fallo;
let aprobadas = 0;

const claveReserva = '00000000-0000-4000-8000-000000000001';

for (const archivo of ['m3Service', 'm4Service']) {
  const context = vm.createContext({
    JSON,
    URLSearchParams,
    encodeURIComponent
  });

  const api = new vm.SyntheticModule(
    ['fetchAPI'],
    function () {
      this.setExport('fetchAPI', (...args) => {
        llamada = args;

        if (fallo) throw fallo;

        return Promise.resolve({ real: true });
      });
    },
    { context }
  );

  const mod = new vm.SourceTextModule(
    fs.readFileSync(`src/services/${archivo}.js`, 'utf8'),
    { context }
  );

  await mod.link(() => api);
  await mod.evaluate();

  const casos = archivo === 'm3Service'
    ? [
        ['listarClases', [28], '/clases?sedeId=28&page=0&size=20'],
        ['crearClase', [{ nombre: 'Real' }], '/clases', 'POST', { nombre: 'Real' }],
        ['actualizarClase', [3, { cupo: 20 }], '/clases/3', 'PATCH', { cupo: 20 }],
        ['cancelarClase', [3, 'Motivo real'], '/clases/3/cancelacion', 'POST', { motivo: 'Motivo real' }],
        ['reservarClase', [3], '/clases/3/reservas', 'POST'],
        ['cancelarReservaClase', [3, 9], '/clases/3/reservas/9', 'DELETE'],
        ['listarAsistentes', [3], '/clases/3/reservas'],
        ['entrarEnEspera', [3], '/clases/3/lista-espera', 'POST'],
        ['salirDeEspera', [3], '/clases/3/lista-espera/me', 'DELETE']
      ]
    : [
        ['listarCanchas', [28], '/canchas?sedeId=28'],
        ['listarTurnos', [3, '2026-11-01', '2026-11-02'], '/canchas/3/turnos?desde=2026-11-01&hasta=2026-11-02'],
        ['crearCancha', [{ tipo: 'PADEL' }], '/canchas', 'POST', { tipo: 'PADEL' }],
        ['actualizarCancha', [3, { activa: false }], '/canchas/3', 'PATCH', { activa: false }],
        ['crearTurno', [3, { inicio: 'real' }], '/canchas/3/turnos', 'POST', { inicio: 'real' }],

        // El backend exige UUID para evitar reservas duplicadas.
        [
          'reservarCancha',
          [3, { turnoId: 9 }, claveReserva],
          '/canchas/3/reservas',
          'POST',
          { turnoId: 9 },
          { 'Idempotency-Key': claveReserva }
        ],

        ['cancelarReservaCancha', [3, 9], '/canchas/3/reservas/9', 'DELETE'],
        ['crearMantenimiento', [3, { motivo: 'Reparación' }], '/canchas/3/mantenimientos', 'POST', { motivo: 'Reparación' }],
        ['eliminarMantenimiento', [3, 9], '/canchas/3/mantenimientos/9', 'DELETE']
      ];

  for (const [nombre, args, ruta, metodo, body, headers] of casos) {
    assert.equal(
      (await mod.namespace[nombre](...args)).real,
      true
    );

    assert.equal(llamada[0], ruta);
    assert.equal(llamada[1]?.method, metodo);
    assert.equal(
      llamada[1]?.body,
      body ? JSON.stringify(body) : undefined
    );

    // Comprueba que la clave de idempotencia llegue al transporte.
    assert.equal(
      llamada[1]?.headers?.['Idempotency-Key'],
      headers?.['Idempotency-Key']
    );

    // El servicio debe conservar y propagar la excepción original.
    fallo = Object.assign(new Error('original'), { status: 501 });

    assert.throws(
      () => mod.namespace[nombre](...args),
      error => error === fallo
    );

    fallo = null;
    aprobadas++;
  }
}

console.log(`RESULTADO: ${aprobadas} contratos de transporte aprobados`);
