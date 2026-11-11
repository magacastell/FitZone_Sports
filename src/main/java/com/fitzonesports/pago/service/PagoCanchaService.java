package com.fitzonesports.pago.service;

import com.fitzonesports.pago.dto.PagoDtos.PagoResponse;
import com.fitzonesports.pago.pasarela.*;
import com.fitzonesports.usuario.service.UsuarioService;
import java.math.BigDecimal;
import java.sql.*;
import java.time.*;
import java.util.*;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.*;
import static com.fitzonesports.reserva.service.CanchaService.error;

/** M5 no modifica reservas: devuelve resultados al orquestador de M4. Fake sin red. */
@Service @RequiredArgsConstructor
public class PagoCanchaService {
    private final JdbcTemplate jdbc;
    private final PasarelaPago pasarela;
    private final UsuarioService usuarios;
    private final Clock clock;
    private static final String SELECT="SELECT p.*,coalesce(r.monto,0) monto_reembolsado FROM pago p LEFT JOIN reembolso_pago r ON r.pago_id=p.id ";

    @Transactional(propagation=Propagation.MANDATORY)
    public PagoResponse cobrar(Integer reservaId) {
        var previos=jdbc.query(SELECT+"WHERE p.tipo_referencia='RESERVA_CANCHA' AND p.referencia_id=?",this::map,reservaId);
        if(!previos.isEmpty())return previos.getFirst();
        var reserva=jdbc.queryForMap("SELECT r.usuarioid,r.precio_aplicado,u.dni FROM reserva_cancha r JOIN usuario u ON u.id=r.usuarioid WHERE r.id=?",reservaId);
        var resultado=pasarela.cobrar(new SolicitudCobro("cancha:"+reservaId,(BigDecimal)reserva.get("precio_aplicado"),"ARS",(String)reserva.get("dni")));
        if(resultado.estado()==ResultadoCobro.Estado.PENDIENTE)throw error(409,"La pasarela fake debe devolver un resultado definitivo");
        int id=jdbc.queryForObject("INSERT INTO pago(monto,tipo_referencia,referencia_id,fecha_pago,usuarioid,estado,clave_idempotencia,referencia_externa,proveedor) "
                + "VALUES (?,'RESERVA_CANCHA',?,?,?,?,?,?,?) RETURNING id",Integer.class,reserva.get("precio_aplicado"),reservaId,LocalDateTime.now(clock),
                reserva.get("usuarioid"),resultado.estado().name(),"cancha:"+reservaId,resultado.referenciaExterna(),resultado.proveedor());
        return datos(id);
    }

    @Transactional(propagation=Propagation.MANDATORY)
    public void reembolsar(Integer pagoId,BigDecimal porcentaje) {
        var p=jdbc.queryForMap("SELECT * FROM pago WHERE id=? FOR UPDATE",pagoId);
        if(jdbc.queryForObject("SELECT count(*) FROM reembolso_pago WHERE pago_id=?",Integer.class,pagoId)>0)return;
        if(!"RESERVA_CANCHA".equals(p.get("tipo_referencia")) || !"APROBADO".equals(p.get("estado")))throw error(409,"El pago no admite devolucion");
        BigDecimal monto=((BigDecimal)p.get("monto")).multiply(porcentaje).divide(new BigDecimal("100"),2,java.math.RoundingMode.HALF_UP);
        if(monto.signum()==0)throw error(409,"El importe de devolucion es inferior a un centavo");
        var resultado=pasarela.reembolsar(new SolicitudReembolso("cancelacion-cancha:"+pagoId,(String)p.get("referencia_externa"),monto));
        if(resultado.estado()!=ResultadoCobro.Estado.APROBADO)throw error(409,"La devolucion no fue confirmada");
        jdbc.update("INSERT INTO reembolso_pago(pago_id,monto,fecha,referencia_externa,proveedor,porcentaje) VALUES (?,?,?,?,?,?)",
                pagoId,monto,LocalDateTime.now(clock),resultado.referenciaExterna(),resultado.proveedor(),porcentaje);
        jdbc.update("UPDATE pago SET estado=? WHERE id=?",porcentaje.compareTo(new BigDecimal("100"))==0?"REEMBOLSADO":"REEMBOLSADO_PARCIAL",pagoId);
    }
    @Transactional(readOnly=true)
    public PagoResponse consultar(String email,Integer id) {
        var u=usuarios.consultarPerfil(email);var p=datos(id);
        if(!u.activo() || (!"GERENTE".equals(u.rol()) && !Objects.equals(u.id(),p.usuarioId())))throw error(403,"El pago pertenece a otro usuario");
        return p;
    }
    @Transactional(readOnly=true)
    public List<PagoResponse> listar(String email,boolean propios,Integer sedeId,int page,int size) {
        if(page<0 || page>100000 || size<1 || size>100)throw error(400,"Paginacion invalida: page >=0, size entre 1 y 100");
        var u=usuarios.consultarPerfil(email);
        if(!u.activo() || (!propios && !"GERENTE".equals(u.rol())))throw error(403,"Solo gerente consulta pagos globales");
        var params=new ArrayList<Object>();var sql=new StringBuilder(SELECT+"WHERE 1=1 ");
        if(propios){sql.append("AND p.usuarioid=? ");params.add(u.id());}
        if(sedeId!=null){
            sql.append("AND ((p.tipo_referencia='RESERVA_CANCHA' AND EXISTS(SELECT 1 FROM reserva_cancha rc JOIN turno_cancha t ON t.id=rc.turno_canchaid JOIN cancha c ON c.id=t.canchaid WHERE rc.id=p.referencia_id AND c.sedeid=?)) "
                    + "OR (p.tipo_referencia='MEMBRESIA' AND EXISTS(SELECT 1 FROM membresia m WHERE m.id=p.referencia_id AND m.sedeid=?))) ");
            params.add(sedeId);params.add(sedeId);
        }
        sql.append("ORDER BY p.fecha_pago DESC,p.id DESC LIMIT ? OFFSET ?");params.add(size);params.add((long)page*size);
        return jdbc.query(sql.toString(),this::map,params.toArray());
    }
    public PagoResponse datos(Integer id) {
        return jdbc.query(SELECT+"WHERE p.id=?",this::map,id).stream().findFirst().orElseThrow(()->error(404,"El pago no existe"));
    }
    private PagoResponse map(ResultSet r,int n)throws SQLException {
        return new PagoResponse(r.getInt("id"),r.getInt("usuarioid"),r.getString("tipo_referencia"),r.getInt("referencia_id"),r.getBigDecimal("monto"),"ARS",r.getString("estado"),
                r.getTimestamp("fecha_pago").toLocalDateTime().atZone(clock.getZone()).toOffsetDateTime(),r.getString("referencia_externa"),r.getBigDecimal("monto_reembolsado"));
    }
}
