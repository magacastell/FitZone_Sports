package com.fitzonesports.usuario.service;

import com.fitzonesports.usuario.model.FotoPerfil;
import com.fitzonesports.usuario.model.Usuario;
import com.fitzonesports.usuario.repository.FotoPerfilRepository;
import com.fitzonesports.usuario.repository.UsuarioRepository;
import com.fitzonesports.usuario.dto.UsuarioResponse;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.util.Set;
import java.util.UUID;
import javax.imageio.ImageIO;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

@Service
@RequiredArgsConstructor
public class FotoPerfilService {
    public static final int MAX_BYTES = 2 * 1024 * 1024;
    private final FotoPerfilRepository fotos;
    private final UsuarioRepository usuarios;

    public record Imagen(byte[] contenido, String tipo) {}

    public Imagen validar(MultipartFile archivo) {
        if (archivo == null || archivo.isEmpty()) throw error("Seleccioná una foto de perfil");
        if (archivo.getSize() > MAX_BYTES) throw new ResponseStatusException(HttpStatus.PAYLOAD_TOO_LARGE, "La foto admite hasta 2 MB");
        if (!Set.of("image/png", "image/jpeg").contains(String.valueOf(archivo.getContentType())))
            throw error("La foto debe ser PNG o JPEG");
        try (var entrada = ImageIO.createImageInputStream(new ByteArrayInputStream(archivo.getBytes()))) {
            var lectores = ImageIO.getImageReaders(entrada);
            if (!lectores.hasNext()) throw error("El archivo no contiene una imagen válida");
            var lector = lectores.next();
            try {
                lector.setInput(entrada, true, true);
                String formato = lector.getFormatName().toLowerCase(java.util.Locale.ROOT);
                String tipo = "png".equals(formato) ? "image/png" : "jpeg".equals(formato) ? "image/jpeg" : "";
                if (!tipo.equals(archivo.getContentType())) throw error("El contenido no coincide con el tipo de imagen");
                int ancho = lector.getWidth(0), alto = lector.getHeight(0);
                // Comprobar dimensiones antes de descomprimir evita imágenes comprimidas enormes.
                if (ancho > 4096 || alto > 4096 || (long) ancho * alto > 8_000_000) throw error("La foto admite hasta 4096 px por lado y 8 megapíxeles");
                var imagen = lector.read(0);
                var salida = new ByteArrayOutputStream();
                if (!ImageIO.write(imagen, formato, salida) || salida.size() > MAX_BYTES) throw error("La imagen procesada supera el límite de 2 MB");
                // Reescribir píxeles descarta nombre original, metadatos y contenido adicional.
                return new Imagen(salida.toByteArray(), tipo);
            } finally { lector.dispose(); }
        } catch (IOException | IllegalArgumentException e) {
            throw error("No pudimos leer la foto. Seleccioná una imagen PNG o JPEG válida");
        }
    }

    @Transactional
    public void guardar(Usuario usuario, Imagen imagen) {
        var foto = fotos.findById(usuario.getId()).orElseGet(FotoPerfil::new);
        foto.setUsuarioId(usuario.getId());
        foto.setContenido(imagen.contenido());
        foto.setTipo(imagen.tipo());
        foto.setVersion(UUID.randomUUID().toString());
        fotos.save(foto);
        usuario.setFoto("/usuarios/me/foto?version=" + foto.getVersion());
    }

    @Transactional
    public UsuarioResponse reemplazar(String email, MultipartFile archivo) {
        var imagen = validar(archivo);
        var usuario = titular(email);
        guardar(usuario, imagen);
        return UsuarioResponse.from(usuario);
    }

    @Transactional(readOnly = true)
    public Imagen consultar(String email) {
        var foto = fotos.findById(titular(email).getId()).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Todavía no cargaste una foto"));
        return new Imagen(foto.getContenido(), foto.getTipo());
    }

    /** Uso interno de M2 tras autorizar el movimiento, nunca una consulta HTTP por ID. */
    @Transactional(readOnly = true)
    public java.util.Optional<Imagen> consultarParaMovimiento(Integer usuarioId) {
        return fotos.findById(usuarioId).map(foto -> new Imagen(foto.getContenido(), foto.getTipo()));
    }

    private Usuario titular(String email) {
        return usuarios.findByEmail(email).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "El usuario no existe"));
    }
    private ResponseStatusException error(String texto) { return new ResponseStatusException(HttpStatus.BAD_REQUEST, texto); }
}
