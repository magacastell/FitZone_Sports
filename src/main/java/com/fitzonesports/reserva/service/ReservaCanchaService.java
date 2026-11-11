package com.fitzonesports.reserva.service;

import com.fitzonesports.reserva.dto.CanchaDtos.*;
import com.fitzonesports.reserva.config.ReglasCancha;
import com.fitzonesports.pago.service.PagoCanchaService;
import com.fitzonesports.pago.service.ComprobanteService;
import com.fitzonesports.pago.dto.PagoDtos.PagoResponse;
import java.math.BigDecimal;
import java.time.*;
import java.sql.*;
import java.util.*;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import static com.fitzonesports.reserva.service.CanchaService.error;

/** Fachada M4: invariantes, precio, retencion y transiciones; M5 conserva el movimiento financiero. */
@Service @RequiredArgsConstructor
public class ReservaCanchaService {
    private final JdbcTemplate jdbc;
    private final CanchaService canchas;
    private final ReglasCancha reglas;
    private final PagoCanchaService pagos;
    private final ComprobanteService comprobantes;
    private static final String SELECT="SELECT r.*,t.canchaid,c.sedeid,p.id pago_id,p.estado estado_pago FROM reserva_cancha r "
            + "JOIN turno_cancha t ON t.id=r.turno_canchaid JOIN cancha c ON c.id=t.canchaid "
            + "LEFT JOIN pago p ON p.tipo_referencia='RESERVA_CANCHA' AND p.referencia_id=r.id ";

