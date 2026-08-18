import Head from "next/head";
import HeroSection from "@/components/HeroSection";
import FeaturesSection from "@/components/FeatureSection";
import PricingSection from "@/components/PricingSection";
import Footer from "@/components/Footer";
import RecommendationChat from "@/components/RecommendationChat";
import React from "react";
import Link from "next/link";

const ADMIN_URL = process.env.NEXT_PUBLIC_ADMIN_URL ?? "http://localhost:3004";

const LandingPageLayout = ({ children }: { children: React.ReactNode }) => (
  <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
    <header className="sticky top-0 z-20 bg-[var(--background)]/90 backdrop-blur-md border-b border-[var(--border)]">
      <nav className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <span className="text-2xl">🎬</span>
          <p className="text-xl font-semibold tracking-wide text-white cinema-gradient-text">
            Frame24
          </p>
        </div>

        <div className="hidden md:flex items-center space-x-8 text-sm font-medium">
          <Link
            href={`${ADMIN_URL}/login`}
            className="text-gray-300 hover:text-accent-red transition-colors"
          >
            Entrar
          </Link>
          <Link
            href="#features"
            className="text-gray-300 hover:text-accent-red transition-colors"
          >
            Funcionalidades
          </Link>
          <Link
            href="#pricing"
            className="text-gray-300 hover:text-accent-red transition-colors"
          >
            Planos
          </Link>
          <Link
            href="#about"
            className="text-gray-300 hover:text-accent-red transition-colors"
          >
            Sobre
          </Link>
          <Link
            href="#contact"
            className="text-gray-300 hover:text-accent-red transition-colors"
          >
            Contato
          </Link>
        </div>
      </nav>
    </header>

    <main>{children}</main>
    <RecommendationChat />
  </div>
);

const Home = () => {
  return (
    <LandingPageLayout>
      <Head>
      <title>Frame24 | Gestao Inteligente para Cinemas</title>
      <meta
        name="description"
        content="A plataforma completa para gerenciar seu cinema — bilheteria, programacao, estoque e financeiro em um so lugar."
      />
      </Head>

      <HeroSection />
      <FeaturesSection />
      <PricingSection />
      <Footer />
    </LandingPageLayout>
  );
};

export default Home;
