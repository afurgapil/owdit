"use client";

import Link from "next/link";
import {
  Shield,
  Database,
  ArrowRight,
  CheckCircle,
  Cpu,
  Network,
  Brain,
  Lock,
} from "lucide-react";
import dynamic from "next/dynamic";

// Lazy load MatrixRain - not critical for LCP, loads after initial paint
const MatrixRain = dynamic(
  () =>
    import("../shared/components/MatrixRain").then((mod) => ({
      default: mod.MatrixRain,
    })),
  {
    ssr: false,
    loading: () => null,
  }
);

export default function HomePage() {
  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Matrix Rain Background - Lazy loaded */}
      <MatrixRain gridSize={32} minDurationSec={15} maxDurationSec={25} />

      {/* Grid Pattern Overlay */}
      <div className="grid-pattern absolute inset-0 pointer-events-none"></div>

      {/* Hero Section - LCP Critical Content */}
      <section className="pt-24 pb-20 px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="max-w-7xl mx-auto text-center">
          {/* Main Title - LCP Element */}
          <h1 className="text-6xl sm:text-7xl lg:text-8xl font-black mb-8 leading-tight">
            <span className="text-white block mb-2">SMART CONTRACT</span>
            <span className="block neon-text neon-blue">SECURITY SCORE</span>
          </h1>

          {/* Subtitle */}
          <p className="text-2xl text-gray-300 mb-16 max-w-5xl mx-auto leading-relaxed">
            The <span className="text-owl-gold font-bold">OWL</span> watches
            over your smart contracts. AI-powered security analysis with
            comprehensive security analysis and risk assessment.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-8 justify-center mb-16">
            <Link
              href="/analyze"
              className="flex items-center justify-center btn-cyberpunk px-12 py-6 text-xl rounded-xl hover-glow transform hover:scale-105 transition-all duration-300"
            >
              <span className="flex items-center">
                ANALYZE CONTRACT
                <ArrowRight className="ml-3 h-6 w-6" />
              </span>
            </Link>
            <Link
              href="/developers"
              className="px-12 py-6 text-xl font-bold rounded-xl border-3 border-neon-cyan text-neon-cyan hover:bg-neon-cyan transition-all duration-300 hover-glow transform hover:scale-105"
            >
              <span className="flex items-center">
                <Cpu className="mr-3 h-6 w-6" />
                DEVELOPER TOOLS
              </span>
            </Link>
            <Link
              href="/learn"
              className="px-12 py-6 text-xl font-bold rounded-xl border-3 border-neon-orange text-neon-orange hover:bg-neon-orange transition-all duration-300 hover-glow transform hover:scale-105"
            >
              <span className="flex items-center">
                <Brain className="mr-3 h-6 w-6" />
                LEARN SECURITY
              </span>
            </Link>
            <Link
              href="#how-it-works"
              className="px-12 py-6 text-xl font-bold rounded-xl border-3 border-neon-purple text-neon-purple hover:bg-neon-purple transition-all duration-300 hover-glow transform hover:scale-105"
            >
              <span className="flex items-center">
                <Database className="mr-3 h-6 w-6" />
                HOW IT WORKS
              </span>
            </Link>
          </div>

          {/* Trust Indicators */}
          <div className="flex flex-wrap justify-center gap-8 text-sm text-gray-400">
            <div className="flex items-center space-x-2">
              <Lock className="h-4 w-4 text-neon-green" />
              <span>AI-Powered Analysis</span>
            </div>
            <div className="flex items-center space-x-2">
              <Cpu className="h-4 w-4 text-neon-cyan" />
              <span>Developer Tools</span>
            </div>
            <div className="flex items-center space-x-2">
              <Shield className="h-4 w-4 text-neon-blue" />
              <span>Secure Analysis</span>
            </div>
            <div className="flex items-center space-x-2">
              <Database className="h-4 w-4 text-neon-purple" />
              <span>Permanent Results</span>
            </div>
          </div>
        </div>
      </section>

      {/* Problem & Solution */}
      <section className="py-24 px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-20 items-center">
            {/* Problem Card */}
            <div className="glass-card p-10 rounded-3xl neon-border-purple card-hover-glow-purple">
              <div className="flex items-center mb-8">
                <div className="p-4 bg-red-500/20 rounded-full mr-6">
                  <Cpu className="h-10 w-10 text-red-400" />
                </div>
                <h2 className="text-4xl font-bold text-white neon-text neon-pink">
                  THE PROBLEM
                </h2>
              </div>
              <h3 className="text-2xl font-bold text-neon-pink mb-6">
                Security Verification Complexity
              </h3>
              <p className="text-xl text-gray-300 mb-10 leading-relaxed">
                For individual users, verifying the reliability of smart
                contracts is a complex and time-consuming process. This
                technical task can expose users to security risks.
              </p>
              <ul className="space-y-6">
                <li className="flex items-center text-gray-300">
                  <CheckCircle className="h-7 w-7 text-red-400 mr-4" />
                  <span className="text-lg font-medium">
                    Lack of technical knowledge
                  </span>
                </li>
                <li className="flex items-center text-gray-300">
                  <CheckCircle className="h-7 w-7 text-red-400 mr-4" />
                  <span className="text-lg font-medium">
                    Time-consuming analysis process
                  </span>
                </li>
                <li className="flex items-center text-gray-300">
                  <CheckCircle className="h-7 w-7 text-red-400 mr-4" />
                  <span className="text-lg font-medium">
                    Difficulty finding reliable sources
                  </span>
                </li>
              </ul>
            </div>

            {/* Solution Card */}
            <div className="glass-card p-10 rounded-3xl neon-border-green card-hover-glow-green">
              <div className="flex items-center mb-8">
                <div className="p-4 bg-green-500/20 rounded-full mr-6">
                  <Network className="h-10 w-10 text-green-400" />
                </div>
                <h2 className="text-4xl font-bold text-white neon-text neon-green">
                  THE SOLUTION
                </h2>
              </div>
              <h3 className="text-2xl font-bold text-neon-green mb-6">
                AI + 0G Network
              </h3>
              <p className="text-xl text-gray-300 mb-10 leading-relaxed">
                The <span className="text-owl-gold font-bold">OWL</span>{" "}
                automatically scans contracts with AI-based security analysis
                and permanently stores results on the 0G Network.
              </p>
              <ul className="space-y-6">
                <li className="flex items-center text-gray-300">
                  <CheckCircle className="h-7 w-7 text-green-400 mr-4" />
                  <span className="text-lg font-medium">
                    Automatic AI analysis
                  </span>
                </li>
                <li className="flex items-center text-gray-300">
                  <CheckCircle className="h-7 w-7 text-green-400 mr-4" />
                  <span className="text-lg font-medium">Instant results</span>
                </li>
                <li className="flex items-center text-gray-300">
                  <CheckCircle className="h-7 w-7 text-green-400 mr-4" />
                  <span className="text-lg font-medium">
                    Comprehensive security analysis
                  </span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section
        id="how-it-works"
        className="py-24 px-4 sm:px-6 lg:px-8 relative z-10"
      >
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-20">
            <h2 className="text-5xl font-bold text-white mb-8 neon-text neon-blue">
              HOW THE OWL WORKS
            </h2>
            <p className="text-2xl text-gray-300 max-w-4xl mx-auto">
              Get your contract security score in 4 simple steps
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-12">
            {[
              {
                step: "1",
                title: "ENTER CONTRACT ADDRESS",
                description:
                  "Enter the Ethereum address of the smart contract you want the OWL to analyze",
                icon: Database,
                color: "text-neon-blue",
              },
              {
                step: "2",
                title: "DEVELOPER TOOLS",
                description:
                  "Use our developer tools to analyze your own contract code with AI-powered security analysis",
                icon: Cpu,
                color: "text-neon-cyan",
              },
              {
                step: "3",
                title: "AI ANALYSIS",
                description:
                  "The OWL's AI brain analyzes the contract code and generates a comprehensive security score",
                icon: Brain,
                color: "text-neon-purple",
              },
              {
                step: "4",
                title: "SCORE ANALYSIS",
                description:
                  "Get detailed security insights and recommendations for your smart contract",
                icon: Shield,
                color: "text-neon-green",
              },
            ].map((item, index) => (
              <div
                key={index}
                className="glass-card p-10 rounded-3xl text-center hover-glow transition-all duration-300 transform hover:scale-105"
              >
                <div className="flex justify-center mb-6">
                  <div className="w-40 h-40 flex items-center justify-center relative overflow-hidden rounded-2xl bg-linear-to-br from-black/40 to-black/20 border border-white/10">
                    <item.icon className={`w-20 h-20 ${item.color}`} />
                  </div>
                </div>
                <h3 className="text-xl font-bold text-white mb-6 neon-text">
                  {item.title}
                </h3>
                <p className="text-gray-300 leading-relaxed text-lg">
                  {item.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="max-w-6xl mx-auto text-center">
          <div className="glass-card p-16 rounded-3xl neon-border">
            <h2 className="text-5xl font-bold text-white mb-10 neon-text neon-blue">
              READY TO LET THE OWL WATCH OVER YOUR CONTRACTS?
            </h2>
            <p className="text-2xl text-gray-300 mb-12 max-w-4xl mx-auto">
              Get your first contract security score and join the future of
              decentralized security
            </p>
            <div className="flex flex-col sm:flex-row gap-6 justify-center">
              <Link
                href="/analyze"
                className="flex flex-row justify-center items-center btn-cyberpunk px-16 py-8 text-2xl rounded-xl hover-glow  transform hover:scale-105 transition-all duration-300"
              >
                <span className="flex flex-row justify-center items-center">
                  <p>START CONTRACT ANALYSIS</p>
                  <ArrowRight className="ml-4 h-8 w-8" />
                </span>
              </Link>
              <Link
                href="/developers"
                className="px-16 py-8 text-2xl font-bold rounded-xl border-3 border-neon-cyan text-neon-cyan hover:bg-neon-cyan transition-all duration-300 hover-glow inline-block transform hover:scale-105"
              >
                <span className="flex items-center">
                  <Cpu className="mr-4 h-8 w-8" />
                  DEVELOPER TOOLS
                </span>
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
