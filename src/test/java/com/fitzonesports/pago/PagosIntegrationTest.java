package com.fitzonesports.pago;

import com.fitzonesports.membresia.dto.CrearMembresiaRequest;
import com.fitzonesports.membresia.dto.RenovarMembresiaRequest;
import com.fitzonesports.membresia.service.MembresiaService;
import com.fitzonesports.pago.pasarela.*;
import com.fitzonesports.pago.service.*;
import java.math.BigDecimal;
import java.time.*;
import java.util.*;
import org.apache.pdfbox.Loader;
import org.apache.pdfbox.text.PDFTextStripper;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Primary;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;
import static org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers.springSecurity;

@EnabledIfEnvironmentVariable(named="PLAN_TEST_DB_URL", matches=".+")
@SpringBootTest(properties={"spring.profiles.active=staging", "spring.datasource.url=${PLAN_TEST_DB_URL}",
        "spring.datasource.username=postgres", "spring.datasource.password=",
        "jwt.secret=clave-exclusiva-para-pruebas-de-pagos-1234567890", "membresias.renovacion.inicio-ms=3600000"})
class PagosIntegrationTest {
    @Autowired MembresiaService membresias;
    @Autowired ComprobanteService comprobantes;
    @Autowired ReembolsoService reembolsos;
    @Autowired JdbcTemplate jdbc;
    @Autowired Reloj reloj;
    @Autowired org.springframework.web.context.WebApplicationContext contexto;
    @Autowired com.fitzonesports.auth.service.JwtService jwt;
    @Autowired com.fitzonesports.auth.service.CustomUserDetailsService detalles;
    @MockitoBean PasarelaPago pasarela;
    Integer sede, usuario, otro, plan;
    String email, otroEmail, gerente, recepcion;
    MockMvc mvc;

    @TestConfiguration static class Config {
        @Bean @Primary Reloj reloj() { return new Reloj(); }
    }
    static class Reloj extends Clock {
        private Instant ahora = Instant.parse("2026-10-25T15:00:00Z");
        public ZoneId getZone() { return ZoneId.of("America/Argentina/Buenos_Aires"); }
        public Clock withZone(ZoneId zona) { return Clock.fixed(ahora,zona); }
        public Instant instant() { return ahora; }
        void avanzar(Duration duracion) { ahora = ahora.plus(duracion); }
    }
    @BeforeEach void preparar() {
        reloj.ahora = Instant.parse("2026-10-25T15:00:00Z");
        when(pasarela.cobrar(any())).thenAnswer(inv -> new PasarelaPagoFake().cobrar(inv.getArgument(0)));
        when(pasarela.reembolsar(any())).thenAnswer(inv -> new PasarelaPagoFake().reembolsar(inv.getArgument(0)));
        String sufijo = UUID.randomUUID().toString();
        sede = jdbc.queryForObject("INSERT INTO sede(nombre,capacidad_maxima) VALUES (?,10) RETURNING id",Integer.class,"Pagos " + sufijo);
        email="titular-"+sufijo+"@test.com"; otroEmail="otro-"+sufijo+"@test.com";
        gerente="gerente-"+sufijo+"@test.com"; recepcion="recepcion-"+sufijo+"@test.com";
        usuario=usuario(email,"USUARIO"); otro=usuario(otroEmail,"USUARIO");
        usuario(gerente,"GERENTE"); usuario(recepcion,"RECEPCIONISTA");
        plan=jdbc.queryForObject("INSERT INTO plan_membresia(nombre,duracion_meses,precio) VALUES (?,1,15000.50) RETURNING id",Integer.class,"Plan " + sufijo);
        mvc=MockMvcBuilders.webAppContextSetup(contexto).apply(springSecurity()).build();
    }
    private Integer usuario(String mail,String rol) {
        return jdbc.queryForObject("INSERT INTO usuario(dni,email,rolid,sedeid,nombre,apellido,contrasenia) "
                + "VALUES (?,?,(SELECT id FROM rol WHERE nombre=?),?,'María','Muñoz','test') RETURNING id",Integer.class,mail,mail,rol,sede);
    }
    private com.fitzonesports.membresia.dto.MembresiaResponse contratar() {
        return membresias.contratar(email,new CrearMembresiaRequest(plan,null),UUID.randomUUID());
    }
    private String bearer(String mail) { return "Bearer " + jwt.generateToken(detalles.loadUserByUsername(mail)); }
    private void assertEstado(int esperado, org.junit.jupiter.api.function.Executable operacion) {
        assertEquals(esperado,assertThrows(ResponseStatusException.class,operacion).getStatusCode().value());
    }

