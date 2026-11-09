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
    private final PrivateKey privada;
    private final PublicKey publica;
    private final Clock clock;
    public FirmaOffline(Clock clock, @Value("${fitzone.offline.private-key:}") String configurada) {
        this.clock=clock;
        try {
            if (configurada.isBlank()) {
                var generador=KeyPairGenerator.getInstance("RSA");generador.initialize(2048);
                var par=generador.generateKeyPair();privada=par.getPrivate();publica=par.getPublic();
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
        return Jwts.builder().issuer(EMISOR).claim("tipo",tipo).claims(datos)
                .issuedAt(Date.from(clock.instant())).notBefore(Date.from(desde)).expiration(Date.from(hasta))
                .signWith(privada,Jwts.SIG.RS256).compact();
    }
    public Claims verificar(String token,String tipo,Instant instante) {
        try {
            var jws=Jwts.parser().verifyWith(publica).requireIssuer(EMISOR)
                    .clock(()->Date.from(instante)).build().parseSignedClaims(token);
            if(!"RS256".equals(jws.getHeader().getAlgorithm()) || !tipo.equals(jws.getPayload().get("tipo"))
                    || jws.getPayload().getExpiration()==null || !instante.isBefore(jws.getPayload().getExpiration().toInstant()))throw new IllegalArgumentException();
            return jws.getPayload();
        } catch(JwtException | IllegalArgumentException e) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"Evidencia offline inválida o caducada");
        }
    }
    public Map<String,String> jwk() {
        var rsa=(RSAPublicKey)publica;
        return Map.of("kty","RSA","alg","RS256","use","sig","n",sinSigno(rsa.getModulus().toByteArray()),"e",sinSigno(rsa.getPublicExponent().toByteArray()));
    }
    private String sinSigno(byte[] bytes) {
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes[0]==0?Arrays.copyOfRange(bytes,1,bytes.length):bytes);
    }
}
