package com.fitzonesports.acceso.service;

import io.jsonwebtoken.ExpiredJwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.security.Keys;
import java.nio.charset.StandardCharsets;
import java.security.GeneralSecurityException;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Date;
import javax.crypto.Mac;
import javax.crypto.SecretKey;
import javax.crypto.spec.SecretKeySpec;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

/**
 * Emite y valida el token del QR de acceso: un JWT firmado y de vida corta (RF-04: cambia cada minuto).
 *
 * Se firma con una clave DERIVADA de jwt.secret (no con jwt.secret): si no, el contenido del QR, que se
 * muestra en pantalla y lo lee el lector, serviria como Bearer para hacerse pasar por el socio en la API.
 */
@Service
public class QrTokenService {

    // RF-04: el QR cambia cada minuto.
    private static final Duration VIGENCIA = Duration.ofSeconds(60);
    private static final String TIPO_QR = "qr";
    private static final String CONTEXTO_CLAVE = "fitzone-qr-acceso";

    public record QrEmitido(String token, Instant venceEn) {
    }

    private final SecretKey clave;
    private final Clock clock;

    public QrTokenService(@Value("${jwt.secret}") String jwtSecret, Clock clock) {
        this.clave = derivarClave(jwtSecret);
        this.clock = clock;
    }

    public QrEmitido emitir(Integer usuarioId) {
        Instant ahora = clock.instant().truncatedTo(ChronoUnit.SECONDS);
        Instant vence = ahora.plus(VIGENCIA);
        String token = Jwts.builder()
                .subject(String.valueOf(usuarioId))
                .claim("typ", TIPO_QR)
                .issuedAt(Date.from(ahora))
                .expiration(Date.from(vence))
                .signWith(clave)
                .compact();
        return new QrEmitido(token, vence);
    }

    /** Devuelve el id del titular. 400 si el QR no es autentico; 409 si ya vencio. */
    public Integer validar(String token) {
        try {
            var claims = Jwts.parser()
                    .verifyWith(clave)
                    .clock(() -> Date.from(clock.instant()))
                    .build()
                    .parseSignedClaims(token)
                    .getPayload();
            if (!TIPO_QR.equals(claims.get("typ", String.class))) {
                throw qrInvalido();
            }
            return Integer.valueOf(claims.getSubject());
        } catch (ExpiredJwtException e) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "El QR vencio: pedi uno nuevo");
        } catch (JwtException | IllegalArgumentException e) {
            throw qrInvalido();
        }
    }

    private ResponseStatusException qrInvalido() {
        return new ResponseStatusException(HttpStatus.BAD_REQUEST, "El QR no es valido");
    }

    private static SecretKey derivarClave(String jwtSecret) {
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(jwtSecret.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
            return Keys.hmacShaKeyFor(mac.doFinal(CONTEXTO_CLAVE.getBytes(StandardCharsets.UTF_8)));
        } catch (GeneralSecurityException e) {
            throw new IllegalStateException("No se pudo derivar la clave del QR", e);
        }
    }
}