    @AfterEach void limpiar() {
        jdbc.update("DELETE FROM detalle_facturacion WHERE comprobanteid IN (SELECT c.id FROM comprobante c JOIN pago p ON p.id=c.pagoid WHERE p.usuarioid IN (?,?))",usuario,otro);
        jdbc.update("DELETE FROM comprobante WHERE pagoid IN (SELECT id FROM pago WHERE usuarioid IN (?,?))",usuario,otro);
        jdbc.update("DELETE FROM reembolso_pago WHERE pago_id IN (SELECT id FROM pago WHERE usuarioid IN (?,?))",usuario,otro);
        jdbc.update("DELETE FROM periodo_membresia WHERE membresia_id IN (SELECT id FROM membresia WHERE usuarioid IN (?,?))",usuario,otro);
        jdbc.update("DELETE FROM pago WHERE usuarioid IN (?,?)",usuario,otro);
        jdbc.update("DELETE FROM membresia WHERE usuarioid IN (?,?)",usuario,otro);
        jdbc.update("DELETE FROM usuario WHERE sedeid=?",sede);
        jdbc.update("DELETE FROM plan_membresia WHERE id=?",plan);
        jdbc.update("DELETE FROM sede WHERE id=?",sede);
    }

    @Test void emitePdfOriginalConCentavosYNoLoDuplica() throws Exception {
        var m=contratar(); int pago=m.periodos().getFirst().pagoId();
        String nombreHistorico=m.periodos().getFirst().nombrePlan();
        byte[] original=comprobantes.descargar(email,pago).contenido();
        jdbc.update("UPDATE usuario SET nombre='Otro nombre' WHERE id=?",usuario);
        jdbc.update("UPDATE plan_membresia SET precio=20000,nombre=? WHERE id=?","Cambio "+UUID.randomUUID(),plan);
        assertArrayEquals(original,comprobantes.descargar(email,pago).contenido());
        try(var doc=Loader.loadPDF(original)) {
            String texto=new PDFTextStripper().getText(doc);
            assertTrue(texto.contains("María Muñoz")); assertTrue(texto.contains("15.000,50"));
            assertTrue(texto.contains(nombreHistorico)); assertTrue(texto.contains(email));
            assertTrue(texto.contains("FZ-P-"+pago)); assertTrue(texto.contains("Sin validez fiscal"));
            assertTrue(texto.contains("25/10/2026")); assertTrue(texto.contains("25/11/2026"));
        }
        assertEquals(1,jdbc.queryForObject("SELECT count(*) FROM comprobante WHERE pagoid=?",Integer.class,pago));
        assertEquals(new BigDecimal("15000.50"),jdbc.queryForObject("SELECT subtotal FROM detalle_facturacion d JOIN comprobante c ON c.id=d.comprobanteid WHERE c.pagoid=?",BigDecimal.class,pago));
        mvc.perform(get("/pagos/"+pago+"/comprobante").header("Authorization",bearer(email)))
                .andExpect(status().isOk()).andExpect(content().contentType("application/pdf"))
                .andExpect(header().string("Content-Disposition","attachment; filename=\"comprobante-"+pago+".pdf\""))
                .andExpect(header().string("Cache-Control","no-store")).andExpect(content().bytes(original));
    }

