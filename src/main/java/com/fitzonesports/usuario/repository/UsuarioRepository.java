package com.fitzonesports.usuario.repository;

import com.fitzonesports.usuario.model.Usuario;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

public interface UsuarioRepository extends JpaRepository<Usuario, Integer> {

    @EntityGraph(attributePaths = {"rol", "sede"})
    Optional<Usuario> findByEmail(String email);

    boolean existsByEmail(String email);

    @Override
    @EntityGraph(attributePaths = {"rol", "sede"})
    List<Usuario> findAll();

    @EntityGraph(attributePaths = {"rol", "sede"})
    List<Usuario> findBySedeId(Integer sedeId);

    @Override
    @EntityGraph(attributePaths = {"rol", "sede"})
    Optional<Usuario> findById(Integer id);
}
