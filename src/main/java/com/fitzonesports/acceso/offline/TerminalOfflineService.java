package com.fitzonesports.acceso.offline;

import com.fitzonesports.usuario.dto.UsuarioResponse;
import com.fitzonesports.usuario.service.UsuarioService;
import java.time.*;
import java.util.*;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service @RequiredArgsConstructor
public class TerminalOfflineService {
    private final JdbcTemplate jdbc;
    private final UsuarioService usuarios;
    private final FirmaOffline firma;
    private final Clock clock;
    public record Copia(String evidencia,Map<String,String> jwk,long servidorAhora,String sedeNombre) {}
    public UsuarioResponse operador(String email) {
        var u=usuarios.consultarPerfil(email);
        if(!u.activo() || !"RECEPCIONISTA".equals(u.rol()) || u.sedeId()==null)throw error(403,"Sólo Recepción habilitada de la sede puede operar el terminal");
        return u;
    }
    public UsuarioResponse autorizar(String email,UUID terminal) {
        var u=operador(email);
        if(!Boolean.TRUE.equals(jdbc.queryForObject("SELECT EXISTS(SELECT 1 FROM acceso_terminal WHERE id=? AND sede_id=? AND operador_id=? AND habilitado)",Boolean.class,terminal,u.sedeId(),u.id())))
            throw error(403,"Terminal no autorizado para esta cuenta y sede");
        return u;
    }
    @Transactional
    public Copia preparar(String email,UUID terminal) {
        var u=operador(email);
        jdbc.update("INSERT INTO acceso_terminal(id,sede_id,operador_id) VALUES (?,?,?) ON CONFLICT(sede_id) DO NOTHING",terminal,u.sedeId(),u.id());
        autorizar(email,terminal);
        Instant ahora=clock.instant(),hasta=ahora.plusSeconds(7200);
        UUID revision=UUID.randomUUID();
        var miembros=new ArrayList<Map<String,Object>>();
        // La sede sólo recibe usuarios que prepararon una credencial para ella durante esta ventana.
        var ids=jdbc.queryForList("SELECT DISTINCT usuario_id FROM acceso_credencial_offline WHERE sede_id=? AND hasta>? ORDER BY usuario_id LIMIT 1001",Integer.class,u.sedeId(),java.sql.Timestamp.from(ahora));
        if(ids.size()>1000)throw error(409,"La copia supera el límite de 1000 autorizaciones; requiere planificación de capacidad");
        for(Integer id:ids) {
            var titular=usuarios.consultarParaAcceso(id);
            var datos=new LinkedHashMap<String,Object>();
            datos.put("id",id);datos.put("nombre",titular.nombre());datos.put("habilitado",titular.activo());
            datos.put("suspendido",Boolean.TRUE.equals(jdbc.queryForObject("SELECT EXISTS(SELECT 1 FROM membresia WHERE usuarioid=? AND suspendida)",Boolean.class,id)));
            datos.put("periodos",jdbc.query("SELECT p.inicio,p.fin FROM periodo_membresia p JOIN membresia m ON m.id=p.membresia_id WHERE m.usuarioid=? AND NOT p.cancelado AND p.fin>? ORDER BY p.inicio",(r,n)->Map.of("inicio",fecha(r.getTimestamp(1)),"fin",fecha(r.getTimestamp(2))),id,LocalDateTime.now(clock)));
            datos.put("lotes",jdbc.queryForList("SELECT id::text FROM acceso_credencial_offline WHERE usuario_id=? AND sede_id=? AND hasta>?",String.class,id,u.sedeId(),java.sql.Timestamp.from(ahora)));
            miembros.add(datos);
        }
        var presencia=jdbc.query("SELECT a.id,a.usuarioid,a.sedeid,a.fecha_hora_ingreso FROM registro_acceso a WHERE a.fecha_hora_salida IS NULL AND (a.sedeid=? OR EXISTS(SELECT 1 FROM acceso_credencial_offline c WHERE c.usuario_id=a.usuarioid AND c.sede_id=? AND c.hasta>?))",
                (r,n)->Map.of("visitaId","central:"+r.getInt(1),"usuarioId",r.getInt(2),"sedeId",r.getInt(3),"ingreso",fecha(r.getTimestamp(4))),u.sedeId(),u.sedeId(),java.sql.Timestamp.from(ahora));
        var datos=new LinkedHashMap<String,Object>();
        datos.put("revision",revision.toString());datos.put("terminalId",terminal.toString());datos.put("operadorId",u.id());datos.put("sedeId",u.sedeId());
        datos.put("cuenta",u.email());
        datos.put("miembros",miembros);datos.put("presencias",presencia);
        datos.put("capacidad",jdbc.queryForObject("SELECT capacidad_maxima FROM sede WHERE id=?",Integer.class,u.sedeId()));
        String evidencia=firma.firmar("m2-copia",datos,ahora,hasta);
        jdbc.update("INSERT INTO acceso_copia_offline VALUES (?,?,?,?)",revision,terminal,evidencia,java.sql.Timestamp.from(hasta));
        return new Copia(evidencia,firma.jwk(),ahora.toEpochMilli(),u.sedeNombre());
    }
    private long fecha(java.sql.Timestamp t) { return t.toLocalDateTime().atZone(clock.getZone()).toInstant().toEpochMilli(); }
    public static ResponseStatusException error(int estado,String mensaje) { return new ResponseStatusException(HttpStatus.valueOf(estado),mensaje); }
}