    @Test void controlaPropiedadRolesYAutenticacion() throws Exception {
        int pago=contratar().periodos().getFirst().pagoId();
        for(String ruta:List.of("comprobante","reembolsos")) {
            boolean pdf=ruta.equals("comprobante");
            mvc.perform((pdf?get("/pagos/"+pago+"/"+ruta):post("/pagos/"+pago+"/"+ruta))).andExpect(status().isUnauthorized());
            for(String mail:List.of(otroEmail,recepcion))
                mvc.perform((pdf?get("/pagos/"+pago+"/"+ruta):post("/pagos/"+pago+"/"+ruta))
                        .header("Authorization",bearer(mail))).andExpect(status().isForbidden());
        }
        mvc.perform(get("/pagos/"+pago+"/comprobante").header("Authorization",bearer(gerente))).andExpect(status().isOk());
        mvc.perform(post("/pagos/"+pago+"/reembolsos").header("Authorization",bearer(gerente)))
                .andExpect(status().isOk()).andExpect(jsonPath("$.estado").value("REEMBOLSADO"));
    }

    @Test void reembolsaUnaSolaVezYCancelaBeneficiosSinEliminarHistorial() {
        var m=contratar(); int pago=m.periodos().getFirst().pagoId();
        byte[] pdf=comprobantes.descargar(email,pago).contenido();
        var primera=reembolsos.solicitar(email,pago);
        reloj.avanzar(Duration.ofDays(2));
        assertEquals(primera,reembolsos.solicitar(email,pago));
        assertFalse(membresias.tieneMembresiaVigente(usuario));
        assertEquals("CANCELADA",membresias.consultarPropia(email).periodos().getFirst().estado());
        assertEquals(new BigDecimal("15000.50"),primera.monto()); assertNotNull(primera.fechaReembolso());
        verify(pasarela,times(1)).reembolsar(any());
        assertArrayEquals(pdf,comprobantes.descargar(email,pago).contenido());
    }

    @Test void plazoExactoDe24HorasNoPermiteReembolsoNiAlGerente() {
        int pago=contratar().periodos().getFirst().pagoId(); reloj.avanzar(Duration.ofHours(24));
        assertEstado(409,()->reembolsos.solicitar(email,pago)); assertEstado(409,()->reembolsos.solicitar(gerente,pago));
        assertTrue(membresias.tieneMembresiaVigente(usuario)); verify(pasarela,never()).reembolsar(any());
    }

    @Test void reembolsoPorMembresiasYPagosComparteIdempotencia() {
        var m=contratar(); int pago=m.periodos().getFirst().pagoId();
        membresias.cancelarPeriodo(email,m.id(),m.periodos().getFirst().id());
        assertEquals("REEMBOLSADO",reembolsos.solicitar(email,pago).estado());
        verify(pasarela,times(1)).reembolsar(any());
    }

    @Test void devuelveErroresParaPagosDesconocidosYPagosSinIntegracion() {
        assertEstado(404,()->comprobantes.descargar(email,Integer.MAX_VALUE));
        assertEstado(404,()->reembolsos.solicitar(email,Integer.MAX_VALUE));
        int pago=jdbc.queryForObject("INSERT INTO pago(monto,tipo_referencia,referencia_id,fecha_pago,usuarioid,estado) VALUES (10,'RESERVA_CANCHA',1,CURRENT_TIMESTAMP,?,'APROBADO') RETURNING id",Integer.class,usuario);
        assertEstado(409,()->comprobantes.descargar(email,pago)); assertEstado(409,()->reembolsos.solicitar(email,pago));
    }

    @Test void recuperaComprobanteDePagoAnteriorYRechazaPendientes() {
        int pago=contratar().periodos().getFirst().pagoId();
        jdbc.update("DELETE FROM detalle_facturacion WHERE comprobanteid IN (SELECT id FROM comprobante WHERE pagoid=?)",pago);
        jdbc.update("DELETE FROM comprobante WHERE pagoid=?",pago);
        assertNotNull(comprobantes.descargar(email,pago).contenido());
        jdbc.update("UPDATE pago SET estado='PENDIENTE' WHERE id=?",pago);
        assertEstado(409,()->comprobantes.descargar(email,pago)); assertEstado(409,()->reembolsos.solicitar(email,pago));
    }

