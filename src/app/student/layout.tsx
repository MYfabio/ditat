import type { Metadata } from "next";

// Zona amb sessio: mai a l'index dels cercadors (tambe esta fora a robots.txt).
export const metadata: Metadata = { robots: { index: false, follow: false } };

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
