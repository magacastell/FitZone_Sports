package com.fitzonesports.clase.service;

import com.fitzonesports.clase.dto.InstructorRequest;
import com.fitzonesports.clase.dto.InstructorResponse;
import com.fitzonesports.clase.dto.TipoClaseRequest;
import com.fitzonesports.clase.dto.TipoClaseResponse;
import com.fitzonesports.clase.model.Instructor;
import com.fitzonesports.clase.model.TipoClase;
import com.fitzonesports.clase.repository.InstructorRepository;
import com.fitzonesports.clase.repository.TipoClaseRepository;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Catalogos que necesita RF-06 para crear clases: tipos de actividad e instructores. */
@Service
@RequiredArgsConstructor
public class CatalogoClaseService {

    private final InstructorRepository instructores;
    private final TipoClaseRepository tipos;

    @Transactional(readOnly = true)
    public List<InstructorResponse> listarInstructores() {
        return instructores.findAllByOrderByApellidoAscNombreAscIdAsc().stream().map(InstructorResponse::from).toList();
    }

    @Transactional
    public InstructorResponse crearInstructor(InstructorRequest request) {
        Instructor instructor = new Instructor();
        instructor.setNombre(request.nombre().trim());
        instructor.setApellido(request.apellido().trim());
        return InstructorResponse.from(instructores.save(instructor));
    }

    @Transactional(readOnly = true)
    public List<TipoClaseResponse> listarTipos() {
        return tipos.findAllByOrderByNombreAscIdAsc().stream().map(TipoClaseResponse::from).toList();
    }

    @Transactional
    public TipoClaseResponse crearTipo(TipoClaseRequest request) {
        String nombre = request.nombre().trim();
        if (tipos.existsByNombreIgnoreCase(nombre)) {
            throw ReglasClase.conflicto("Ya existe un tipo de clase con ese nombre");
        }
        TipoClase tipo = new TipoClase();
        tipo.setNombre(nombre);
        try {
            return TipoClaseResponse.from(tipos.saveAndFlush(tipo));
        } catch (DataIntegrityViolationException e) {
            throw ReglasClase.conflicto("Ya existe un tipo de clase con ese nombre");
        }
    }
}
