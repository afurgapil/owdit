# Owdit - Smart Contract Security Score

AI-powered smart contract security analysis platform with real-time contract verification and risk assessment.

## 🚀 Features

- **AI-Powered Analysis**: Automated security vulnerability detection
- **Real-time Contract Verification**: Instant source code and bytecode analysis
- **Real-time Scoring**: Instant security score generation
- **Transparent Results**: Verifiable analysis with detailed explanations
- **Cyberpunk UI**: Futuristic, dark-themed interface with Matrix Rain effects

## 🛠️ Tech Stack

- **Frontend**: Next.js 15, React 19, TypeScript
- **Styling**: Tailwind CSS with custom cyberpunk theme
- **Validation**: Zod schemas
- **Icons**: Lucide React
- **Blockchain**: EVM-compatible contract inspection (Sourcify/Etherscan sources, RPC bytecode fetch)

## 🏗️ Project Structure

```
src/
├── app/                    # Next.js App Router
│   ├── page.tsx          # Landing page
│   ├── analyze/          # Contract analysis
│   ├── history/          # Analysis history
│   └── api/              # API routes
├── shared/                # Shared components & utilities
│   ├── components/       # Reusable UI components (MatrixRain, Layout, etc.)
│   └── lib/             # Utilities, constants & schemas
└── features/             # Feature-based modules
    ├── contractSearch/   # Contract search functionality
    └── analysisResult/   # Analysis result display
```

## 🚀 Getting Started

1. **Clone the repository**

   ```bash
   git clone https://github.com/afurgapil/owdit.git
   cd owdit
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Run development server**

   ```bash
   npm run dev
   ```

4. **Open your browser**
   Navigate to [http://localhost:3000](http://localhost:3000)

## 🔧 Development

- **Build**: `npm run build`
- **Start**: `npm start`
- **Lint**: `npm run lint`

## 🔐 Environment Variables

Create a `.env.local` file in the root directory with the following variables:

```bash
# 0G Network Configuration
PRIVATE_KEY=your_ethereum_private_key_here
RPC_0G=https://evmrpc-testnet.0g.ai

# Optional: Base URL for API calls (defaults to localhost:3000)
NEXT_PUBLIC_BASE_URL=http://localhost:3000
```

**Important Notes:**

- `PRIVATE_KEY`: Your Ethereum private key for 0G Network transactions
- `RPC_0G`: 0G Galileo testnet RPC endpoint (Chain ID: 16601)
- Ensure your wallet has sufficient funds on 0G testnet for ledger operations

## 🌟 Key Components

- **Landing Page**: Problem/solution presentation with cyberpunk design
- **Matrix Rain**: Dynamic background animation
- **Analysis Interface**: Contract address input and AI analysis
- **Results Display**: Security score visualization and findings
- **History**: Previous analysis results and search functionality

## 🎨 Design Features

- **Cyberpunk Theme**: Dark background with neon accents
- **Glassmorphism**: Translucent card effects
- **Matrix Rain**: Animated background with flowing data
- **Neon Effects**: Subtle glow and border effects
- **Responsive**: Mobile-first design approach

## 🔮 Future Roadmap

- [ ] 0G Network integration
- [ ] AI model training and deployment
- [ ] Multi-chain support
- [ ] Web Extension

## 📄 License

© 2025 Owdit. All rights reserved.

## 🤝 Contributing

This project is currently in development. Contributions and feedback are welcome!

---

**OWDIT** - The Watchful Owl watches over your smart contracts. 🔒🦉⚡
