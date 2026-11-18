package com.fitzonesports.reporte.repository;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Repository;

/**
 * Agregaciones de solo lectura para los reportes del Gerente Central.
 *
 * Se usa SQL parametrizado (y no JPA/JPQL) porque cada reporte es una agregación (GROUP BY, COUNT DISTINCT, ventanas,
 * FILTER) sobre varias tablas de módulos distintos (acceso, pago, membresía, reserva): no hay entidad que cargar y
 * JPQL no expresa las funciones de ventana del pico simultáneo. Es el mismo criterio que ya usan M4/M5 con JdbcTemplate.
 * Todos los parámetros viajan como parámetros con nombre, nunca concatenados. Las fechas son LocalDateTime argentinas,
 * porque así se guardan fecha_hora_ingreso, fecha_pago y reembolso_pago.fecha.
 */
@Repository
public class ReporteConsultaRepository {

    /** Pagos que cuentan como cobro: aprobados y los que luego se devolvieron total o parcialmente. */
    private static final String ESTADOS_COBRO = "('APROBADO','REEMBOLSADO','REEMBOLSADO_PARCIAL')";

    /**
     * Sede de cada pago. Membresía: la de la membresía del período que pagó. Cancha: la de la cancha reservada.
     * Cada pago tiene a lo sumo un período (periodo_membresia.pago_id es único) y una reserva (uk_pago_reserva_cancha),
     * y cada devolución a lo sumo un pago (reembolso_pago.pago_id es único): los JOIN no duplican filas.
     */
    private static final String ATRIBUCION = """
            LEFT JOIN periodo_membresia pm ON p.tipo_referencia = 'MEMBRESIA' AND pm.pago_id = p.id
            LEFT JOIN membresia m ON m.id = pm.membresia_id
            LEFT JOIN reserva_cancha rc ON p.tipo_referencia = 'RESERVA_CANCHA' AND rc.id = p.referencia_id
            LEFT JOIN turno_cancha t ON t.id = rc.turno_canchaid
            LEFT JOIN cancha c ON c.id = t.canchaid
            """;

    private static final String MOVIMIENTOS = """
            SELECT p.fecha_pago AS fecha, COALESCE(m.sedeid, c.sedeid) AS sede_id, p.tipo_referencia AS concepto,
                   p.monto AS cobro, CAST(0 AS numeric) AS devolucion, 1 AS n_cobro, 0 AS n_devolucion
              FROM pago p
            """ + ATRIBUCION + """
             WHERE p.estado IN """ + ESTADOS_COBRO + """
               AND p.fecha_pago >= :desde AND p.fecha_pago < :hasta
            UNION ALL
            SELECT r.fecha, COALESCE(m.sedeid, c.sedeid), p.tipo_referencia,
                   CAST(0 AS numeric), r.monto, 0, 1
              FROM reembolso_pago r JOIN pago p ON p.id = r.pago_id
            """ + ATRIBUCION + """
             WHERE r.fecha >= :desde AND r.fecha < :hasta
            """;

    private static final String FILTRO_SEDE = " (CAST(:sedeId AS integer) IS NULL OR x.sede_id = :sedeId) ";

    private final NamedParameterJdbcTemplate jdbc;

    public ReporteConsultaRepository(JdbcTemplate jdbcTemplate) {
        this.jdbc = new NamedParameterJdbcTemplate(jdbcTemplate);
    }

    public record SedeBase(Integer id, String nombre, int capacidadMaxima) {
    }

    public record AccesosGlobal(long total, long unicos, long offline, long sinSalida, BigDecimal permanenciaMedia) {
    }

    public record AccesosSede(Integer sedeId, long total, long unicos, BigDecimal permanenciaMedia) {
    }

    public record AccesosDia(LocalDate fecha, long total, long unicos) {
    }

    public record Importes(BigDecimal cobros, BigDecimal devoluciones, long nCobros, long nDevoluciones) {
        public BigDecimal neto() {
            return cobros.subtract(devoluciones);
        }
    }

    public record ImportesSede(Integer sedeId, Importes importes) {
    }