    @Test void fallaDePasarelaNoCancelaPeriodoNiRegistraReembolso() {
        int pago=contratar().periodos().getFirst().pagoId();
        doThrow(new IllegalStateException("Fallo de prueba")).when(pasarela).reembolsar(any());
        assertThrows(IllegalStateException.class,()->reembolsos.solicitar(email,pago));
        assertTrue(membresias.tieneMembresiaVigente(usuario));
        assertEquals("APROBADO",jdbc.queryForObject("SELECT estado FROM pago WHERE id=?",String.class,pago));
        assertEquals(0,jdbc.queryForObject("SELECT count(*) FROM reembolso_pago WHERE pago_id=?",Integer.class,pago));
    }

    @Test void renovacionTambienEmitePdfConSuPeriodo() {
        var m=contratar(); var clave=UUID.randomUUID();
        var renovada=membresias.renovar(email,m.id(),new RenovarMembresiaRequest(null),clave);
        int pago=renovada.periodos().getLast().pagoId();
        byte[] original=comprobantes.descargar(email,pago).contenido();
        assertNotNull(original);
        var replay=membresias.renovar(email,m.id(),new RenovarMembresiaRequest(null),clave);
        assertEquals(renovada.periodos(),replay.periodos());
        assertEquals(2,jdbc.queryForObject("SELECT count(*) FROM pago WHERE usuarioid=?",Integer.class,usuario));
        assertEquals(2,jdbc.queryForObject("SELECT count(*) FROM comprobante c JOIN pago p ON p.id=c.pagoid WHERE p.usuarioid=?",Integer.class,usuario));
        assertArrayEquals(original,comprobantes.descargar(email,pago).contenido());
        reembolsos.solicitar(email,pago);
        assertTrue(membresias.tieneMembresiaVigente(usuario));
    }

    @Test void canchasPermiteAutoridadEstableSinPrometerReservasImplementadas() throws Exception {
        String token=bearer(email);
        for (boolean conMembresia : List.of(false,true)) {
            if (conMembresia) contratar();
            mvc.perform(get("/canchas").header("Authorization",token)).andExpect(status().isNotImplemented());
            mvc.perform(post("/canchas/1/reservas").header("Authorization",token)).andExpect(status().isNotImplemented());
            mvc.perform(get("/reservas/me").header("Authorization",token)).andExpect(status().isNotImplemented());
        }
        mvc.perform(post("/canchas/1/reservas").header("Authorization",bearer(recepcion))).andExpect(status().isForbidden());
        mvc.perform(get("/canchas")).andExpect(status().isUnauthorized());
    }

    @Test void reembolsosConcurrentesNoDuplicanDevolucion() throws Exception {
        int pago=contratar().periodos().getFirst().pagoId();
        var inicio=new java.util.concurrent.CountDownLatch(1);
        try(var pool=java.util.concurrent.Executors.newFixedThreadPool(2)) {
            java.util.concurrent.Callable<com.fitzonesports.pago.dto.ReembolsoResponse> tarea=()->{
                if(!inicio.await(10,java.util.concurrent.TimeUnit.SECONDS)) throw new IllegalStateException("Timeout");
                return reembolsos.solicitar(email,pago);
            };
            var a=pool.submit(tarea); var b=pool.submit(tarea); inicio.countDown();
            assertEquals(a.get(20,java.util.concurrent.TimeUnit.SECONDS),b.get(20,java.util.concurrent.TimeUnit.SECONDS));
        }
        verify(pasarela,times(1)).reembolsar(any());
        assertEquals(1,jdbc.queryForObject("SELECT count(*) FROM reembolso_pago WHERE pago_id=?",Integer.class,pago));
    }
}
