package com.fitzonesports.clase.dto;

import com.fitzonesports.clase.model.Instructor;

public record InstructorResponse(Integer id, String nombre, String apellido) {

    public static InstructorResponse from(Instructor instructor) {
        return new InstructorResponse(instructor.getId(), instructor.getNombre(), instructor.getApellido());
    }
}
