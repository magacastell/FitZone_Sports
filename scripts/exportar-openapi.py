"""Valida el contrato OpenAPI y genera el JSON que sirve Swagger UI."""

import argparse
import json
from pathlib import Path

import yaml
from openapi_spec_validator import validate


class LoaderSinDuplicados(yaml.SafeLoader):
    def construct_mapping(self, node, deep=False):
        claves = set()
        for clave, _ in node.value:
            valor = self.construct_object(clave, deep=deep)
            if valor in claves:
                raise yaml.constructor.ConstructorError(
                    None, None, f"Clave YAML duplicada: {valor}", clave.start_mark
                )
            claves.add(valor)
        return super().construct_mapping(node, deep=deep)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--check", action="store_true", help="verifica el JSON sin escribirlo")
    args = parser.parse_args()

    raiz = Path(__file__).resolve().parents[1]
    origen = raiz / "docs/openapi/openapi.yaml"
    destino = raiz / "src/main/resources/fitzone-api-docs/swagger.json"
    with origen.open(encoding="utf-8") as archivo:
        contrato = yaml.load(archivo, Loader=LoaderSinDuplicados)

    validate(contrato)
    contenido = json.dumps(contrato, ensure_ascii=False, indent=2, allow_nan=False) + "\n"
    if args.check:
        if not destino.is_file() or destino.read_text(encoding="utf-8") != contenido:
            parser.exit(1, "swagger.json desactualizado. Ejecutá scripts/exportar-openapi.py.\n")
        print("Contrato OpenAPI válido y swagger.json actualizado.")
    else:
        destino.write_text(contenido, encoding="utf-8", newline="\n")
        print(f"Contrato OpenAPI válido. JSON generado en {destino.relative_to(raiz)}.")


if __name__ == "__main__":
    main()
