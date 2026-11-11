package com.fitzonesports.reserva.service;

import com.fitzonesports.reserva.dto.CanchaDtos.*;
import com.fitzonesports.reserva.repository.CanchaRepository;
import com.fitzonesports.reserva.model.Cancha;
import com.fitzonesports.reserva.config.ReglasCancha;
import com.fitzonesports.reserva.pricing.*;
import com.fitzonesports.usuario.dto.UsuarioResponse;
import com.fitzonesports.usuario.service.UsuarioService;
import com.fitzonesports.membresia.service.MembresiaService;
import java.math.BigDecimal;
import java.sql.*;
import java.time.*;
import java.util.*;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service @RequiredArgsConstructor
public class CanchaService {
    private final JdbcTemplate jdbc;
    private final CanchaRepository canchas;
    private final UsuarioService usuarios;
    private final MembresiaService membresias;
    private final PrecioEstandarStrategy estandar;
    private final PrecioSocioStrategy socio;
    private final ReglasCancha reglas;
    private final Clock clock;
    private static final String SELECT_CANCHA="SELECT c.id,c.nombre,tc.nombre tipo,c.sedeid,c.activa,tc.precio_hora,s.recargo_pico "
            + "FROM cancha c JOIN tipo_cancha tc ON tc.id=c.tipo_canchaid JOIN sede s ON s.id=c.sedeid ";

