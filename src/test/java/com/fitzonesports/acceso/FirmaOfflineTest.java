package com.fitzonesports.acceso;

import com.fitzonesports.acceso.offline.FirmaOffline;
import java.time.*;
import java.util.Map;
import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;
class FirmaOfflineTest {
    @Test void firmaAsimetricaLimitaTipoTiempoYAutenticidad() {
        var ahora=Instant.parse("2026-11-09T15:00:00Z");var firma=new FirmaOffline(Clock.fixed(ahora,ZoneOffset.UTC),"");
        var token=firma.firmar("m2-qr",Map.of("uid",7),ahora,ahora.plusSeconds(60));
        assertEquals(7,firma.verificar(token,"m2-qr",ahora).get("uid"));
        assertThrows(Exception.class,()->firma.verificar(token,"m2-snapshot",ahora));
        assertThrows(Exception.class,()->firma.verificar(token,"m2-qr",ahora.minusSeconds(1)));
        assertThrows(Exception.class,()->firma.verificar(token,"m2-qr",ahora.plusSeconds(60)));
        assertThrows(Exception.class,()->firma.verificar(token.substring(0,token.length()-8)+"AAAAAAAA","m2-qr",ahora));
        assertEquals("RSA",firma.jwk().get("kty"));assertFalse(firma.jwk().containsKey("d"));
    }
}
