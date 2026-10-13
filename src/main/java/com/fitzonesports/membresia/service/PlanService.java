package com.fitzonesports.membresia.service;

import com.fitzonesports.membresia.dto.*;
import com.fitzonesports.membresia.model.PlanMembresia;
import com.fitzonesports.membresia.repository.PlanMembresiaRepository;
import java.util.List;
import java.util.Set;
import lombok.RequiredArgsConstructor;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
@RequiredArgsConstructor
public class PlanService {
    private static final Set<Integer> DURACIONES = Set.of(1, 3, 12);
    private final PlanMembresiaRepository repository;

    @Transactional(readOnly = true)
    public List<PlanResponse> listarPlanes(boolean incluirInactivos) {
        var planes = incluirInactivos ? repository.findAllByOrderByDuracionMesesAscNombreAsc()
                : repository.findByActivoTrueOrderByDuracionMesesAscNombreAsc();
        return planes.stream().map(PlanResponse::from).toList();
    }

    @Transactional
    public PlanResponse crearPlan(PlanRequest request) {
        validarDuracion(request.duracionMeses());
        String nombre = request.nombre().strip();
        validarNombre(nombre, null);
        PlanMembresia plan = new PlanMembresia();
        plan.setNombre(nombre);
        plan.setDuracionMeses(request.duracionMeses());
        plan.setPrecio(request.precio());
        return guardar(plan);
    }

    @Transactional
    public PlanResponse actualizarPlan(Integer id, ActualizarPlanRequest request) {
        PlanMembresia plan = cargar(id);
        if (request.nombre() != null) {
            String nombre = request.nombre().strip();
            validarNombre(nombre, id);
            plan.setNombre(nombre);
        }
        if (request.duracionMeses() != null) {
            validarDuracion(request.duracionMeses());
            plan.setDuracionMeses(request.duracionMeses());
        }
        if (request.precio() != null) plan.setPrecio(request.precio());
        if (request.activo() != null) plan.setActivo(request.activo());
        return guardar(plan);
    }

    @Transactional
    public void desactivarPlan(Integer id) {
        cargar(id).setActivo(false);
    }

    private PlanMembresia cargar(Integer id) {
        return repository.findById(id).orElseThrow(() ->
                new ResponseStatusException(HttpStatus.NOT_FOUND, "El plan no existe"));
    }

    private void validarDuracion(Integer meses) {
        if (meses == null || !DURACIONES.contains(meses)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "La duracion debe ser 1, 3 o 12 meses");
        }
    }

    private void validarNombre(String nombre, Integer id) {
        if (repository.findByNombreIgnoreCase(nombre).filter(p -> !p.getId().equals(id)).isPresent()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Ya existe un plan con ese nombre");
        }
    }

    private PlanResponse guardar(PlanMembresia plan) {
        try {
            return PlanResponse.from(repository.saveAndFlush(plan));
        } catch (DataIntegrityViolationException ex) {
            // El indice unico protege tambien las escrituras concurrentes.
            throw new ResponseStatusException(HttpStatus.CONFLICT, "El plan entra en conflicto con los datos existentes", ex);
        }
    }
}
