package com.fitzonesports.acceso.offline;

import tools.jackson.databind.ObjectMapper;
import io.jsonwebtoken.Claims;
import jakarta.validation.constraints.*;
import java.time.*;
import java.util.*;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import static com.fitzonesports.acceso.offline.TerminalOfflineService.error;

/** Inbox duradera. El batch y sus accesos se confirman en una única transacción. */
@Service @RequiredArgsConstructor
public class SincronizacionOfflineService {
    private final JdbcTemplate jdbc;
    private final TerminalOfflineService terminales;
    private final FirmaOffline firma;
    private final Clock clock;
    private final ObjectMapper json=tools.jackson.databind.json.JsonMapper.builder().build();
    public record Evento(@NotNull UUID id,@NotBlank @Size(max=64) String visitaId,@NotNull @Positive Integer usuarioId,
            @NotNull @Pattern(regexp="INGRESO|SALIDA") String tipo,@NotNull @Positive Long instante,
            @Size(max=4096) String qrToken,@NotNull UUID revision,@Positive long secuencia) {}
    public record Resultado(UUID id,String estado,String detalle,Integer accesoId,boolean repetido) {}

    @Transactional
    public List<Resultado> sincronizar(String email,UUID terminal,List<Evento> eventos) {
        var operador=terminales.autorizar(email,terminal);
        jdbc.queryForObject("SELECT id FROM acceso_terminal WHERE id=? FOR UPDATE",UUID.class,terminal);
        var respuestas=new LinkedHashMap<UUID,Resultado>();
        for(var e:eventos) {
            var previo=jdbc.queryForList("SELECT terminal_id,payload,estado,detalle,acceso_id FROM acceso_evento_offline WHERE id=?",e.id());
            if(!previo.isEmpty()) {
                var fila=previo.getFirst();
                if(!terminal.equals(fila.get("terminal_id")))throw error(403,"El evento pertenece a otro terminal");
                if(!serializar(e).equals(fila.get("payload"))) {
                    jdbc.update("INSERT INTO acceso_intento_incompatible(evento_id,huella,payload) VALUES (?,md5(?),?) ON CONFLICT DO NOTHING",e.id(),serializar(e),serializar(e));
                    respuestas.put(e.id(),new Resultado(e.id(),"CONFLICTO","ID reutilizado con contenido diferente; original conservado",null,true));
                } else if(!List.of("RECIBIDO","EN_ESPERA").contains(fila.get("estado"))) respuestas.put(e.id(),resultado(e.id(),true));
                continue;
            }
            if(e.instante()>clock.instant().plusSeconds(30).toEpochMilli())throw error(400,"Captura futura fuera de tolerancia");
            jdbc.update("INSERT INTO acceso_evento_offline(id,terminal_id,visita_id,usuario_id,tipo,captura,payload,estado) VALUES (?,?,?,?,?,?,?,'RECIBIDO')",
                    e.id(),terminal,e.visitaId(),e.usuarioId(),e.tipo(),java.sql.Timestamp.from(Instant.ofEpochMilli(e.instante())),serializar(e));
        }
        var pendientes=jdbc.query("SELECT payload FROM acceso_evento_offline WHERE terminal_id=? AND estado IN ('RECIBIDO','EN_ESPERA') ORDER BY captura,id",
                (r,n)->leer(r.getString(1)),terminal);
        // También el escritor online toma este bloqueo. El orden evita deadlocks entre terminales.
        pendientes.stream().map(Evento::usuarioId).distinct().sorted().forEach(id->jdbc.queryForList("SELECT id FROM usuario WHERE id=? FOR UPDATE",id));
        var validos=new ArrayList<Evento>();
        for(var e:pendientes) {
            try { validar(e,terminal,operador.id(),operador.sedeId());validos.add(e); }
            catch(ResponseStatusException ex) { if(ex.getStatusCode().is5xxServerError())throw ex;marcar(e,"RECHAZADO","Evidencia, datos o autorización de captura inválidos",null); }
            catch(IllegalArgumentException ex) { marcar(e,"RECHAZADO","Formato de captura inválido",null); }
        }
        var visitas=new LinkedHashMap<String,List<Evento>>();
        for(var e:validos)visitas.computeIfAbsent(e.visitaId(),k->new ArrayList<>()).add(e);
        for(var grupo:visitas.values())conciliar(terminal,operador.sedeId(),grupo);
        for(var e:pendientes)respuestas.putIfAbsent(e.id(),resultado(e.id(),false));
        for(var e:eventos)respuestas.putIfAbsent(e.id(),resultado(e.id(),true));
        return new ArrayList<>(respuestas.values());
    }

