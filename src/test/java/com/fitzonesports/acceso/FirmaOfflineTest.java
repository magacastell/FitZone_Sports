package com.fitzonesports.acceso;

import com.fitzonesports.acceso.offline.FirmaOffline;
import java.time.*;
import java.util.Map;
import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;
class FirmaOfflineTest {
    @Test void firmaAsimetricaLimitaTipoTiempoYAutenticidad() {
        var ahora=Instant.parse("2026-11-09T15:00:00Z");var firma=new FirmaOffline(Clock.fixed(ahora,ZoneOffset.UTC),clavePruebas());
        var token=firma.firmar("m2-qr",Map.of("uid",7),ahora,ahora.plusSeconds(60));
        assertEquals(7,firma.verificar(token,"m2-qr",ahora).get("uid"));
        assertThrows(Exception.class,()->firma.verificar(token,"m2-snapshot",ahora));
        assertThrows(Exception.class,()->firma.verificar(token,"m2-qr",ahora.minusSeconds(1)));
        assertThrows(Exception.class,()->firma.verificar(token,"m2-qr",ahora.plusSeconds(60)));
        assertThrows(Exception.class,()->firma.verificar(token.substring(0,token.length()-8)+"AAAAAAAA","m2-qr",ahora));
        assertEquals("RSA",firma.jwk().get("kty"));assertFalse(firma.jwk().containsKey("d"));
        var desactivada=new FirmaOffline(Clock.fixed(ahora,ZoneOffset.UTC),"");
        assertEquals(503,assertThrows(org.springframework.web.server.ResponseStatusException.class,desactivada::jwk).getStatusCode().value());
    }
    static String clavePruebas(){try{var g=java.security.KeyPairGenerator.getInstance("RSA");g.initialize(2048);return java.util.Base64.getEncoder().encodeToString(g.generateKeyPair().getPrivate().getEncoded());}catch(Exception e){throw new IllegalStateException(e);}}
    @Test void autorizacionExigeAudienciaYKidAunqueLaFirmaSeaValida() throws Exception {
        var ahora=Instant.parse("2026-11-09T15:00:00Z");String configurada=clavePruebas();
        var firma=new FirmaOffline(Clock.fixed(ahora,ZoneOffset.UTC),configurada);
        var privada=java.security.KeyFactory.getInstance("RSA").generatePrivate(new java.security.spec.PKCS8EncodedKeySpec(java.util.Base64.getDecoder().decode(configurada)));
        for (var audiencia:java.util.List.of("otro",FirmaOffline.AUDIENCIA)) {
            String kid=audiencia.equals("otro")?firma.jwk().get("kid"):"desconocida";
            var token=io.jsonwebtoken.Jwts.builder().header().keyId(kid).and().issuer(FirmaOffline.EMISOR)
                    .audience().add(audiencia).and().claim("tipo","m2-autorizacion")
                    .issuedAt(java.util.Date.from(ahora)).notBefore(java.util.Date.from(ahora))
                    .expiration(java.util.Date.from(ahora.plusSeconds(60))).signWith(privada,io.jsonwebtoken.Jwts.SIG.RS256).compact();
            assertThrows(Exception.class,()->firma.verificar(token,"m2-autorizacion",ahora));
        }
    }
}
