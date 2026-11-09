package com.fitzonesports.acceso.offline;

import java.time.*;
import java.util.*;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.http.HttpStatus;
import com.fitzonesports.usuario.service.UsuarioService;
import com.fitzonesports.membresia.service.MembresiaService;

@Service @RequiredArgsConstructor
public class CredencialOfflineService {
    private final FirmaOffline firma;
    private final UsuarioService usuarios;
    private final MembresiaService membresias;
    private final JdbcTemplate jdbc;
    private final Clock clock;
    public record Lote(UUID id,Integer usuarioId,Integer sedeId,long servidorAhora,long hasta,Map<String,String> jwk,List<String> tokens) {}
    @Transactional
    public Lote preparar(String email,Integer sedeId) {
        var usuario=usuarios.consultarPerfil(email);
        if(!usuario.activo() || !membresias.tieneMembresiaVigente(usuario.id()))throw new ResponseStatusException(HttpStatus.FORBIDDEN,"Se requiere cuenta y membresía vigentes");
        if(sedeId==null || !Boolean.TRUE.equals(jdbc.queryForObject("SELECT EXISTS(SELECT 1 FROM sede WHERE id=?)",Boolean.class,sedeId)))
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"Elegí una sede existente para preparar el acceso offline");
        Instant ahora=clock.instant();
        // Un lote por minuto/socio/sede evita acumular credenciales por doble clic.
        Instant desde=Instant.ofEpochSecond(ahora.getEpochSecond()/60*60),hasta=desde.plusSeconds(7200);
        UUID id=jdbc.queryForObject("INSERT INTO acceso_credencial_offline VALUES (?,?,?,?,?) ON CONFLICT(usuario_id,sede_id,desde) DO UPDATE SET hasta=EXCLUDED.hasta RETURNING id",UUID.class,UUID.randomUUID(),usuario.id(),sedeId,java.sql.Timestamp.from(desde),java.sql.Timestamp.from(hasta));
        var tokens=new ArrayList<String>();
        for(Instant minuto=desde;minuto.isBefore(hasta);minuto=minuto.plusSeconds(60)) {
            tokens.add(firma.firmar("m2-qr",Map.of("uid",usuario.id(),"sid",sedeId,"bid",id.toString(),"jti",id+":"+minuto.getEpochSecond()),minuto,minuto.plusSeconds(60)));
        }
        return new Lote(id,usuario.id(),sedeId,ahora.toEpochMilli(),hasta.toEpochMilli(),firma.jwk(),tokens);
    }
}
