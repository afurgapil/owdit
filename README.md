# Owdit - Smart Contract Security Analysis Platform

<div align="center">
  <img src="public/logo.png" alt="Owdit Logo" width="400" height="240"/>
  
  <h3>AI-Powered Smart Contract Security with Persistent MongoDB Caching</h3>
  
  <a href="https://nextjs.org/">
    <img src="https://img.shields.io/badge/Next.js-15-black?style=for-the-badge&logo=next.js" alt="Next.js" />
  </a>
  <a href="https://www.typescriptlang.org/">
    <img src="https://img.shields.io/badge/TypeScript-5-blue?style=for-the-badge&logo=typescript" alt="TypeScript" />
  </a>
  <a href="https://tailwindcss.com/">
    <img src="https://img.shields.io/badge/Tailwind_CSS-3-38B2AC?style=for-the-badge&logo=tailwind-css" alt="Tailwind CSS" />
  </a>
  <a href="https://www.mongodb.com/atlas">
    <img src="https://img.shields.io/badge/MongoDB-Atlas-green?style=for-the-badge&logo=mongodb" alt="MongoDB" />
  </a>
  <a href="https://0g.ai/">
    <img src="https://img.shields.io/badge/0G%20Labs-Inference-purple?style=for-the-badge" alt="0G Labs" />
  </a>
</div>

## 🚀 Overview

Owdit is a smart contract security analysis platform that combines bytecode/source analysis, optional AI inference, and a persistent MongoDB cache to protect your funds. It automatically scans contracts and serves comprehensive, repeatable reports without re-querying the chain.

### Key Features

- 🤖 **AI-Powered Analysis**: Optional 0G inference + heuristic/static checks
- ⚡ **Instant Results**: Fast results, cached to avoid repeat network calls
- 💾 **Persistent Cache**: MongoDB-backed caching with TTL and indexes
- 🔍 **Dual Analysis**: Works for verified and unverified contracts
- 🛡️ **Upgradeable Detection**: Upgradeable contracts are detected and not cached
- 📊 **History & Search**: Real-time history endpoint with pagination and search
- 🎨 **Modern UI**: Cyberpunk-themed, responsive interface

## 🏗️ Architecture

### Frontend

- **Next.js 15** with App Router
- **TypeScript**, **Tailwind CSS**, **Lucide React**
- **Context API** for network selection

### Backend

- **Next.js API Routes** for server functions
- **MongoDB Atlas** for persistent caching (unique + TTL indexes)
- **Sourcify/Etherscan** for source, RPC for bytecode
- **0G Compute (optional)** for AI inference

### Key Components

- **Contract Analysis Engine**: Bytecode and source pipelines
- **Cache Service**: Singleton MongoDB client, TTL, upgradeable skip
- **History API**: `/api/history` with pagination and search
- **Cache Stats API**: `/api/cache/stats` for observability

## 📋 Prerequisites

- **Node.js** 18+
- **npm** 9+
- **Git**

## 🚀 Quick Start

### 1. Clone the Repository

```bash
git clone https://github.com/afurgapil/owdit.git
cd owdit
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Environment Setup

Create a `.env.local` file in the project root:

```env
# MongoDB (required)
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/owdit?retryWrites=true&w=majority

# Etherscan (optional)
ETHERSCAN_API_KEY=your_etherscan_api_key

# Base URL (optional; used in some internal calls)
NEXT_PUBLIC_BASE_URL=http://localhost:3000

# Optional per-chain RPC overrides (e.g., RPC_URL_1, RPC_URL_11155111)
RPC_URL_{CHAIN_ID}=https://...

# 0G Network (optional; for AI inference)
PRIVATE_KEY=your_ethereum_private_key
RPC_0G=https://evmrpc-testnet.0g.ai
```

### 4. Start Development Server

```bash
npm run dev
```

Open http://localhost:3000 in your browser.

## 🔧 Detailed Setup

### MongoDB Atlas

1. Create a free cluster at MongoDB Atlas
2. Create a database user
3. Allow your IP (or 0.0.0.0/0 for development)
4. Copy the connection string to `MONGODB_URI`

### Optional: 0G Inference

1. Fund your wallet on the 0G testnet
2. Set `PRIVATE_KEY` and `RPC_0G`
3. Inference is called through the `/api/infer` route

## 🎯 Usage

### Analyze a Contract

1. Go to the ANALYZE page
2. Paste the contract address and select network
3. Click Analyze
   - Fetches source (verified) or bytecode (unverified)
   - Runs analysis (and optional AI inference)
   - Caches non-upgradeable results in MongoDB (TTL ~24h)
   - Returns a unified security report

### Demo Contracts (Sepolia)

- Verified: `0x56182792540295095ea6e269C6680E98FEAaC73E`
- Unverified: `0xCdd6D91F8122aDED891cA2bFBFc16dDaE5ee7d76`

### View History

1. Open the HISTORY page
2. Browse/search cached analyses
3. Click any item for details

### Learn

1. Open the LEARN page
2. Explore common vulnerabilities and real case studies
3. Follow best practices and guidance

## 🔍 Features Deep Dive

### AI-Powered Analysis

- Security score and qualitative reasoning
- Risk level classification and detection patterns
- Works with verified and unverified contracts

### Contract Analysis Types

#### Verified Contracts

- Source code and ABI interpretation
- Compiler version aware checks
- Library and inheritance graph insights

#### Unverified Contracts

- Bytecode selector extraction
- Opcode counters and risky pattern signatures

### Cache System

- MongoDB Atlas with unique index on `address + chainId`
- TTL index for automatic expiration (~24 hours)
- Upgradeable contracts are detected and not cached
- History and stats endpoints for observability

## 🛠️ Development

### Project Structure

```
src/
├── app/                    # Next.js App Router pages
│   ├── analyze/           # Contract analysis page
│   ├── history/           # Analysis history page
│   ├── learn/             # Educational content page
│   └── api/               # API routes
├── features/              # Feature-specific components
│   ├── analysisResult/    # Analysis display components
│   ├── contractSearch/    # Contract search functionality
│   └── learn/             # Learn page components
├── shared/                # Shared components and utilities
│   ├── components/        # Reusable UI components
│   ├── contexts/          # React contexts
│   └── lib/               # Utils, cache service, schemas
└── types/                 # TypeScript type definitions
```

### Scripts

- Dev: `npm run dev`
- Build: `npm run build`
- Start: `npm start`
- Lint: `npm run lint`

## 📝 License

This project is licensed under the MIT License. See `LICENSE` for details.

## 🤝 Contributing

Contributions and feedback are welcome. Feel free to open issues and PRs.

---

Owdit — The watchful owl for your smart contracts. 🔒🦉⚡
