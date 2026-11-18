package com.fitzonesports.reporte.service;

import com.fitzonesports.reporte.dto.ReporteAccesosResponse;
import com.fitzonesports.reporte.dto.ReporteFinancieroResponse;
import com.fitzonesports.reporte.repository.ReporteConsultaRepository;
import com.fitzonesports.reporte.repository.ReporteConsultaRepository.AccesosSede;
import com.fitzonesports.reporte.repository.ReporteConsultaRepository.Importes;
import com.fitzonesports.reporte.repository.ReporteConsultaRepository.SedeBase;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Clock;
import java.time.Duration;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Isolation;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

/**
 * Reportes consolidados del Gerente Central (solo lectura). El período es [desde, hasta): incluye el instante desde y
 * excluye hasta. Las fechas llegan con offset y se convierten a la hora argentina del reloj de la aplicación, que es
 * como se guardan los registros. Cada reporte corre en una transacción REPEATABLE READ de solo lectura para que sus
 * varias consultas vean el mismo estado de la base y los totales cierren con los desgloses.
 */
@Service
@RequiredArgsConstructor
public class ReporteService {

    /** Un período largo generaría una serie diaria enorme; un año calendario alcanza para el análisis. */
    static final Duration PERIODO_MAXIMO = Duration.ofDays(366);
    static final String MONEDA = "ARS";

    private final ReporteConsultaRepository repositorio;
    private final Clock clock;

    @Transactional(readOnly = true, isolation = Isolation.REPEATABLE_READ)
    public ReporteAccesosResponse accesos(OffsetDateTime desde, OffsetDateTime hasta, Integer sedeId) {
        Periodo periodo = validar(desde, hasta, sedeId);
        var global = repositorio.accesosGlobal(periodo.desde, periodo.hasta, sedeId);
        Map<Integer, AccesosSede> porSede = repositorio.accesosPorSede(periodo.desde, periodo.hasta, sedeId).stream()
                .collect(Collectors.toMap(AccesosSede::sedeId, Function.identity()));
        Map<Integer, Integer> picos = repositorio.picoPorSede(periodo.desde, periodo.hasta, sedeId);
        Map<LocalDate, ReporteConsultaRepository.AccesosDia> porDia = repositorio
                .accesosPorDia(periodo.desde, periodo.hasta, sedeId).stream()
                .collect(Collectors.toMap(ReporteConsultaRepository.AccesosDia::fecha, Function.identity()));

        List<ReporteAccesosResponse.PorSede> filasSede = new ArrayList<>();
        for (SedeBase sede : repositorio.sedes(sedeId)) {
            AccesosSede dato = porSede.get(sede.id());
            int pico = picos.getOrDefault(sede.id(), 0);
            BigDecimal porcentaje = BigDecimal.valueOf(pico).multiply(BigDecimal.valueOf(100))
                    .divide(BigDecimal.valueOf(sede.capacidadMaxima()), 1, RoundingMode.HALF_UP);
            filasSede.add(new ReporteAccesosResponse.PorSede(sede.id(), sede.nombre(), sede.capacidadMaxima(),
                    dato == null ? 0 : dato.total(), dato == null ? 0 : dato.unicos(), pico, porcentaje,
                    dato == null ? null : dato.permanenciaMedia()));
        }
        List<ReporteAccesosResponse.PorDia> filasDia = new ArrayList<>();
        for (LocalDate dia : dias(periodo)) {
            var dato = porDia.get(dia);
            filasDia.add(new ReporteAccesosResponse.PorDia(dia, dato == null ? 0 : dato.total(),
                    dato == null ? 0 : dato.unicos()));
        }
        return new ReporteAccesosResponse(OffsetDateTime.now(clock), desde, hasta, sedeId,
                new ReporteAccesosResponse.Resumen(global.total(), global.unicos(), global.offline(),
                        global.sinSalida(), global.permanenciaMedia()),
                filasSede, filasDia, List.of(
                        "Solo cuenta ingresos ya registrados en la base central: los ingresos tomados sin conexión "
                                + "(modo offline) aparecen recién cuando la terminal los sincroniza.",
                        "No es el aforo actual: el aforo en vivo de cada sede se consulta en el Panel general.",
                        "La permanencia media usa solo ingresos con salida registrada; los ingresos que quedaron "
                                + "abiertos se cierran solos a las 23:59 y alargan ese promedio."));
    }

