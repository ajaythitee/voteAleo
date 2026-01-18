'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { LogOut, ChevronDown, Copy, ExternalLink, Check, Wallet } from 'lucide-react';
import { useWallet } from '@demox-labs/aleo-wallet-adapter-react';
import { WalletMultiButton } from '@demox-labs/aleo-wallet-adapter-reactui';
import { useWalletStore } from '@/stores/walletStore';
import { useToastStore } from '@/stores/toastStore';

export function WalletConnect() {
  const [showDropdown, setShowDropdown] = useState(false);
  const [copied, setCopied] = useState(false);

  const { wallet, publicKey, connected, connecting, disconnect } = useWallet();
  const { setConnected, setDisconnected, setConnecting } = useWalletStore();
  const { success, error: showError } = useToastStore();

  // Sync wallet adapter state with our store
  useEffect(() => {
    if (connected && publicKey) {
      const walletName = wallet?.adapter?.name?.toLowerCase() || 'unknown';
      const walletType = walletName.includes('leo') ? 'leo' : walletName.includes('puzzle') ? 'puzzle' : 'leo';
      setConnected(publicKey, 'testnet', walletType as 'leo' | 'puzzle');
    } else if (!connected && !connecting) {
      setDisconnected();
    }
  }, [connected, publicKey, wallet, connecting, setConnected, setDisconnected]);

  useEffect(() => {
    setConnecting(connecting);
  }, [connecting, setConnecting]);

  const handleDisconnect = async () => {
    try {
      await disconnect();
      setShowDropdown(false);
      success('Wallet Disconnected', 'Your wallet has been disconnected');
    } catch (err: any) {
      showError('Disconnect Failed', err.message);
    }
  };

  const copyAddress = () => {
    if (publicKey) {
      navigator.clipboard.writeText(publicKey);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const truncateAddress = (addr: string) => {
    return `${addr.slice(0, 8)}...${addr.slice(-6)}`;
  };

  // If connected, show custom dropdown with disconnect option
  if (connected && publicKey) {
    const walletName = wallet?.adapter?.name || 'Wallet';

    return (
      <div className="relative">
        <motion.button
          onClick={() => setShowDropdown(!showDropdown)}
          className="flex items-center gap-3 px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          <Wallet className="w-5 h-5 text-indigo-400" />
          <span className="text-white font-medium">{truncateAddress(publicKey)}</span>
          <ChevronDown className={`w-4 h-4 text-white/70 transition-transform ${showDropdown ? 'rotate-180' : ''}`} />
        </motion.button>

        <AnimatePresence>
          {showDropdown && (
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.95 }}
              className="absolute right-0 mt-2 w-64 glass-card p-2 z-50"
            >
              <div className="p-3 border-b border-white/10">
                <p className="text-xs text-white/50 mb-1">Connected with {walletName}</p>
                <p className="text-sm text-white font-mono">{truncateAddress(publicKey)}</p>
              </div>

              <button
                onClick={copyAddress}
                className="w-full flex items-center gap-3 p-3 hover:bg-white/5 rounded-lg transition-colors"
              >
                {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4 text-white/70" />}
                <span className="text-white/70">{copied ? 'Copied!' : 'Copy Address'}</span>
              </button>

              <a
                href={`https://testnet.aleoscan.io/address/${publicKey}`}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full flex items-center gap-3 p-3 hover:bg-white/5 rounded-lg transition-colors"
              >
                <ExternalLink className="w-4 h-4 text-white/70" />
                <span className="text-white/70">View on Explorer</span>
              </a>

              <button
                onClick={handleDisconnect}
                className="w-full flex items-center gap-3 p-3 hover:bg-red-500/10 rounded-lg transition-colors text-red-400"
              >
                <LogOut className="w-4 h-4" />
                <span>Disconnect</span>
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Click outside to close */}
        {showDropdown && (
          <div
            className="fixed inset-0 z-40"
            onClick={() => setShowDropdown(false)}
          />
        )}
      </div>
    );
  }

  // Use the wallet adapter's multi-button for connection
  return (
    <div className="wallet-adapter-button-wrapper">
      <WalletMultiButton />
    </div>
  );
}