    @SuppressWarnings("unchecked")
    private void validar(Evento e,UUID terminal,Integer operador,Integer sede) {
        if(e.instante()>clock.instant().plusSeconds(30).toEpochMilli())throw error(400,"Captura futura");
        var copias=jdbc.queryForList("SELECT evidencia FROM acceso_copia_offline WHERE id=? AND terminal_id=?",String.class,e.revision(),terminal);
        if(copias.isEmpty())throw error(400,"Copia desconocida");
        var copia=firma.verificar(copias.getFirst(),"m2-copia",Instant.ofEpochMilli(e.instante()));
        if(!terminal.toString().equals(copia.get("terminalId")) || !operador.equals(copia.get("operadorId")) || !sede.equals(copia.get("sedeId")))throw error(403,"Permiso ajeno");
        if(e.visitaId().startsWith("central:")) {
            if(!"SALIDA".equals(e.tipo()))throw error(400,"ID central sólo para egreso");
            Integer.parseInt(e.visitaId().substring(8));
        } else UUID.fromString(e.visitaId());
        if(e.qrToken()==null) {
            if(!"SALIDA".equals(e.tipo()))throw error(400,"Falta QR");
            // Por ID: la visita debe estar en la copia o haber sido creada por este terminal.
            boolean conocida=((List<Map<String,Object>>)copia.get("presencias")).stream().anyMatch(p->e.visitaId().equals(p.get("visitaId")) && e.usuarioId().equals(p.get("usuarioId")) && sede.equals(p.get("sedeId")));
            boolean local=Boolean.TRUE.equals(jdbc.queryForObject("SELECT EXISTS(SELECT 1 FROM acceso_evento_offline WHERE terminal_id=? AND visita_id=? AND usuario_id=? AND tipo='INGRESO' AND estado<>'RECHAZADO')",Boolean.class,terminal,e.visitaId(),e.usuarioId()));
            boolean diferida=!e.visitaId().startsWith("central:") && ((List<Map<String,Object>>)copia.get("miembros")).stream().anyMatch(m->e.usuarioId().equals(m.get("id")));
            if(!conocida && !local && !diferida)throw error(403,"Visita no autorizada");
            return;
        }
        Claims qr=firma.verificar(e.qrToken(),"m2-qr",Instant.ofEpochMilli(e.instante()));
        if(!e.usuarioId().equals(qr.get("uid")) || !sede.equals(qr.get("sid")))throw error(403,"QR ajeno");
        var miembros=(List<Map<String,Object>>)copia.get("miembros");
        var miembro=miembros.stream().filter(m->e.usuarioId().equals(m.get("id")) && ((List<?>)m.get("lotes")).contains(qr.get("bid"))).findFirst().orElseThrow(()->error(403,"No incluido en la copia"));
        if("INGRESO".equals(e.tipo())) {
            boolean vigente=((List<Map<String,Object>>)miembro.get("periodos")).stream().anyMatch(p->((Number)p.get("inicio")).longValue()<=e.instante() && e.instante()<((Number)p.get("fin")).longValue());
            if(!Boolean.TRUE.equals(miembro.get("habilitado")) || Boolean.TRUE.equals(miembro.get("suspendido")) || !vigente)throw error(403,"Sin vigencia en captura");
            jdbc.update("UPDATE acceso_evento_offline SET qr_jti=? WHERE id=?",qr.getId(),e.id());
        }
    }

