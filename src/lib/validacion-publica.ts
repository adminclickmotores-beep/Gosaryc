// Limpieza y validación de lo que escriben los visitantes en formularios públicos
// (menú QR, agente de pedidos, enlace universal, solicitudes, registro) antes de
// enviarlo a la base. La base vuelve a validar por su cuenta; esto evita envíos
// basura y da un mensaje claro al cliente.

export const LIMITES = {
  nombre: 120,
  telefono: 20,
  direccion: 300,
  barrio: 120,
  correo: 254,
  notas: 500,
  nota_linea: 200,
  mensaje: 2000,
  solicitud: 4000,
  codigo: 40,
  clave: 72,
} as const;

// Caracteres de control e invisibles (incluye los que invierten la dirección del texto).
const INVISIBLES = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F​-‏‪-‮⁦-⁩﻿]/g;

/** Quita caracteres invisibles y de marcado, espacios repetidos y corta al máximo. */
export function limpiarTexto(valor: string | null | undefined, max: number, multilinea = false): string {
  let v = (valor ?? "").normalize("NFC").replace(INVISIBLES, "").replace(/[<>]/g, "");
  v = multilinea ? v.replace(/[ \t]+/g, " ").replace(/\n{3,}/g, "\n\n") : v.replace(/\s+/g, " ");
  return v.trim().slice(0, max);
}

/** Deja solo dígitos y un "+" inicial. */
export function limpiarTelefono(valor: string | null | undefined): string {
  const v = (valor ?? "").trim();
  const digitos = v.replace(/\D/g, "");
  return ((v.startsWith("+") ? "+" : "") + digitos).slice(0, LIMITES.telefono);
}

export function telefonoValido(valor: string): boolean {
  const d = valor.replace(/\D/g, "");
  return d.length >= 7 && d.length <= 15;
}

export function limpiarCorreo(valor: string | null | undefined): string {
  return (valor ?? "").replace(INVISIBLES, "").replace(/\s+/g, "").toLowerCase().slice(0, LIMITES.correo);
}

export function correoValido(valor: string): boolean {
  return valor.length > 0 && valor.length <= LIMITES.correo && /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(valor);
}

/** Código seguro de certificados: solo letras, números y guiones. */
export function limpiarCodigo(valor: string | null | undefined): string {
  return (valor ?? "").replace(/[^A-Za-z0-9-]/g, "").slice(0, LIMITES.codigo);
}
