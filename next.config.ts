import type { NextConfig } from "next";

/**
 * Capçaleres de seguretat.
 *
 * No hi havia res: el navegador no rebia cap instrucció, i per tant qualsevol
 * web podia carregar dictats.cat dins d'un marc invisible i fer que algú
 * premés botons del seu panell sense saber-ho. Amb dades d'alumnat pel mig,
 * val la pena tancar-ho encara que no consti cap intent.
 */
const securityHeaders = [
  // Ningú pot posar aquest web dins d'un marc.
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Content-Security-Policy", value: "frame-ancestors 'none'" },
  // El navegador no ha d'endevinar el tipus d'un fitxer: si diu que és una
  // imatge, s'ha de tractar com a imatge i no executar-la mai com a codi.
  { key: "X-Content-Type-Options", value: "nosniff" },
  // En sortir cap a un altre web no s'hi envia la ruta que s'estava mirant:
  // les rutes porten identificadors d'entregues i d'alumnat.
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // Aquest web no necessita ni càmera d'escriptori, ni micròfon, ni ubicació.
  // La foto del dictat es fa des del selector de fitxers del propi mòbil.
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), interest-cohort=()" },
  // Un cop s'ha entrat per https, el navegador no ho torna a provar per http.
  {
    key: "Strict-Transport-Security",
    value: "max-age=31536000; includeSubDomains",
  },
];

const nextConfig: NextConfig = {
  async headers() {
    return [
      { source: "/:path*", headers: securityHeaders },
      {
        // El domini de Railway serveix exactament el mateix contingut que
        // dictats.cat. Si un cercador l'indexa, el web competeix amb ell
        // mateix i l'autoritat es reparteix entre dues adreces. Aqui se li diu
        // que no l'indexi: el domini bo nomes n'hi ha un.
        source: "/:path*",
        has: [{ type: "host", value: "ditat-production.up.railway.app" }],
        headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }],
      },
    ];
  },
};

export default nextConfig;
