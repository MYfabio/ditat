/**
 * Codi curt que el docent comparteix amb la classe.
 *
 * S'eviten els caràcters que es confonen quan algú els copia d'una pissarra
 * (0/O, 1/I/L) i les vocals, perquè no surtin paraules per casualitat.
 */
const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

export function generateJoinCode(length = 6) {
  let code = "";
  for (let i = 0; i < length; i++) {
    code += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
  }
  return code;
}

/** Accepta el codi escrit en minúscules, amb espais o amb guions. */
export function normaliseJoinCode(raw: string) {
  return raw.trim().toUpperCase().replace(/[\s-]/g, "");
}
