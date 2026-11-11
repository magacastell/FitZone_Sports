package com.fitzonesports.clase.dto;

import java.util.List;
import org.springframework.data.domain.Page;

public record PaginaResponse<T>(List<T> items, int page, int size, long totalElements, int totalPages) {

    public static <T> PaginaResponse<T> de(Page<?> pagina, List<T> items) {
        return new PaginaResponse<>(items, pagina.getNumber(), pagina.getSize(), pagina.getTotalElements(),
                pagina.getTotalPages());
    }
}
