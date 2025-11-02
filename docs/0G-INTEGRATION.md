# 0G Integration

Owdit uses the 0G Serving Broker to access LLM inference and pay-as-you-go billing directly with on-chain assets (no web2 payment rails).

## Why Broker-Based

- Unified access to multiple models via 0G
- Wallet-based payments; users already hold on-chain assets
- No dapp-specific contracts required

## Environment Variables

```env
# Wallet that pays for brokered inference on 0G
a) PRIVATE_KEY=your_ethereum_private_key
# 0G EVM RPC (testnet acceptable)
b) "https://evmrpc.0g.ai"  // Mainnet
   "https://evmrpc-testnet.0g.ai";  // Testnet
```

## Request Flow

1. Extract features from source/bytecode analysis
2. POST features to the internal `/api/contract-analysis/infer`
3. Server calls 0G Serving Broker and obtains score + narrative
4. Deterministic fallbacks are used if 0G is unavailable


