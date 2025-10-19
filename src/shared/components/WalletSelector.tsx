"use client";

import { useState, useEffect } from "react";
import { X, Wallet, Monitor } from "lucide-react";
import { useConnect, useAccount } from "wagmi";

interface WalletSelectorProps {
  isOpen: boolean;
  onClose: () => void;
}

export function WalletSelector({ isOpen, onClose }: WalletSelectorProps) {
  const { connect, connectors, isPending } = useConnect();
  const { isConnected } = useAccount();
  const [selectedConnector, setSelectedConnector] = useState<string | null>(null);

  const handleConnect = (connector: { id: string }) => {
    setSelectedConnector(connector.id);
    connect({ connector });
  };

  // Modal'ı bağlantı tamamlandığında kapat
  useEffect(() => {
    if (isConnected && isOpen) {
      onClose();
    }
  }, [isConnected, isOpen, onClose]);

  const getConnectorIcon = (connectorId: string) => {
    switch (connectorId) {
      case "injected":
        return <Monitor className="h-6 w-6" />;
      default:
        return <Wallet className="h-6 w-6" />;
    }
  };

  const getConnectorName = (connector: { id: string; name?: string }) => {
    switch (connector.id) {
      case "injected":
        return "Browser Wallet";
      default:
        return connector.name || "Unknown Wallet";
    }
  };

  const getConnectorDescription = (connectorId: string) => {
    switch (connectorId) {
      case "injected":
        return "Connect using MetaMask, Coinbase Wallet, or other browser extensions";
      default:
        return "Connect your wallet";
    }
  };

  if (!isOpen) return null;

  // Main Wallet Selector UI
  return (
    <div className="fixed inset-0 z-50 grid place-items-center min-h-screen">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative z-10 bg-gray-900/95 backdrop-blur-xl border border-neon-blue/30 rounded-2xl p-8 max-w-md w-full mx-4 shadow-2xl shadow-neon-blue/20">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-white">Connect Wallet</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors duration-200 p-2 hover:bg-gray-800 rounded-lg"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Description */}
        <p className="text-gray-300 mb-6 text-center">
          Choose how you&apos;d like to connect your wallet
        </p>

        {/* Wallet Options */}
        <div className="space-y-3">
          {connectors.map((connector) => (
            <button
              key={connector.id}
              onClick={() => handleConnect(connector)}
              disabled={isPending && selectedConnector === connector.id}
              className="w-full flex items-center space-x-4 p-4 bg-gray-800/50 hover:bg-gray-800 border border-gray-700 hover:border-neon-blue/50 rounded-xl transition-all duration-300 group disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <div className="flex-shrink-0 p-2 bg-neon-blue/10 rounded-lg group-hover:bg-neon-blue/20 transition-colors duration-300">
                {getConnectorIcon(connector.id)}
              </div>
              <div className="flex-1 text-left">
                <h3 className="text-white font-semibold group-hover:text-neon-blue transition-colors duration-300">
                  {getConnectorName(connector)}
                </h3>
                <p className="text-sm text-gray-400 group-hover:text-gray-300 transition-colors duration-300">
                  {getConnectorDescription(connector.id)}
                </p>
              </div>
              {isPending && selectedConnector === connector.id && (
                <div className="flex-shrink-0">
                  <div className="animate-spin rounded-full h-5 w-5 border-2 border-neon-blue border-t-transparent" />
                </div>
              )}
            </button>
          ))}
        </div>

        {/* Footer */}
        <div className="mt-6 pt-4 border-t border-gray-700">
          <p className="text-xs text-gray-500 text-center">
            By connecting a wallet, you agree to our Terms of Service and Privacy Policy
          </p>
        </div>
      </div>
    </div>
  );
}
