package com.fitzonesports.usuario;

import com.fitzonesports.usuario.service.FotoPerfilService;
import com.fitzonesports.usuario.repository.FotoPerfilRepository;
import com.fitzonesports.usuario.repository.UsuarioRepository;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.web.server.ResponseStatusException;
import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;
import javax.imageio.ImageIO;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class FotoPerfilServiceTest {
    private final FotoPerfilRepository fotos=mock(FotoPerfilRepository.class);
    private final UsuarioRepository usuarios=mock(UsuarioRepository.class);
    private final FotoPerfilService service=new FotoPerfilService(fotos,usuarios);

    private byte[] imagen(String formato,int ancho,int alto) throws Exception {
        var salida=new ByteArrayOutputStream();
        ImageIO.write(new BufferedImage(ancho,alto,BufferedImage.TYPE_INT_RGB),formato,salida);
        return salida.toByteArray();
    }
    @Test void aceptaPngYJpegYDescartaContenidoAgregado() throws Exception {
        for(String formato:new String[]{"png","jpeg"}) {
            var original=imagen(formato,2,2);
            var agregado=java.util.Arrays.copyOf(original,original.length+100);
            var resultado=service.validar(new MockMultipartFile("foto","ignorado", "image/"+formato,agregado));
            assertEquals("image/"+formato,resultado.tipo());
            assertTrue(resultado.contenido().length<agregado.length);
            assertNotNull(ImageIO.read(new java.io.ByteArrayInputStream(resultado.contenido())));
        }
        verifyNoInteractions(fotos,usuarios);
    }
    @Test void rechazaAusenteVaciaSvgYMimeFalso() throws Exception {
        assertThrows(ResponseStatusException.class,()->service.validar(null));
        for(var archivo:new MockMultipartFile[]{
            new MockMultipartFile("foto","a.png","image/png",new byte[0]),
            new MockMultipartFile("foto","a.svg","image/svg+xml","<svg/>".getBytes()),
            new MockMultipartFile("foto","a.png","image/png","no es imagen".getBytes()),
            new MockMultipartFile("foto","a.jpg","image/jpeg",imagen("png",2,2))}) {
            assertEquals(400,assertThrows(ResponseStatusException.class,()->service.validar(archivo)).getStatusCode().value());
        }
        verifyNoInteractions(fotos,usuarios);
    }
    @Test void rechazaExcesoDeBytesYDimensionesAntesDeGuardar() throws Exception {
        assertEquals(413,assertThrows(ResponseStatusException.class,()->service.validar(new MockMultipartFile("foto","a.png","image/png",new byte[FotoPerfilService.MAX_BYTES+1]))).getStatusCode().value());
        assertEquals(400,assertThrows(ResponseStatusException.class,()->service.validar(new MockMultipartFile("foto","a.png","image/png",imagen("png",4097,1)))).getStatusCode().value());
        verifyNoInteractions(fotos,usuarios);
    }
    @Test void reemplazoConservaTitularYRenuevaReferencia() throws Exception {
        var usuario=new com.fitzonesports.usuario.model.Usuario();usuario.setId(7);
        var anterior=new com.fitzonesports.usuario.model.FotoPerfil();anterior.setUsuarioId(7);anterior.setVersion("anterior");
        when(fotos.findById(7)).thenReturn(java.util.Optional.of(anterior));
        service.guardar(usuario,service.validar(new MockMultipartFile("foto","a.png","image/png",imagen("png",2,2))));
        verify(fotos).save(anterior);assertEquals(7,anterior.getUsuarioId());assertNotEquals("anterior",anterior.getVersion());
        assertEquals("/usuarios/me/foto?version="+anterior.getVersion(),usuario.getFoto());
    }
}
