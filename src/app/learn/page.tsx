"use client";

import {
  AlertTriangle,
  Lock,
  Eye,
  Zap,
  Target,
  Database,
  ArrowRight,
  Brain,
} from "lucide-react";
import { MatrixRain } from "../../shared/components/MatrixRain";
import Link from "next/link";
import { VulnerabilityCard } from "../../features/learn/components/VulnerabilityCard";
import { FeatureCard } from "../../features/learn/components/FeatureCard";
import { CaseStudyCard } from "../../features/learn/components/CaseStudyCard";

export default function LearnPage() {
  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Matrix Rain Background */}
      <MatrixRain gridSize={24} minDurationSec={15} maxDurationSec={25} />

      {/* Grid Pattern Overlay */}
      <div className="grid-pattern absolute inset-0 pointer-events-none"></div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 py-16">
        {/* Header */}
        <div className="text-center mb-20">
          <div className="flex justify-center mb-8">
            <div className="p-6 bg-gradient-to-r from-neon-blue to-neon-purple rounded-full glow-blue">
              <Brain className="h-16 w-16 text-white" />
            </div>
          </div>
          <h1 className="text-5xl font-bold text-white mb-6 neon-text neon-blue">
            Why Smart Contract Security Matters
          </h1>
          <p className="text-xl text-gray-300 max-w-4xl mx-auto leading-relaxed">
            Smart contracts can be vulnerable to errors or malicious backdoors.
            Professional analysis is essential before entrusting your funds.
          </p>
        </div>

        {/* The Reality Section */}
        <section className="mb-20">
          <div className="glass-card p-12 rounded-3xl neon-border-red">
            <div className="text-center mb-12">
              <div className="flex justify-center mb-6">
                <div className="p-4 bg-red-500/20 rounded-full">
                  <AlertTriangle className="h-12 w-12 text-red-400" />
                </div>
              </div>
              <h2 className="text-4xl font-bold text-white mb-6 neon-text neon-red">
                THE HARSH REALITY
              </h2>
              <p className="text-2xl text-gray-300 max-w-4xl mx-auto">
                Breaches continue and the target is mostly EVM-based DeFi.
                Backdoors and permission errors are the most devastating class.
              </p>
            </div>

            {/* Statistics Grid (Updated) */}
            <div className="grid md:grid-cols-3 gap-8 mb-12">
              <div className="text-center">
                <div className="text-5xl font-bold text-red-400 mb-2">
                  $2.17B+
                </div>
                <div className="text-gray-300">
                  Crypto stolen in first half of 2025 (YTD)
                </div>
              </div>
              <div className="text-center">
                <div className="text-5xl font-bold text-red-400 mb-2">303</div>
                <div className="text-gray-300">
                  Hack incidents detected in 2024
                </div>
              </div>
              <div className="text-center">
                <div className="text-5xl font-bold text-red-400 mb-2">82%</div>
                <div className="text-gray-300">
                  Of stolen funds from DeFi protocols in 2022
                </div>
              </div>
            </div>

            <div className="text-center">
              <Link
                href="/analyze"
                className="btn-cyberpunk px-8 py-4 text-lg rounded-xl hover-glow inline-block transform hover:scale-105 transition-all duration-300"
              >
                <span className="flex items-center">
                  PROTECT YOUR FUNDS
                  <ArrowRight className="ml-3 h-5 w-5" />
                </span>
              </Link>
            </div>
          </div>
        </section>

        {/* Common Vulnerabilities — Backdoor-first */}
        <section className="mb-20">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-white mb-6 neon-text neon-orange">
              Critical Vulnerability Classes (EVM)
            </h2>
            <p className="text-xl text-gray-300 max-w-3xl mx-auto">
              Backdoors and access errors are the biggest risk. The following
              topics summarize the most frequently exploited paths.
            </p>
          </div>

          <div className="grid lg:grid-cols-2 gap-8">
            <VulnerabilityCard
              icon={Zap}
              title="Uninitialized Proxy"
              description="If an ERC1967/UUPS proxy is deployed and not initialized within the same transaction, an attacker can perform the first initialization and take control of admin/implementation. This provides permanent control with backdoor characteristics."
              risks={[
                "Hidden logic can be injected through upgrades",
                "Explorers can be misdirected (spoofing)",
                "Mass exploitation examples seen (2025)",
              ]}
              borderColor="neon-border-red card-hover-glow-red"
              iconColor="text-red-400"
              iconBgColor="bg-red-500/20"
            />

            <VulnerabilityCard
              icon={Target}
              title="Hidden Mint / Transfer Backdoors"
              description="Hidden mint/burn or transfer restrictions in token contracts, hooks like tax/limit variables that grant privileges to a single address, are used for rug-pulls."
              risks={[
                "Liquidity can be drained in one move",
                "Can be well hidden in source code (obfuscation)",
                "Static analysis + behavior analysis required",
              ]}
              borderColor="neon-border-orange card-hover-glow-orange"
              iconColor="text-orange-400"
              iconBgColor="bg-orange-500/20"
            />

            <VulnerabilityCard
              icon={Lock}
              title="Access Control Issues"
              description="Wrong permissions in admin/role modules (ownerless, anyone can call, proxy admin confusion) lead to takeover of funds or ownership."
              risks={[
                "Admin functions can be opened to everyone",
                "Parameters/supply can be tampered with",
                "Commonly seen in upgradeable architectures",
              ]}
              borderColor="neon-border-pink card-hover-glow-pink"
              iconColor="text-pink-400"
              iconBgColor="bg-pink-500/20"
            />

            <VulnerabilityCard
              icon={Eye}
              title="MEV / Front-running"
              description="Transactions are visible in the mempool. Bots can get ahead with higher gas (or sandwich) and take your profit. Design measures (commit-reveal, batched auctions) are required."
              risks={[
                "Price manipulation and slippage loss",
                "Very common in DEXs",
                "Not a code error; design risk",
              ]}
              borderColor="neon-border-purple card-hover-glow-purple"
              iconColor="text-purple-400"
              iconBgColor="bg-purple-500/20"
            />
          </div>
        </section>

        {/* Why Owdit Section */}
        <section className="mb-20">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-white mb-6 neon-text neon-green">
              Why Owdit?
            </h2>
            <p className="text-xl text-gray-300 max-w-3xl mx-auto">
              Our AI-powered scans reveal backdoors and risk patterns that
              manual reviews miss.
            </p>
          </div>

          <div className="grid lg:grid-cols-3 gap-8">
            <FeatureCard
              icon={Brain}
              title="AI-Powered Analysis"
              description="Generates context-aware risk scores from bytecode + source code + behavior signals."
              features={[
                "Backdoor/pattern recognition",
                "Proxy/upgrade flow awareness",
                "Continuously updated knowledge base",
              ]}
              borderColor="neon-border-blue card-hover-glow-blue"
              iconColor="text-neon-blue"
              iconBgColor="bg-neon-blue/10"
            />

            <FeatureCard
              icon={Zap}
              title="Instant Results"
              description="Detailed reports in seconds for verified/unverified contracts."
              features={[
                "Real-time scanning",
                "Actionable recommendations",
                "Upgrade/role security checks",
              ]}
              borderColor="neon-border-purple card-hover-glow-purple"
              iconColor="text-neon-purple"
              iconBgColor="bg-neon-purple/10"
            />

            <FeatureCard
              icon={Database}
              title="Permanent Storage"
              description="All analyses are stored, change impact is tracked with version control."
              features={[
                "Always accessible",
                "Version comparison",
                "Historical risk trends",
              ]}
              borderColor="neon-border-green card-hover-glow-green"
              iconColor="text-neon-green"
              iconBgColor="bg-neon-green/10"
            />
          </div>
        </section>

        {/* Real Examples Section — Updated */}
        <section className="mb-20">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-white mb-6 neon-text neon-pink">
              Recent Real-World Case Studies
            </h2>
            <p className="text-xl text-gray-300 max-w-3xl mx-auto">
              Explore some of the most recent smart contract exploits in 2025—
              especially proxy-based backdoors and critical logic flaws.
            </p>
          </div>

          <div className="space-y-8">
            <CaseStudyCard
              title="Kinto (2025) — Proxy Backdoor Exploit"
              amount="~$1.55M Stolen"
              description="The attacker became the first to initialize an uninitialized ERC-1967 proxy contract, gaining admin rights and injecting a malicious implementation. They minted tokens and drained funds from pools."
              link={{
                text: "Sample Contract (Arbitrum)",
                url: "https://arbiscan.io/address/0x010700AB046Dd8e92b0e3587842080Df36364ed3",
              }}
              borderColor="neon-border-red"
              iconColor="text-red-400"
              iconBgColor="bg-red-500/20"
              amountColor="text-red-400"
              amountBgColor="bg-red-900/30"
            />

            <CaseStudyCard
              title="Large-Scale Proxy Backdoor Campaign"
              amount="Potential $10M+ Impact"
              description="Over the course of several months, attackers targeted thousands of uninitialized proxy contracts. A joint 'war-room' effort by security teams prevented critical funds from being lost."
              source="Source: Venn Network & Dedaub reports (July 2025)"
              borderColor="neon-border-orange"
              iconColor="text-orange-400"
              iconBgColor="bg-orange-500/20"
              amountColor="text-orange-400"
              amountBgColor="bg-orange-900/30"
            />

            <CaseStudyCard
              title="SuperRare Staking Hack (2025)"
              amount="~$731K RARE Stolen"
              description="A vulnerability in the SuperRare NFT staking contract enabled an attacker to steal approximately $731,000 worth of RARE tokens."
              source="Source: Web3IsGoingGreat report (July 2025)"
              borderColor="neon-border-purple"
              iconColor="text-purple-400"
              iconBgColor="bg-purple-500/20"
              amountColor="text-purple-400"
              amountBgColor="bg-purple-900/30"
            />
          </div>
        </section>

        {/* CTA Section */}
        <section className="text-center">
          <div className="glass-card p-16 rounded-3xl neon-border">
            <h2 className="text-5xl font-bold text-white mb-10 neon-text neon-blue">
              DON&apos;T BE THE NEXT VICTIM
            </h2>
            <p className="text-2xl text-gray-300 mb-12 max-w-4xl mx-auto">
              Scan your contract now with Owdit. Catch backdoor, access and
              proxy risks live; fix instantly with recommendations.
            </p>
            <div className="flex flex-col sm:flex-row gap-6 justify-center">
              <Link
                href="/analyze"
                className="btn-cyberpunk px-12 py-6 text-xl rounded-xl hover-glow inline-block transform hover:scale-105 transition-all duration-300"
              >
                <span className="flex items-center">
                  ANALYZE YOUR CONTRACT
                  <ArrowRight className="ml-3 h-6 w-6" />
                </span>
              </Link>
              <Link
                href="/history"
                className="flex items-center justify-center px-12 py-6 text-xl font-bold rounded-xl border-2 border-neon-purple text-neon-purple hover:bg-neon-purple hover:text-white transition-all duration-300 hover-glow transform hover:scale-105"
              >
                <span className="flex items-center">
                  <Database className="mr-3 h-6 w-6" />
                  VIEW ANALYSIS HISTORY
                </span>
              </Link>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
