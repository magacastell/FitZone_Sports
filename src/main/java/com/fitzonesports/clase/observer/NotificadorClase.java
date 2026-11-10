package com.fitzonesports.clase.observer;

import com.fitzonesports.clase.model.ClaseGrupal;
import com.fitzonesports.clase.model.TipoClase;
import com.fitzonesports.clase.repository.ClaseGrupalRepository;
import com.fitzonesports.clase.repository.TipoClaseRepository;
import com.fitzonesports.usuario.dto.UsuarioResponse;
import com.fitzonesports.usuario.service.UsuarioService;
import jakarta.annotation.PostConstruct;
import java.time.format.DateTimeFormatter;
import java.util.Collection;
import java.util.List;
import java.util.function.UnaryOperator;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

/**
 * Observador que avisa a las personas afectadas por un evento: oferta de lugar, cambio o cancelacion de clase.
 * Los avisos salen recien cuando la transaccion se confirma, asi nadie recibe un aviso de algo que se deshizo.
 */
@Component
@RequiredArgsConstructor
public class NotificadorClase implements ObservadorClase {

    private static final DateTimeFormatter FORMATO = DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm");

    private final Notificador notificador;
    private final UsuarioService usuarios;
    private final ClaseGrupalRepository clases;
    private final TipoClaseRepository tipos;
    private final PublicadorClase publicador;

    @PostConstruct
    void suscribirse() {
        publicador.suscribir(this);
    }

    @Override
    public void actualizar(EventoClase evento) {
        switch (evento) {
            case EventoClase.OfertaGenerada oferta -> avisar(List.of(oferta.usuarioId()), oferta.claseId(),
                    "Se liberó un lugar en una clase",
                    detalle -> "Se liberó un lugar en " + detalle + ". Tenés hasta el " + FORMATO.format(oferta.venceEn())
                            + " para aceptarlo desde Clases.");
            case EventoClase.ClaseModificada cambio -> avisar(cambio.usuariosAfectados(), cambio.claseId(),
                    "Cambió una clase que reservaste",
                    detalle -> "La clase " + detalle + " fue modificada. Revisá el nuevo horario en Clases.");
            case EventoClase.ClaseCancelada cancelacion -> avisar(cancelacion.usuariosAfectados(), cancelacion.claseId(),
                    "Se canceló una clase",
                    detalle -> "Se canceló la clase " + detalle + ". Motivo: " + cancelacion.motivo()
                            + ". La cancelación no genera ninguna falta.");
            case EventoClase.CupoLiberado liberado -> {
                // Lo atiende GestorListaEspera; a quien se le ofrece el lugar se le avisa con OfertaGenerada.
            }
        }
    }

    private void avisar(Collection<Integer> usuarioIds, Integer claseId, String asunto, UnaryOperator<String> mensaje) {
        if (usuarioIds.isEmpty()) {
            return;
        }
        ClaseGrupal clase = clases.findById(claseId).orElseThrow();
        String nombre = tipos.findById(clase.getTipoClaseId()).map(TipoClase::getNombre).orElse("Clase");
        String detalle = nombre + " del " + FORMATO.format(clase.getInicio());

        List<Notificacion> avisos = usuarios.consultarPorIds(usuarioIds).values().stream()
                .map((UsuarioResponse u) -> new Notificacion(u.id(), u.email(), asunto, mensaje.apply(detalle)))
                .toList();
        despuesDelCommit(() -> avisos.forEach(notificador::enviar));
    }

    private void despuesDelCommit(Runnable accion) {
        if (TransactionSynchronizationManager.isSynchronizationActive()) {
            TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
                @Override
                public void afterCommit() {
                    accion.run();
                }
            });
        } else {
            accion.run();
        }
    }
}
