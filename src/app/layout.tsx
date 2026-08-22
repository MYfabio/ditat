import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "@fontsource/opendyslexic/400.css";
import "@fontsource/opendyslexic/700.css";
import "./globals.css";
import { Providers } from "@/components/providers";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const URL_BASE = "https://www.dictats.cat";

const DESCRIPCIO =
  "Practica dictats en català adaptats al teu nivell, del A1 al C2. Els escoltes, els " +
  "escrius i te'ls corregim explicant-te cada falta. Els següents surten dels teus errors. " +
  "Quatre dictats al mes gratis.";

export const metadata: Metadata = {
  // Sense això, les adreces canòniques i les imatges per compartir surten
  // relatives i els cercadors i el WhatsApp no les saben resoldre.
  metadataBase: new URL(URL_BASE),
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
  alternates: {
    // El domini bo és un: sense això, el mateix contingut servit des d'una
    // altra adreça competeix amb ell mateix als cercadors.
    canonical: "/",
  },
  openGraph: {
    type: "website",
    locale: "ca_ES",
    url: URL_BASE,
    siteName: "dictats.cat",
    title: "Dictats en català per millorar l'ortografia",
    description: DESCRIPCIO,
  },
  twitter: {
    card: "summary_large_image",
    title: "Dictats en català per millorar l'ortografia",
    description: DESCRIPCIO,
  },
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