    public record ImportesConcepto(String concepto, Importes importes) {
    }

    public record ImportesDia(LocalDate fecha, Importes importes) {
    }

    public boolean existeSede(Integer sedeId) {
        return Boolean.TRUE.equals(jdbc.queryForObject("SELECT EXISTS (SELECT 1 FROM sede WHERE id = :id)",
                Map.of("id", sedeId), Boolean.class));
    }

    public List<SedeBase> sedes(Integer sedeId) {
        return jdbc.query("SELECT id, nombre, capacidad_maxima FROM sede "
                + "WHERE (CAST(:sedeId AS integer) IS NULL OR id = :sedeId) ORDER BY nombre, id",
                params(null, null, sedeId),
                (rs, i) -> new SedeBase(rs.getInt("id"), rs.getString("nombre"), rs.getInt("capacidad_maxima")));
    }

    // ---------------------------------------------------------------- accesos

    private static final String ACCESOS_PERIODO = " FROM registro_acceso a WHERE a.fecha_hora_ingreso >= :desde "
            + "AND a.fecha_hora_ingreso < :hasta AND (CAST(:sedeId AS integer) IS NULL OR a.sedeid = :sedeId) ";
    private static final String PERMANENCIA = "avg(extract(epoch FROM (a.fecha_hora_salida - a.fecha_hora_ingreso)) / 60) "
            + "FILTER (WHERE a.fecha_hora_salida IS NOT NULL)";

    public AccesosGlobal accesosGlobal(LocalDateTime desde, LocalDateTime hasta, Integer sedeId) {
        return jdbc.queryForObject("SELECT count(*) AS total, count(DISTINCT a.usuarioid) AS unicos, "
                + "count(*) FILTER (WHERE a.offline_visita IS NOT NULL) AS offline, "
                + "count(*) FILTER (WHERE a.fecha_hora_salida IS NULL) AS sin_salida, " + PERMANENCIA + " AS permanencia"
                + ACCESOS_PERIODO, params(desde, hasta, sedeId),
                (rs, i) -> new AccesosGlobal(rs.getLong("total"), rs.getLong("unicos"), rs.getLong("offline"),
                        rs.getLong("sin_salida"), redondear(rs.getBigDecimal("permanencia"))));
    }

    public List<AccesosSede> accesosPorSede(LocalDateTime desde, LocalDateTime hasta, Integer sedeId) {
        return jdbc.query("SELECT a.sedeid, count(*) AS total, count(DISTINCT a.usuarioid) AS unicos, " + PERMANENCIA
                + " AS permanencia" + ACCESOS_PERIODO + "GROUP BY a.sedeid", params(desde, hasta, sedeId),
                (rs, i) -> new AccesosSede(rs.getInt("sedeid"), rs.getLong("total"), rs.getLong("unicos"),
                        redondear(rs.getBigDecimal("permanencia"))));
    }

    /**
     * Máximo de personas dentro a la vez por sede, entre los ingresos del período. Se arma una línea de eventos
     * (+1 al ingresar, -1 al salir; sin salida se considera dentro hasta el fin del período) y se acumula. A igual
     * instante la salida se ordena antes que el ingreso.
     */
    public Map<Integer, Integer> picoPorSede(LocalDateTime desde, LocalDateTime hasta, Integer sedeId) {
        List<Map.Entry<Integer, Integer>> filas = jdbc.query("""
                WITH eventos AS (
                    SELECT a.sedeid, a.fecha_hora_ingreso AS instante, 1 AS delta""" + ACCESOS_PERIODO + """
                    UNION ALL
                    SELECT a.sedeid, COALESCE(a.fecha_hora_salida, :hasta), -1""" + ACCESOS_PERIODO + """
                ), acumulado AS (
                    SELECT sedeid, sum(delta) OVER (PARTITION BY sedeid ORDER BY instante, delta
                                                    ROWS UNBOUNDED PRECEDING) AS dentro
                      FROM eventos
                )
                SELECT sedeid, max(dentro) AS pico FROM acumulado GROUP BY sedeid
                """, params(desde, hasta, sedeId),
                (rs, i) -> Map.entry(rs.getInt("sedeid"), rs.getInt("pico")));
        return filas.stream().collect(Collectors.toMap(Map.Entry::getKey, Map.Entry::getValue));
    }

