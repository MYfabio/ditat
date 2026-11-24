import type { Metadata } from "next";
import { SiteHeader } from "@/components/landing/site-header";
import { Hero } from "@/components/landing/hero";
import { QueEs } from "@/components/landing/que-es";
import { ProblemSolution } from "@/components/landing/problem-solution";
import { FeatureGrid } from "@/components/landing/feature-grid";
import { LiveWidget } from "@/components/landing/live-widget";
import { Pricing } from "@/components/landing/pricing";
import { Faq } from "@/components/landing/faq";
import { DemoCta } from "@/components/landing/demo-cta";
import { SiteFooter } from "@/components/landing/site-footer";
import { StructuredData } from "@/components/landing/structured-data";
import { DESCRIPCIO_PORTADA, metadadesPublica } from "@/lib/seo";

export const metadata: Metadata = metadadesPublica({
  titol: "dictats.cat · Dictats en català per millorar l'ortografia",
  titolAbsolut: true,
  descripcio: DESCRIPCIO_PORTADA,
  cami: "/",
});

export default function Home() {
  return (
    <>
      <StructuredData />
      <SiteHeader />
      <main className="flex-1">
        <Hero />
        <QueEs />
        <ProblemSolution />
        <FeatureGrid />
        <LiveWidget />
        <Pricing />
        <Faq />
        <DemoCta />
      </main>
      <SiteFooter />
    </>
  );
}
