package com.fitzonesports.usuario.dto;

import com.fitzonesports.usuario.model.Usuario;

public record UsuarioResponse(
        Integer id,
        String nombre,
        String apellido,
        String dni,
        String email,
        String foto,
        boolean activo,
        String rol,
        Integer sedeId,
        String sedeNombre) {

    // Nunca se expone la entidad: evita filtrar contrasenia por la API.
    public static UsuarioResponse from(Usuario usuario) {
        return new UsuarioResponse(
                usuario.getId(),
                usuario.getNombre(),
                usuario.getApellido(),
                usuario.getDni(),
                usuario.getEmail(),
                usuario.getFoto(),
                usuario.isActivo(),
                usuario.getRol().getNombre(),
                usuario.getSede().getId(),
                usuario.getSede().getNombre());
    }
}