    private void conciliar(UUID terminal,Integer sede,List<Evento> eventos) {
        var entrada=eventos.stream().filter(e->"INGRESO".equals(e.tipo())).findFirst().orElse(null);
        var salidas=eventos.stream().filter(e->"SALIDA".equals(e.tipo())).toList();
        var salida=salidas.isEmpty()?null:salidas.getFirst();
        String visita=eventos.getFirst().visitaId();
        var existentes=visita.startsWith("central:")
                ?jdbc.queryForList("SELECT * FROM registro_acceso WHERE id=?",Integer.parseInt(visita.substring(8)))
                :jdbc.queryForList("SELECT * FROM registro_acceso WHERE offline_visita=? AND offline_terminal=?",UUID.fromString(visita),terminal);
        if(existentes.isEmpty() && entrada==null) {
            boolean rechazado=Boolean.TRUE.equals(jdbc.queryForObject("SELECT EXISTS(SELECT 1 FROM acceso_evento_offline WHERE terminal_id=? AND visita_id=? AND tipo='INGRESO' AND estado IN ('CONFLICTO','RECHAZADO'))",Boolean.class,terminal,visita));
            for(var e:eventos)marcar(e,rechazado?"CONFLICTO":"EN_ESPERA",rechazado?"Egreso conservado; el ingreso no fue incorporado al registro central":"Falta recibir el ingreso de esta visita",null);
            return;
        }
        if(existentes.isEmpty()) {
            if(salida!=null && (!salida.usuarioId().equals(entrada.usuarioId()) || salida.instante()<entrada.instante())) {
                marcar(salida,"RECHAZADO","Egreso incompatible con el ingreso",null);salida=null;
            }
            LocalDateTime inicio=local(entrada.instante()),fin=salida==null?null:local(salida.instante());
            LocalDateTime cierre=inicio.toLocalDate().atTime(23,59);
            if(cierre.isBefore(inicio))cierre=cierre.plusDays(1);
            if(!LocalDateTime.now(clock).isBefore(cierre) && (fin==null || fin.isAfter(cierre)))fin=cierre;
            boolean solapa=Boolean.TRUE.equals(jdbc.queryForObject("SELECT EXISTS(SELECT 1 FROM registro_acceso WHERE usuarioid=? AND (?::timestamp IS NULL OR fecha_hora_ingreso<?) AND (fecha_hora_salida IS NULL OR fecha_hora_salida>?))",Boolean.class,entrada.usuarioId(),fin,fin,inicio));
            String jti=jdbc.queryForObject("SELECT qr_jti FROM acceso_evento_offline WHERE id=?",String.class,entrada.id());
            boolean usado=Boolean.TRUE.equals(jdbc.queryForObject("SELECT EXISTS(SELECT 1 FROM acceso_evento_offline WHERE qr_jti=? AND estado='CONFIRMADO' AND tipo='INGRESO' AND id<>?)",Boolean.class,jti,entrada.id()));
            if(solapa && fin==null && Boolean.TRUE.equals(jdbc.queryForObject("SELECT EXISTS(SELECT 1 FROM registro_acceso WHERE usuarioid=? AND fecha_hora_ingreso>?)",Boolean.class,entrada.usuarioId(),inicio))) {
                for(var e:eventos)marcar(e,"EN_ESPERA","Falta egreso para delimitar el intervalo histórico",null);return;
            }
            if(solapa || usado) { for(var e:eventos)marcar(e,"CONFLICTO",solapa?"Presencia o intervalo incompatible entre sedes; evidencia conservada":"QR ya utilizado",null);return; }
            Integer id=jdbc.queryForObject("INSERT INTO registro_acceso(fecha_hora_ingreso,fecha_hora_salida,usuarioid,sedeid,offline_visita,offline_terminal) VALUES (?,?,?,?,?,?) RETURNING id",Integer.class,inicio,fin,entrada.usuarioId(),sede,UUID.fromString(visita),terminal);
            marcar(entrada,"CONFIRMADO","Admisión reconciliada con copia de captura",id);
            for(var e:eventos)if("INGRESO".equals(e.tipo()) && !e.id().equals(entrada.id()))marcar(e,"CONFLICTO","Otro evento de ingreso para la misma visita",id);
            if(salida!=null)marcar(salida,"CONFIRMADO",fin.equals(local(salida.instante()))?"Egreso reconciliado":"Egreso conservado; se aplicó el cierre diario",id);
            for(var e:salidas)if(salida==null || !e.id().equals(salida.id()))marcar(e,"CONFLICTO","Egreso repetido o incompatible",id);
            return;
        }
        var acceso=existentes.getFirst();Integer id=(Integer)acceso.get("id");
        if(!sede.equals(acceso.get("sedeid"))) { for(var e:eventos)marcar(e,"CONFLICTO","Visita de otra sede",null);return; }
        if(entrada!=null)marcar(entrada,"CONFLICTO","La visita ya tiene un ingreso registrado",id);
        for(var e:salidas) {
            if(!e.usuarioId().equals(acceso.get("usuarioid")) || acceso.get("fecha_hora_salida")!=null || local(e.instante()).isBefore(((java.sql.Timestamp)acceso.get("fecha_hora_ingreso")).toLocalDateTime()))
                marcar(e,"CONFLICTO","Egreso incompatible o visita ya cerrada",id);
            else { jdbc.update("UPDATE registro_acceso SET fecha_hora_salida=? WHERE id=?",local(e.instante()),id);acceso.put("fecha_hora_salida",java.sql.Timestamp.valueOf(local(e.instante())));marcar(e,"CONFIRMADO","Egreso reconciliado",id); }
        }
    }
    private LocalDateTime local(long ms) { return LocalDateTime.ofInstant(Instant.ofEpochMilli(ms),clock.getZone()); }
    private String serializar(Evento e) { try{return json.writeValueAsString(e);}catch(Exception ex){throw new IllegalStateException(ex);} }
    private Evento leer(String texto) { try{return json.readValue(texto,Evento.class);}catch(Exception ex){throw new IllegalStateException(ex);} }
    private void marcar(Evento e,String estado,String detalle,Integer acceso) { jdbc.update("UPDATE acceso_evento_offline SET estado=?,detalle=?,acceso_id=? WHERE id=?",estado,detalle,acceso,e.id()); }
    private Resultado resultado(UUID id,boolean repetido) {
        return jdbc.queryForObject("SELECT estado,detalle,acceso_id FROM acceso_evento_offline WHERE id=?",(r,n)->new Resultado(id,r.getString(1),r.getString(2),(Integer)r.getObject(3),repetido),id);
    }
}
