package com.fitzonesports.acceso.offline;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.JwtException;
import java.security.*;
import java.security.interfaces.RSAPublicKey;
import java.security.spec.*;
import java.time.*;
import java.util.*;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.http.HttpStatus;

/** Clave exclusiva de M2. Nunca deriva ni publica el secreto del login. */
@Component
public class FirmaOffline {
    public static final String EMISOR = "fitzone-m2";
    public static final String AUDIENCIA = "fitzone-acceso";
    private final PrivateKey privada;
    private final PublicKey publica;
    private final Clock clock;
    public FirmaOffline(Clock clock, @Value("${fitzone.offline.private-key:}") String configurada) {
        this.clock=clock;
        try {
            if (configurada.isBlank()) {
                // Sin clave persistente no se preparan credenciales que morirían al reiniciar Spring.
                privada=null;publica=null;
            } else {
                var fabrica=KeyFactory.getInstance("RSA");
                privada=fabrica.generatePrivate(new PKCS8EncodedKeySpec(Base64.getDecoder().decode(configurada)));
                var rsa=(java.security.interfaces.RSAPrivateCrtKey)privada;
                publica=fabrica.generatePublic(new RSAPublicKeySpec(rsa.getModulus(),rsa.getPublicExponent()));
                if(rsa.getModulus().bitLength()<2048)throw new IllegalArgumentException("RSA requiere 2048 bits");
            }
        } catch (GeneralSecurityException | IllegalArgumentException e) { throw new IllegalStateException("Clave exclusiva de M2 inválida",e); }
    }
    public String firmar(String tipo, Map<String,?> datos, Instant desde, Instant hasta) {
        comprobarConfiguracion();
        return Jwts.builder().header().keyId(kid()).and().issuer(EMISOR).audience().add(AUDIENCIA).and().claim("tipo",tipo).claims(datos)
                .issuedAt(Date.from(clock.instant())).notBefore(Date.from(desde)).expiration(Date.from(hasta))
                .signWith(privada,Jwts.SIG.RS256).compact();
    }
    public Claims verificar(String token,String tipo,Instant instante) {
        comprobarConfiguracion();
        try {
            var jws=Jwts.parser().verifyWith(publica).requireIssuer(EMISOR)
                    .clock(()->Date.from(instante)).build().parseSignedClaims(token);
            if(!"RS256".equals(jws.getHeader().getAlgorithm()) || !tipo.equals(jws.getPayload().get("tipo"))
                    || jws.getPayload().getExpiration()==null || !instante.isBefore(jws.getPayload().getExpiration().toInstant()))throw new IllegalArgumentException();
            if ("m2-autorizacion".equals(tipo) || jws.getHeader().getKeyId()!=null) {
                if (!kid().equals(jws.getHeader().getKeyId()) || jws.getPayload().getAudience()==null
                        || !jws.getPayload().getAudience().contains(AUDIENCIA)) throw new IllegalArgumentException();
            }
            return jws.getPayload();
        } catch(JwtException | IllegalArgumentException e) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"Evidencia offline inválida o caducada");
        }
    }
    public Map<String,String> jwk() {
        comprobarConfiguracion();
        var rsa=(RSAPublicKey)publica;
        return Map.of("kty","RSA","alg","RS256","use","sig","kid",kid(),"n",sinSigno(rsa.getModulus().toByteArray()),"e",sinSigno(rsa.getPublicExponent().toByteArray()));
    }
    private String kid() {
        comprobarConfiguracion();
        try { return Base64.getUrlEncoder().withoutPadding().encodeToString(MessageDigest.getInstance("SHA-256").digest(publica.getEncoded())); }
        catch (GeneralSecurityException e) { throw new IllegalStateException(e); }
    }
    private String sinSigno(byte[] bytes) {
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes[0]==0?Arrays.copyOfRange(bytes,1,bytes.length):bytes);
    }
    private void comprobarConfiguracion() {
        if(privada==null)throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE,"Configurar fitzone.offline.private-key con una clave RSA persistente del servidor antes de preparar M2 offline");
    }
}
