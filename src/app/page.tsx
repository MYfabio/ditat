import { SiteHeader } from "@/components/landing/site-header";
import { Hero } from "@/components/landing/hero";
import { ProblemSolution } from "@/components/landing/problem-solution";
import { FeatureGrid } from "@/components/landing/feature-grid";
import { LiveWidget } from "@/components/landing/live-widget";
import { Pricing } from "@/components/landing/pricing";
import { Faq } from "@/components/landing/faq";
import { DemoCta } from "@/components/landing/demo-cta";
import { SiteFooter } from "@/components/landing/site-footer";

export default function Home() {
  return (
    <>
      <SiteHeader />
      <main className="flex-1">
        <Hero />
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
