export function validarFoto(archivo) {
  if (!archivo) return 'Seleccioná una foto de perfil.';
  if (!['image/jpeg', 'image/png'].includes(archivo.type)) return 'La foto debe ser PNG o JPEG.';
  if (!archivo.size || archivo.size > 2 * 1024 * 1024) return 'La foto admite hasta 2 MB.';
  return null;
}