    public UsuarioResponse actor(String email) {
        var u=usuarios.consultarPerfil(email);
        if(!u.activo()) throw error(403,"La cuenta esta inactiva");
        return u;
    }
    public void administrar(UsuarioResponse u,Integer sedeId) {
        if("GERENTE".equals(u.rol())) return;
        if(!"RECEPCIONISTA".equals(u.rol()) || !Objects.equals(sedeId,u.sedeId())) throw error(403,"Recepcion solo administra su sede");
    }
    public void consultarSede(UsuarioResponse u,Integer sedeId) {
        if("RECEPCIONISTA".equals(u.rol()) && !Objects.equals(sedeId,u.sedeId())) throw error(403,"Recepcion solo consulta su sede");
    }
    @Transactional(readOnly=true)
    public List<CanchaResponse> listar(String email,Integer sedeId) {
        var u=actor(email);
        if("RECEPCIONISTA".equals(u.rol())) {
            if(sedeId!=null) consultarSede(u,sedeId);
            sedeId=u.sedeId();
        }
        if(sedeId!=null && !existeSede(sedeId)) throw error(404,"La sede no existe");
        if(sedeId==null) throw error(400,"Indica sedeId para consultar canchas");
        return jdbc.query(SELECT_CANCHA+"WHERE c.sedeid=? ORDER BY c.nombre,c.id LIMIT 100",this::mapCancha,sedeId);
    }
    @Transactional(readOnly=true)
    public CanchaResponse consultar(String email,Integer id) {
        var c=datos(id); consultarSede(actor(email),c.sedeId()); return c;
    }
    @Transactional
    public CanchaResponse crear(String email,CrearCancha req) {
        var u=actor(email); Integer sede=req.sedeId()==null?u.sedeId():req.sedeId();
        if(sede==null) throw error(400,"Indica sedeId"); administrar(u,sede);
        if(!existeSede(sede)) throw error(404,"La sede no existe");
        var tipo=tipo(req.tipo());
        var c=new Cancha(); c.setNombre(req.nombre().strip()); c.setTipoId(tipo.id()); c.setSedeId(sede);
        c.setCostoBaseHora(tipo.precioHora()); c.setActiva((short)(Boolean.FALSE.equals(req.activa())?0:1));
        canchas.saveAndFlush(c); return datos(c.getId());
    }
    @Transactional
    public CanchaResponse actualizar(String email,Integer id,ActualizarCancha req) {
        var c=bloquear(id); administrar(actor(email),c.getSedeId());
        if(req.nombre()!=null)c.setNombre(req.nombre().strip());
        if(req.tipo()!=null) {var t=tipo(req.tipo());c.setTipoId(t.id());c.setCostoBaseHora(t.precioHora());}
        if(req.activa()!=null)c.setActiva((short)(req.activa()?1:0));
        canchas.flush(); return datos(id);
    }
    @Transactional(readOnly=true)
    public List<TipoResponse> tipos() {
        return jdbc.query("SELECT id,nombre,precio_hora FROM tipo_cancha ORDER BY nombre LIMIT 100",(r,n)->new TipoResponse(r.getInt(1),r.getString(2),r.getBigDecimal(3)));
    }
    @Transactional
    public TipoResponse guardarTipo(String email,Integer id,TipoRequest req) {
        if(!"GERENTE".equals(actor(email).rol()))throw error(403,"Solo gerente modifica tarifas globales");
        if(id==null) id=jdbc.queryForObject("INSERT INTO tipo_cancha(nombre,precio_hora) VALUES (?,?) RETURNING id",Integer.class,req.nombre().strip(),req.precioHora());
        else if(jdbc.update("UPDATE tipo_cancha SET nombre=?,precio_hora=? WHERE id=?",req.nombre().strip(),req.precioHora(),id)==0)throw error(404,"El tipo no existe");
        return new TipoResponse(id,req.nombre().strip(),req.precioHora());
    }
    @Transactional
    public TarifaRequest tarifaPico(String email,Integer sedeId,TarifaRequest req) {
        if(!"GERENTE".equals(actor(email).rol()))throw error(403,"Solo gerente configura recargos");
        if(jdbc.update("UPDATE sede SET recargo_pico=? WHERE id=?",req.recargoPico(),sedeId)==0)throw error(404,"La sede no existe");
        return req;
    }
    @Transactional
    public TurnoResponse crearTurno(String email,Integer id,CrearTurno req) {
        var c=bloquear(id); administrar(actor(email),c.getSedeId());
        var inicio=local(req.inicio()); var fin=local(req.fin());
        if(!inicio.isAfter(ahora()) || !inicio.toLocalDate().equals(fin.toLocalDate())
                || Duration.between(inicio,fin).toMinutes()!=reglas.duracionTurnoMinutos()
                || inicio.getSecond()!=0 || fin.getSecond()!=0 || inicio.getNano()!=0 || fin.getNano()!=0)
            throw error(400,"El turno debe ser futuro, del mismo dia, sin segundos y durar "+reglas.duracionTurnoMinutos()+" minutos");
        int turno=jdbc.queryForObject("INSERT INTO turno_cancha(fecha,hora_inicio,hora_fin,canchaid) VALUES (?,?,?,?) RETURNING id",
                Integer.class,inicio.toLocalDate(),inicio.toLocalTime(),fin.toLocalTime(),id);
        return turnos(email,id,inicio.toLocalDate(),inicio.toLocalDate()).stream().filter(t->t.id().equals(turno)).findFirst().orElseThrow();
    }
    @Transactional(readOnly=true)
    public List<TurnoResponse> turnos(String email,Integer id,LocalDate desde,LocalDate hasta) {
        consultar(email,id);
        if(desde==null || hasta==null || hasta.isBefore(desde) || Duration.between(desde.atStartOfDay(),hasta.atStartOfDay()).toDays()>30)
            throw error(400,"Indica desde y hasta con rango maximo de 31 dias");
        var datos=datos(id); var u=actor(email);
        if(datos.precioHora()==null)throw error(409,"El gerente debe configurar la tarifa del tipo de cancha");
        PricingStrategy strategy=membresias.tieneMembresiaVigente(u.id())?socio:estandar;
        return jdbc.query("SELECT t.id,t.fecha+t.hora_inicio inicio,t.fecha+t.hora_fin fin,"
                + "(?=true AND t.fecha+t.hora_inicio>? AND NOT EXISTS(SELECT 1 FROM bloqueo_mantenimiento b WHERE b.canchaid=t.canchaid AND b.activo "
                + "AND b.fecha_inicio<t.fecha+t.hora_fin AND (b.fecha_fin IS NULL OR b.fecha_fin>t.fecha+t.hora_inicio)) "
                + "AND NOT EXISTS(SELECT 1 FROM reserva_cancha r WHERE r.turno_canchaid=t.id AND (r.estado='CONFIRMADA' OR (r.estado='PENDIENTE_PAGO' AND r.vence_en>?)))) disponible "
                + "FROM turno_cancha t WHERE t.canchaid=? AND t.fecha BETWEEN ? AND ? ORDER BY t.fecha,t.hora_inicio LIMIT 1000",
                (r,n)->new TurnoResponse(r.getInt("id"),id,offset(r.getTimestamp("inicio").toLocalDateTime()),offset(r.getTimestamp("fin").toLocalDateTime()),
                        r.getBoolean("disponible"),strategy.calcular(datos.precioHora(),datos.recargoPico(),r.getTimestamp("inicio").toLocalDateTime(),r.getTimestamp("fin").toLocalDateTime())),
                datos.activa(),ahora(),ahora(),id,desde,hasta);
    }
    private TurnoResponse turno(String email,Integer id,Integer turno,LocalDateTime inicio,LocalDateTime fin) {
        var c=datos(id);return new TurnoResponse(turno,id,offset(inicio),offset(fin),true,
                precio(actor(email).id(),c,inicio,fin));
    }
    public PricingStrategy.Precio precio(Integer usuarioId,CanchaResponse c,LocalDateTime inicio,LocalDateTime fin) {
        if(c.precioHora()==null)throw error(409,"El gerente debe configurar la tarifa del tipo de cancha");
        return (membresias.tieneMembresiaVigente(usuarioId)?socio:estandar).calcular(c.precioHora(),c.recargoPico(),inicio,fin);
    }
    @Transactional
    public MantenimientoResponse mantenimiento(String email,Integer canchaId,MantenimientoRequest req) {
        var c=bloquear(canchaId); var u=actor(email); administrar(u,c.getSedeId()); expirar(canchaId);
        var inicio=local(req.inicio());var fin=req.fin()==null?null:local(req.fin());
        if(inicio.isBefore(ahora()) || (fin!=null && !fin.isAfter(inicio)))throw error(400,"Fechas de mantenimiento invalidas");
        int id=jdbc.queryForObject("INSERT INTO bloqueo_mantenimiento(canchaid,fecha_inicio,fecha_fin,motivo,creado_por) VALUES (?,?,?,?,?) RETURNING id",
                Integer.class,canchaId,inicio,fin,req.motivo().strip(),u.id());
        return new MantenimientoResponse(id,canchaId,offset(inicio),fin==null?null:offset(fin),req.motivo().strip(),true,u.id());
    }
    @Transactional(readOnly=true)
    public List<MantenimientoResponse> mantenimientos(String email,Integer canchaId) {
        var c=datos(canchaId);administrar(actor(email),c.sedeId());
        return jdbc.query("SELECT * FROM bloqueo_mantenimiento WHERE canchaid=? ORDER BY fecha_inicio DESC LIMIT 100",(r,n)->new MantenimientoResponse(r.getInt("id"),canchaId,
                offset(r.getTimestamp("fecha_inicio").toLocalDateTime()),r.getTimestamp("fecha_fin")==null?null:offset(r.getTimestamp("fecha_fin").toLocalDateTime()),
                r.getString("motivo"),r.getBoolean("activo"),(Integer)r.getObject("creado_por")),canchaId);
    }
    @Transactional
    public void eliminarMantenimiento(String email,Integer canchaId,Integer id) {
        var c=bloquear(canchaId);administrar(actor(email),c.getSedeId());
        if(jdbc.update("UPDATE bloqueo_mantenimiento SET activo=false WHERE id=? AND canchaid=?",id,canchaId)==0)throw error(404,"El mantenimiento no existe en esta cancha");
    }
    public Cancha bloquear(Integer id) {return canchas.bloquear(id).orElseThrow(()->error(404,"La cancha no existe"));}
    public void expirar(Integer id) {
        jdbc.update("UPDATE reserva_cancha SET estado='EXPIRADA' WHERE turno_canchaid IN (SELECT id FROM turno_cancha WHERE canchaid=?) AND estado='PENDIENTE_PAGO' AND vence_en<=?",id,ahora());
    }
    public CanchaResponse datos(Integer id) {
        return jdbc.query(SELECT_CANCHA+"WHERE c.id=?",this::mapCancha,id).stream().findFirst().orElseThrow(()->error(404,"La cancha no existe"));
    }
    private TipoResponse tipo(String nombre) {
        var encontrados=jdbc.query("SELECT id,nombre,precio_hora FROM tipo_cancha WHERE lower(btrim(nombre))=lower(?)",
                (r,n)->new TipoResponse(r.getInt(1),r.getString(2),r.getBigDecimal(3)),nombre.strip());
        if(encontrados.isEmpty())throw error(404,"El tipo de cancha no existe");
        if(encontrados.getFirst().precioHora()==null)throw error(409,"El tipo no tiene tarifa configurada");
        return encontrados.getFirst();
    }
    private CanchaResponse mapCancha(ResultSet r,int n)throws SQLException {
        return new CanchaResponse(r.getInt("id"),r.getString("nombre"),r.getString("tipo"),r.getInt("sedeid"),r.getShort("activa")==1,r.getBigDecimal("precio_hora"),r.getBigDecimal("recargo_pico"));
    }
    private boolean existeSede(Integer id){return Boolean.TRUE.equals(jdbc.queryForObject("SELECT EXISTS(SELECT 1 FROM sede WHERE id=?)",Boolean.class,id));}
    public LocalDateTime ahora(){return LocalDateTime.now(clock);}
    public LocalDateTime local(OffsetDateTime valor){return valor.atZoneSameInstant(clock.getZone()).toLocalDateTime();}
    public OffsetDateTime offset(LocalDateTime valor){return valor.atZone(clock.getZone()).toOffsetDateTime();}
    public static ResponseStatusException error(int status,String mensaje){return new ResponseStatusException(HttpStatus.valueOf(status),mensaje);}
}
