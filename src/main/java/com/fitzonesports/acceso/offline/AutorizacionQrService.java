package com.fitzonesports.acceso.offline;

import com.fitzonesports.membresia.service.MembresiaService;
import com.fitzonesports.usuario.service.UsuarioService;
import io.jsonwebtoken.Claims;
import java.time.*;
import java.util.*;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import static com.fitzonesports.acceso.offline.TerminalOfflineService.error;

@Service
@RequiredArgsConstructor
public class AutorizacionQrService {
    private final FirmaOffline firma;
    private final UsuarioService usuarios;
    private final MembresiaService membresias;
    private final JdbcTemplate jdbc;
    private final Clock clock;

    public record Lote(int version, Integer usuarioId, long servidorAhora, long hasta,
                       Map<String,String> jwk, List<String> tokens) {}

    @Transactional(readOnly=true)
    public Lote emitir(String email) {
        var usuario=usuarios.consultarPerfil(email);
        if (!usuario.activo() || !membresias.tieneMembresiaVigente(usuario.id()))
            throw error(403,"Se requiere cuenta y membresía vigentes");
        Instant ahora=clock.instant().truncatedTo(java.time.temporal.ChronoUnit.SECONDS);
        Instant horizonte=ahora.plusSeconds(7200);
        var periodos=jdbc.query("SELECT p.inicio,p.fin FROM periodo_membresia p JOIN membresia m ON m.id=p.membresia_id WHERE m.usuarioid=? AND NOT p.cancelado AND p.fin>? AND p.inicio<? ORDER BY p.inicio",
                (r,n)->new Instant[]{r.getTimestamp(1).toLocalDateTime().atZone(clock.getZone()).toInstant(),
                        r.getTimestamp(2).toLocalDateTime().atZone(clock.getZone()).toInstant()},
                usuario.id(),LocalDateTime.ofInstant(ahora,clock.getZone()),LocalDateTime.ofInstant(horizonte,clock.getZone()));
        var tokens=new ArrayList<String>();
        Instant minuto=Instant.ofEpochSecond(ahora.getEpochSecond()/60*60);
        for (;minuto.isBefore(horizonte);minuto=minuto.plusSeconds(60)) {
            Instant desde=minuto.isBefore(ahora)?ahora:minuto;
            Instant fin=minuto.plusSeconds(60).isAfter(horizonte)?horizonte:minuto.plusSeconds(60);
            for (var periodo:periodos) {
                Instant inicio=desde.isBefore(periodo[0])?periodo[0]:desde;
                Instant hasta=fin.isAfter(periodo[1])?periodo[1]:fin;
                if (!inicio.isBefore(hasta)) continue;
                // El jti estable impide recuperar otro uso del mismo minuto solicitando otro lote.
                tokens.add(firma.firmar("m2-autorizacion",Map.of("uid",usuario.id(),"permiso","INGRESO",
                        "ambito","FITZONE","jti","global:"+usuario.id()+":"+minuto.getEpochSecond()),inicio,hasta));
                break;
            }
        }
        return new Lote(2,usuario.id(),ahora.toEpochMilli(),horizonte.toEpochMilli(),firma.jwk(),tokens);
    }

    public Claims verificar(String token,Instant captura) {
        var qr=firma.verificar(token,"m2-autorizacion",captura);
        if (!(qr.get("uid") instanceof Integer id) || id<=0 || !"INGRESO".equals(qr.get("permiso"))
                || !"FITZONE".equals(qr.get("ambito")) || qr.getId()==null
                || qr.getNotBefore()==null || qr.getIssuedAt()==null
                || qr.getIssuedAt().after(qr.getNotBefore())
                || qr.getExpiration().getTime()-qr.getNotBefore().getTime()>60000
                || qr.getExpiration().getTime()-qr.getIssuedAt().getTime()>7200000)
            throw error(400,"Autorización de acceso inválida");
        return qr;
    }

    public boolean esAsimetrico(String token) {
        try {
            var cabecera=tools.jackson.databind.json.JsonMapper.builder().build().readTree(
                    Base64.getUrlDecoder().decode(token.split("\\.")[0]));
            return "RS256".equals(cabecera.path("alg").asString());
        } catch (Exception e) { return false; }
    }
}
