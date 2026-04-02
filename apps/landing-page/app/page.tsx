import Head from "next/head";
import HeroSection from "@/components/HeroSection";
import FeaturesSection from "@/components/FeatureSection";
import PricingSection from "@/components/PricingSection";
import Footer from "@/components/Footer";
import React from "react";
import Link from "next/link";

const LandingPageLayout = ({ children }: { children: React.ReactNode }) => (
  <div className="min-h-screen bg-gray-950 text-gray-100">
    <header className="sticky top-0 z-20 bg-gray-950/90 backdrop-blur-md border-b border-gray-800">
      <nav className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
        {/* Logo */}
        <div className="flex items-center space-x-2">
          <div className="w-3 h-3 rounded-full bg-indigo-500 animate-pulse" />
          <p className="text-xl font-semibold tracking-wide text-white">
            Frame24
          </p>
        </div>

        {/* Links de navegação */}
        <div className="hidden md:flex items-center space-x-8 text-sm font-medium">
          <Link
            href="/auth/login"
            className="text-gray-300 hover:text-white transition-colors"
          >
            Entrar
          </Link>
          <Link
            href="#features"
            className="text-gray-300 hover:text-white transition-colors"
          >
            Funcionalidades
          </Link>
          <Link
            href="#pricing"
            className="text-gray-300 hover:text-white transition-colors"
          >
            Planos
          </Link>
          <Link
            href="#about"
            className="text-gray-300 hover:text-white transition-colors"
          >
            Sobre
          </Link>
          <Link
            href="#contact"
            className="text-gray-300 hover:text-white transition-colors"
          >
            Contato
          </Link>
        </div>
      </nav>
    </header>

    <main>{children}</main>
  </div>
);

const Home = () => {
  return (
    <LandingPageLayout>
      <Head>
        <title>Frame24 | ERP de Cinema Moderno</title>
        <meta
          name="description"
          content="O ERP Premier para gestão total de multiplexes e cinemas."
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
