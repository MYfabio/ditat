import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "@fontsource/opendyslexic/400.css";
import "@fontsource/opendyslexic/700.css";
import "./globals.css";
import { Providers } from "@/components/providers";
import { URL_PUBLICA, DESCRIPCIO_PORTADA as DESCRIPCIO } from "@/lib/seo";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  // Sense això, les adreces canòniques i les imatges per compartir surten
  // relatives i els cercadors i el WhatsApp no les saben resoldre.
  metadataBase: new URL(URL_PUBLICA),
  title: {
    default: "dictats.cat · Dictats en català per millorar l'ortografia",
    // Les pàgines de dins posen el seu títol i aquesta plantilla hi afegeix la marca.
    template: "%s · dictats.cat",
  },
  description: DESCRIPCIO,
  applicationName: "dictats.cat",
  keywords: [
    "dictats en català",
    "dictats català online",
    "ortografia catalana",
    "practicar català escrit",
    "nivell C1 català",
    "exercicis ortografia catalana",
  ],
  authors: [{ name: "dictats.cat" }],
  // Sense canònica ni Open Graph globals: els posa cada pàgina pública amb
  // metadadesPublica() (lib/seo.ts). Si fossin aquí, les pàgines privades i la
  // d'entrar heretarien una canònica que apunta a la portada.
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, "max-image-preview": "large" },
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="ca"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