    @Transactional
    public ReservaResponse reservar(String email,Integer canchaId,Reservar req,UUID clave) {
        if(clave==null)throw error(400,"Idempotency-Key es obligatorio");
        var u=canchas.actor(email);
        if(!Set.of("USUARIO","GERENTE").contains(u.rol()))throw error(403,"No podes reservar turnos");
        canchas.bloquear(canchaId);canchas.expirar(canchaId);
        String operacion="cancha:"+u.id()+":"+clave;
        var repetidas=jdbc.query(SELECT+"WHERE r.clave_operacion=?",this::map,operacion);
        if(!repetidas.isEmpty()) {
            var r=repetidas.getFirst();
            if(!r.canchaId().equals(canchaId) || !r.turnoId().equals(req.turnoId()))throw error(409,"Idempotency-Key ya utilizada para otro turno");
            return r;
        }
        var turnos=jdbc.queryForList("SELECT fecha+hora_inicio inicio,fecha+hora_fin fin FROM turno_cancha WHERE id=? AND canchaid=?",req.turnoId(),canchaId);
        if(turnos.isEmpty())throw error(404,"El turno no existe en esta cancha");
        var c=canchas.datos(canchaId);if(!c.activa())throw error(409,"La cancha no admite nuevas reservas");
        var t=turnos.getFirst();var inicio=((Timestamp)t.get("inicio")).toLocalDateTime();var fin=((Timestamp)t.get("fin")).toLocalDateTime();
        if(!inicio.isAfter(canchas.ahora()))throw error(409,"El turno ya comenzo");
        var precio=canchas.precio(u.id(),c,inicio,fin);
        if(precio.total().signum()<=0)throw error(409,"La tarifa calculada debe ser positiva");
        String detalle="{\"base\":"+precio.base()+",\"recargo\":"+precio.recargo()+",\"descuento\":"+precio.descuento()+",\"estrategia\":\""+precio.estrategia()+"\"}";
        var vence=canchas.ahora().plusMinutes(reglas.retencionMinutos());if(vence.isAfter(inicio))vence=inicio;
        var sede=jdbc.queryForObject("SELECT nombre FROM sede WHERE id=?",String.class,c.sedeId());
        int id=jdbc.queryForObject("INSERT INTO reserva_cancha(precio_aplicado,estado,turno_canchaid,usuarioid,creada_en,vence_en,clave_operacion,detalle_precio,cancha_nombre,sede_nombre,tipo_nombre,inicio,fin) "
                + "VALUES (?,'PENDIENTE_PAGO',?,?,?,?,?,?::jsonb,?,?,?,?,?) RETURNING id",Integer.class,precio.total(),req.turnoId(),u.id(),canchas.ahora(),vence,operacion,detalle,c.nombre(),sede,c.tipo(),inicio,fin);
        return datos(id);
    }
    @Transactional
    public PagoResponse pagar(String email,Integer id) {
        var inicial=datos(id);canchas.bloquear(inicial.canchaId());
        var r=datos(id);var u=canchas.actor(email);
        if(!u.id().equals(r.usuarioId()) && !"GERENTE".equals(u.rol()))throw error(403,"La reserva pertenece a otro usuario");
        if(r.pagoId()!=null)return pagos.datos(r.pagoId());
        if(!"PENDIENTE_PAGO".equals(r.estado()) || !r.venceEn().toLocalDateTime().isAfter(canchas.ahora()))throw error(409,"La retencion no esta vigente");
        if(!canchas.datos(r.canchaId()).activa())throw error(409,"La cancha fue desactivada");
        var pago=pagos.cobrar(id);
        jdbc.update("UPDATE reserva_cancha SET estado=? WHERE id=?","APROBADO".equals(pago.estado())?"CONFIRMADA":"RECHAZADA",id);
        if("APROBADO".equals(pago.estado()))comprobantes.emitir(pago.id());
        return pago; // El rechazo se devuelve como recurso persistido, sin rollback ni PDF.
    }
    @Transactional
    public ReservaResponse cancelar(String email,Integer canchaId,Integer id,CancelarRequest req) {
        canchas.bloquear(canchaId);var r=datos(id);if(!r.canchaId().equals(canchaId))throw error(404,"La reserva no pertenece a esta cancha");
        var u=canchas.actor(email);boolean personal=Set.of("RECEPCIONISTA","GERENTE").contains(u.rol());
        if(personal)canchas.administrar(u,r.sedeId());else if(!u.id().equals(r.usuarioId()))throw error(403,"La reserva pertenece a otro usuario");
        if("CANCELADA".equals(r.estado()))return r;
        if(!Set.of("CONFIRMADA","PENDIENTE_PAGO").contains(r.estado()))throw error(409,"La reserva no admite cancelacion");
        if(!r.inicio().toLocalDateTime().isAfter(canchas.ahora()))throw error(409,"El turno ya comenzo");
        if(req!=null && req.porcentajeReembolso()!=null && !"GERENTE".equals(u.rol()))throw error(403,"Solo gerente puede elegir una devolucion administrativa");
        BigDecimal porcentaje=Duration.between(canchas.ahora(),r.inicio().toLocalDateTime()).compareTo(Duration.ofHours(2))>=0?new BigDecimal("100"):new BigDecimal("50");
        if(req!=null && req.porcentajeReembolso()!=null) {
            if(req.porcentajeReembolso().compareTo(new BigDecimal("50"))!=0 && req.porcentajeReembolso().compareTo(new BigDecimal("100"))!=0)throw error(400,"La devolucion administrativa permite 50 o 100 por ciento");
            porcentaje=req.porcentajeReembolso();
        }
        if(r.pagoId()!=null)pagos.reembolsar(r.pagoId(),porcentaje);
        jdbc.update("UPDATE reserva_cancha SET estado='CANCELADA',cancelada_en=?,cancelada_por=?,porcentaje_reembolso=? WHERE id=?",
                canchas.ahora(),u.id(),r.pagoId()==null?null:porcentaje,id);
        return datos(id);
    }
    @Transactional(readOnly=true)
    public ReservaResponse consultar(String email,Integer id) {
        var r=datos(id);var u=canchas.actor(email);
        if("RECEPCIONISTA".equals(u.rol()))canchas.administrar(u,r.sedeId());
        else if(!"GERENTE".equals(u.rol()) && !u.id().equals(r.usuarioId()))throw error(403,"La reserva pertenece a otro usuario");
        return r;
    }
    @Transactional(readOnly=true)
    public List<ReservaResponse> listar(String email,boolean propias,Integer sedeId,int page,int size) {
        if(page<0 || page>100000 || size<1 || size>100)throw error(400,"Paginacion invalida");
        var u=canchas.actor(email);var sql=new StringBuilder(SELECT+"WHERE 1=1 ");var args=new ArrayList<Object>();
        if(propias){sql.append("AND r.usuarioid=? ");args.add(u.id());}
        else {
            if(!Set.of("RECEPCIONISTA","GERENTE").contains(u.rol()))throw error(403,"No podes listar reservas de otros usuarios");
            if("RECEPCIONISTA".equals(u.rol())){if(sedeId!=null)canchas.consultarSede(u,sedeId);sedeId=u.sedeId();}
        }
        if(sedeId!=null){sql.append("AND c.sedeid=? ");args.add(sedeId);}
        sql.append("ORDER BY r.creada_en DESC,r.id DESC LIMIT ? OFFSET ?");args.add(size);args.add((long)page*size);
        return jdbc.query(sql.toString(),this::map,args.toArray());
    }
    @Transactional
    public void vencer() {
        var ids=jdbc.queryForList("SELECT DISTINCT t.canchaid FROM turno_cancha t JOIN reserva_cancha r ON r.turno_canchaid=t.id WHERE r.estado='PENDIENTE_PAGO' AND r.vence_en<=? ORDER BY t.canchaid",Integer.class,canchas.ahora());
        for(int id:ids){canchas.bloquear(id);canchas.expirar(id);}
        jdbc.update("UPDATE reserva_cancha SET estado='CUMPLIDA' WHERE estado='CONFIRMADA' AND fin<=?",canchas.ahora());
    }
    public ReservaResponse datos(Integer id) {
        return jdbc.query(SELECT+"WHERE r.id=?",this::map,id).stream().findFirst().orElseThrow(()->error(404,"La reserva no existe"));
    }
    private ReservaResponse map(ResultSet r,int n)throws SQLException {
        String estado=r.getString("estado");var ahora=canchas.ahora();
        if("PENDIENTE_PAGO".equals(estado) && !r.getTimestamp("vence_en").toLocalDateTime().isAfter(ahora))estado="EXPIRADA";
        return new ReservaResponse(r.getInt("id"),r.getInt("canchaid"),r.getInt("turno_canchaid"),r.getInt("usuarioid"),r.getInt("sedeid"),r.getString("cancha_nombre"),r.getString("sede_nombre"),r.getString("tipo_nombre"),
                canchas.offset(r.getTimestamp("inicio").toLocalDateTime()),canchas.offset(r.getTimestamp("fin").toLocalDateTime()),estado,r.getBigDecimal("precio_aplicado"),
                canchas.offset(r.getTimestamp("creada_en").toLocalDateTime()),r.getTimestamp("vence_en")==null?null:canchas.offset(r.getTimestamp("vence_en").toLocalDateTime()),
                (Integer)r.getObject("pago_id"),r.getString("estado_pago"));
    }
}
