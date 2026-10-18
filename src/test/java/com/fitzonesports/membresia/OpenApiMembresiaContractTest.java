package com.fitzonesports.membresia;

import java.nio.file.*;
import java.util.*;
import org.junit.jupiter.api.Test;
import org.yaml.snakeyaml.Yaml;
import static org.junit.jupiter.api.Assertions.*;

class OpenApiMembresiaContractTest {
    @Test void contratoYamlValidoSinReferenciasLocalesRotas() throws Exception {
        try (var input=Files.newInputStream(Path.of("docs/openapi/openapi.yaml"))) {
            Map<String,Object> raiz=new Yaml().load(input);
            validarReferencias(raiz,raiz);
        }
    }
    private void validarReferencias(Object nodo,Map<String,Object> raiz) {
        if (nodo instanceof Map<?,?> mapa) {
            if (mapa.get("$ref") instanceof String ref && ref.startsWith("#/")) {
                Object actual=raiz;
                for (String parte:ref.substring(2).split("/")) {
                    assertInstanceOf(Map.class,actual,"Referencia invalida: "+ref);
                    actual=((Map<?,?>)actual).get(parte.replace("~1","/").replace("~0","~"));
                    assertNotNull(actual,"Referencia inexistente: "+ref);
                }
            }
            mapa.values().forEach(valor->validarReferencias(valor,raiz));
        } else if (nodo instanceof List<?> lista) lista.forEach(valor->validarReferencias(valor,raiz));
    }
}