    @Transactional(readOnly = true, isolation = Isolation.REPEATABLE_READ)
    public ReporteFinancieroResponse financiero(OffsetDateTime desde, OffsetDateTime hasta, Integer sedeId) {
        Periodo periodo = validar(desde, hasta, sedeId);
        var sedes = repositorio.importesPorSede(periodo.desde, periodo.hasta, sedeId);
        Map<Integer, Importes> porSede = new LinkedHashMap<>();
        Importes sinSede = null;
        for (var fila : sedes) {
            if (fila.sedeId() == null) {
                sinSede = fila.importes();
            } else {
                porSede.put(fila.sedeId(), fila.importes());
            }
        }
        List<ReporteFinancieroResponse.PorSede> filasSede = new ArrayList<>();
        Importes total = vacio();
        for (SedeBase sede : repositorio.sedes(sedeId)) {
            Importes dato = porSede.getOrDefault(sede.id(), vacio());
            filasSede.add(fila(sede.id(), sede.nombre(), dato));
            total = sumar(total, dato);
        }
        if (sinSede != null) {
            filasSede.add(fila(null, null, sinSede));
            total = sumar(total, sinSede);
        }
        filasSede.sort(Comparator.comparing(ReporteFinancieroResponse.PorSede::neto).reversed()
                .thenComparing(f -> f.sedeNombre() == null ? "￿" : f.sedeNombre()));

        List<ReporteFinancieroResponse.PorConcepto> conceptos = repositorio
                .importesPorConcepto(periodo.desde, periodo.hasta, sedeId).stream()
                .map(c -> new ReporteFinancieroResponse.PorConcepto(c.concepto(), c.importes().cobros(),
                        c.importes().devoluciones(), c.importes().neto(), c.importes().nCobros(),
                        c.importes().nDevoluciones()))
                .toList();

        Map<LocalDate, Importes> porDia = repositorio.importesPorDia(periodo.desde, periodo.hasta, sedeId).stream()
                .collect(Collectors.toMap(ReporteConsultaRepository.ImportesDia::fecha,
                        ReporteConsultaRepository.ImportesDia::importes));
        List<ReporteFinancieroResponse.PorDia> filasDia = new ArrayList<>();
        for (LocalDate dia : dias(periodo)) {
            Importes dato = porDia.getOrDefault(dia, vacio());
            filasDia.add(new ReporteFinancieroResponse.PorDia(dia, dato.cobros(), dato.devoluciones(), dato.neto()));
        }
        long rechazadas = repositorio.operacionesRechazadas(periodo.desde, periodo.hasta, sedeId);
        return new ReporteFinancieroResponse(OffsetDateTime.now(clock), desde, hasta, sedeId, MONEDA,
                new ReporteFinancieroResponse.Totales(total.cobros(), total.devoluciones(), total.neto(),
                        total.nCobros(), total.nDevoluciones(), rechazadas),
                filasSede, conceptos, filasDia, List.of(
                        "Los cobros se ubican por la fecha del pago y las devoluciones por la fecha de la devolución: "
                                + "una devolución puede restar a un período distinto del pago original, por eso el neto "
                                + "puede ser negativo.",
                        "Cada cobro se atribuye a la sede de la membresía contratada o de la cancha reservada, no a la "
                                + "sede actual del usuario. La fila sin sede reúne pagos cuya sede no se puede determinar.",
                        "Los pagos rechazados no suman a ningún importe; se informan solo como cantidad."));
    }

    private Periodo validar(OffsetDateTime desde, OffsetDateTime hasta, Integer sedeId) {
        if (!desde.isBefore(hasta)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "desde debe ser anterior a hasta");
        }
        if (Duration.between(desde, hasta).compareTo(PERIODO_MAXIMO) > 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "El período no puede superar los 366 días: dividí la consulta");
        }
        if (sedeId != null && !repositorio.existeSede(sedeId)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "La sede no existe");
        }
        return new Periodo(local(desde), local(hasta));
    }

    private LocalDateTime local(OffsetDateTime valor) {
        return valor.atZoneSameInstant(clock.getZone()).toLocalDateTime();
    }

    /** Días calendario argentinos que toca [desde, hasta): el último incluye el instante anterior a hasta. */
    private List<LocalDate> dias(Periodo periodo) {
        LocalDate primero = periodo.desde.toLocalDate();
        LocalDate ultimo = periodo.hasta.minusNanos(1).toLocalDate();
        List<LocalDate> dias = new ArrayList<>();
        for (LocalDate dia = primero; !dia.isAfter(ultimo); dia = dia.plusDays(1)) {
            dias.add(dia);
        }
        return dias;
    }

    private static Importes vacio() {
        return new Importes(BigDecimal.ZERO.setScale(2), BigDecimal.ZERO.setScale(2), 0, 0);
    }

    private static Importes sumar(Importes a, Importes b) {
        return new Importes(a.cobros().add(b.cobros()), a.devoluciones().add(b.devoluciones()),
                a.nCobros() + b.nCobros(), a.nDevoluciones() + b.nDevoluciones());
    }

    private static ReporteFinancieroResponse.PorSede fila(Integer id, String nombre, Importes i) {
        return new ReporteFinancieroResponse.PorSede(id, nombre, i.cobros(), i.devoluciones(), i.neto(), i.nCobros(),
                i.nDevoluciones());
    }

    private record Periodo(LocalDateTime desde, LocalDateTime hasta) {
    }
}
