/**
 * El que comparteixen el formulari i l'accio del servidor.
 *
 * Va en un fitxer a part perque un modul "use server" nomes pot exportar
 * funcions asincrones: una constant o un tipus alli trenquen la compilacio.
 */

/** El text que cal escriure perque un clic distret no esborri res. */
export const PARAULA_CONFIRMACIO = "ESBORRAR";

export type ResultatBaixa = { error: string } | undefined;