    public List<AccesosDia> accesosPorDia(LocalDateTime desde, LocalDateTime hasta, Integer sedeId) {
        return jdbc.query("SELECT CAST(a.fecha_hora_ingreso AS date) AS dia, count(*) AS total, "
                + "count(DISTINCT a.usuarioid) AS unicos" + ACCESOS_PERIODO + "GROUP BY dia ORDER BY dia",
                params(desde, hasta, sedeId),
                (rs, i) -> new AccesosDia(rs.getDate("dia").toLocalDate(), rs.getLong("total"), rs.getLong("unicos")));
    }

    // ------------------------------------------------------------- financiero

    private static final String SUMAS = "coalesce(sum(x.cobro), 0) AS cobros, coalesce(sum(x.devolucion), 0) AS devoluciones, "
            + "coalesce(sum(x.n_cobro), 0) AS n_cobros, coalesce(sum(x.n_devolucion), 0) AS n_devoluciones";

    private static Importes importes(java.sql.ResultSet rs) throws java.sql.SQLException {
        return new Importes(rs.getBigDecimal("cobros").setScale(2), rs.getBigDecimal("devoluciones").setScale(2),
                rs.getLong("n_cobros"), rs.getLong("n_devoluciones"));
    }

    public List<ImportesSede> importesPorSede(LocalDateTime desde, LocalDateTime hasta, Integer sedeId) {
        return jdbc.query("SELECT x.sede_id, " + SUMAS + " FROM (" + MOVIMIENTOS + ") x WHERE" + FILTRO_SEDE
                + "GROUP BY x.sede_id", params(desde, hasta, sedeId), (rs, i) -> {
                    int sede = rs.getInt("sede_id");
                    return new ImportesSede(rs.wasNull() ? null : sede, importes(rs));
                });
    }

    public List<ImportesConcepto> importesPorConcepto(LocalDateTime desde, LocalDateTime hasta, Integer sedeId) {
        return jdbc.query("SELECT x.concepto, " + SUMAS + " FROM (" + MOVIMIENTOS + ") x WHERE" + FILTRO_SEDE
                + "GROUP BY x.concepto ORDER BY x.concepto", params(desde, hasta, sedeId),
                (rs, i) -> new ImportesConcepto(rs.getString("concepto"), importes(rs)));
    }

    public List<ImportesDia> importesPorDia(LocalDateTime desde, LocalDateTime hasta, Integer sedeId) {
        return jdbc.query("SELECT CAST(x.fecha AS date) AS dia, " + SUMAS + " FROM (" + MOVIMIENTOS + ") x WHERE"
                + FILTRO_SEDE + "GROUP BY dia ORDER BY dia", params(desde, hasta, sedeId),
                (rs, i) -> new ImportesDia(rs.getDate("dia").toLocalDate(), importes(rs)));
    }

    /** Pagos rechazados del período: informativo, no suman a ningún importe. */
    public long operacionesRechazadas(LocalDateTime desde, LocalDateTime hasta, Integer sedeId) {
        return jdbc.queryForObject("SELECT count(*) FROM (SELECT COALESCE(m.sedeid, c.sedeid) AS sede_id FROM pago p "
                + ATRIBUCION + "WHERE p.estado = 'RECHAZADO' AND p.fecha_pago >= :desde AND p.fecha_pago < :hasta) x WHERE"
                + FILTRO_SEDE, params(desde, hasta, sedeId), Long.class);
    }

    private static MapSqlParameterSource params(LocalDateTime desde, LocalDateTime hasta, Integer sedeId) {
        return new MapSqlParameterSource().addValue("desde", desde).addValue("hasta", hasta).addValue("sedeId", sedeId,
                java.sql.Types.INTEGER);
    }

    private static BigDecimal redondear(BigDecimal valor) {
        return valor == null ? null : valor.setScale(1, java.math.RoundingMode.HALF_UP);
    }
}
