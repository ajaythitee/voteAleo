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
          className="flex items-center gap-3 px-4 py-2.5 rounded-xl bg-gradient-to-r from-indigo-500/20 to-purple-500/20 border border-indigo-500/30 hover:border-indigo-400/50 transition-all"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
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
              className="absolute right-0 mt-2 w-72 rounded-xl bg-[#0a0a1a]/95 backdrop-blur-xl border border-white/10 p-3 z-50 shadow-2xl"
            >
              {/* Connected Status */}
              <div className="p-3 mb-2 rounded-lg bg-gradient-to-r from-green-500/10 to-emerald-500/10 border border-green-500/20">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-2 h-2 rounded-full bg-green-400" />
                  <p className="text-xs text-green-400 font-medium">Connected to {walletName}</p>
                </div>
                <p className="text-sm text-white font-mono break-all">{publicKey}</p>
              </div>

              {/* Actions */}
              <div className="space-y-1">
                <button
                  onClick={copyAddress}
                  className="w-full flex items-center gap-3 p-3 hover:bg-white/5 rounded-lg transition-colors"
                >
                  {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4 text-white/50" />}
                  <span className="text-white/80">{copied ? 'Copied!' : 'Copy Address'}</span>
                </button>

                <a
                  href={`https://testnet.aleoscan.io/address/${publicKey}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full flex items-center gap-3 p-3 hover:bg-white/5 rounded-lg transition-colors"
                >
                  <ExternalLink className="w-4 h-4 text-white/50" />
                  <span className="text-white/80">View on Explorer</span>
                </a>

                <div className="border-t border-white/10 my-2" />

                <button
                  onClick={handleDisconnect}
                  className="w-full flex items-center gap-3 p-3 hover:bg-red-500/10 rounded-lg transition-colors"
                >
                  <LogOut className="w-4 h-4 text-red-400" />
                  <span className="text-red-400">Disconnect</span>
                </button>
              </div>
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
