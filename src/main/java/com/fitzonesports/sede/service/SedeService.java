package com.fitzonesports.sede.service;

import com.fitzonesports.sede.dto.ActualizarSedeRequest;
import com.fitzonesports.sede.dto.SedeRequest;
import com.fitzonesports.sede.dto.SedeResponse;
import com.fitzonesports.sede.model.Sede;
import com.fitzonesports.sede.repository.SedeRepository;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
@RequiredArgsConstructor
public class SedeService {

    private final SedeRepository sedeRepository;

    @Transactional(readOnly = true)
    public List<SedeResponse> listarSedes() {
        return sedeRepository.findAll().stream().map(SedeResponse::from).toList();
    }

    @Transactional
    public SedeResponse crearSede(SedeRequest request) {
        String nombre = request.nombre().trim();
        validarNombreLibre(nombre, null);

        Sede sede = new Sede();
        sede.setNombre(nombre);
        sede.setDireccion(request.direccion());
        sede.setCapacidadMaxima(request.capacidadMaxima());
        return SedeResponse.from(sedeRepository.save(sede));
    }

    @Transactional
    public SedeResponse actualizarSede(Integer sedeId, ActualizarSedeRequest request) {
        Sede sede = sedeRepository.findById(sedeId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "La sede no existe"));

        if (request.nombre() != null) {
            String nombre = request.nombre().trim();
            validarNombreLibre(nombre, sedeId);
            sede.setNombre(nombre);
        }
        if (request.direccion() != null) {
            sede.setDireccion(request.direccion());
        }
        if (request.capacidadMaxima() != null) {
            sede.setCapacidadMaxima(request.capacidadMaxima());
        }
        return SedeResponse.from(sede);
    }

    private void validarNombreLibre(String nombre, Integer sedeIdActual) {
        boolean duplicado = sedeRepository.findByNombreIgnoreCase(nombre)
                .filter(otra -> !otra.getId().equals(sedeIdActual))
                .isPresent();
        if (duplicado) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Ya existe una sede con ese nombre");
        }
    }
}
