'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, X, Plus, LayoutGrid, Home, Gavel, ChevronDown, Vote, History, Filter, Sun, Moon } from 'lucide-react';
import { WalletConnect } from '@/components/wallet/WalletConnect';
import { useWalletStore } from '@/stores/walletStore';
import { useThemeStore } from '@/stores/themeStore';

const navLinks = [
  { href: '/', label: 'Home', icon: Home },
  { href: '/campaigns', label: 'Campaigns', icon: LayoutGrid },
  { href: '/auctions', label: 'Auctions', icon: Gavel },
  { href: '/history', label: 'History', icon: History },
];

export function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const [filterOptions, setFilterOptions] = useState({ history: true });
  const [scrolled, setScrolled] = useState(false);
  const createRef = useRef<HTMLDivElement>(null);
  const filterRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();
  const { isConnected } = useWalletStore();
  const { theme, setTheme, resolvedTheme } = useThemeStore();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (createRef.current && !createRef.current.contains(e.target as Node)) setCreateOpen(false);
      if (filterRef.current && !filterRef.current.contains(e.target as Node)) setFilterOpen(false);
    };
    document.addEventListener('click', close);
    return () => document.removeEventListener('click', close);
  }, []);

  return (
    <header className="fixed top-0 left-0 right-0 z-50">
      <motion.div
        className={`border-b transition-all duration-300 ${
          scrolled
            ? 'border-white/[0.06] bg-[rgba(10,10,15,0.7)] backdrop-blur-[12px] shadow-lg shadow-black/10'
            : 'border-white/[0.08] bg-[rgba(10,10,15,0.85)] backdrop-blur-md'
        }`}
        initial={false}
        animate={{ opacity: 1 }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 md:h-20">
            <Link href="/" className="flex items-center gap-3">
              <img src="/logo.svg" alt="" className="w-10 h-10 rounded-xl" width={40} height={40} />
              <span className="text-xl font-bold text-white hidden sm:block">Privote</span>
            </Link>

            <nav className="hidden md:flex items-center gap-1">
              {navLinks.map((link) => {
                const isActive = pathname === link.href;
                const Icon = link.icon;
                return (
                  <Link key={link.href} href={link.href}>
                    <motion.div
                      className={`flex items-center gap-2 px-4 py-2.5 rounded-[12px] transition-colors ${
                        isActive ? 'text-white bg-white/10' : 'text-white/60 hover:text-white hover:bg-white/5'
                      }`}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <Icon className="w-4 h-4" />
                      <span className="font-medium">{link.label}</span>
                    </motion.div>
                  </Link>
                );
              })}

              {/* Filter dropdown - single form with checkboxes */}
              <div ref={filterRef} className="relative">
                <motion.button
                  onClick={() => setFilterOpen(!filterOpen)}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-[12px] transition-colors ${
                    filterOpen ? 'text-white bg-white/10' : 'text-white/60 hover:text-white hover:bg-white/5'
                  }`}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <Filter className="w-4 h-4" />
                  <span className="font-medium">Filter</span>
                  <ChevronDown className={`w-4 h-4 transition-transform ${filterOpen ? 'rotate-180' : ''}`} />
                </motion.button>
                <AnimatePresence>
                  {filterOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: -8, scale: 0.96 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -8, scale: 0.96 }}
                      transition={{ duration: 0.2 }}
                      className="absolute top-full right-0 mt-2 w-56 rounded-[12px] border border-white/[0.08] bg-[rgba(15,15,22,0.95)] backdrop-blur-[12px] shadow-xl overflow-hidden p-4"
                    >
                      <p className="text-xs font-medium text-white/50 mb-3">Show</p>
                      <label className="flex items-center gap-3 py-2 cursor-pointer hover:bg-white/5 rounded-lg px-2 -mx-2 transition-colors">
                        <input
                          type="checkbox"
                          checked={filterOptions.history}
                          onChange={(e) => setFilterOptions((p) => ({ ...p, history: e.target.checked }))}
                          className="rounded border-white/20 bg-white/5 text-emerald-500 focus:ring-emerald-500/50"
                        />
                        <History className="w-4 h-4 text-white/60" />
                        <span className="font-medium text-white/80">History</span>
                      </label>
                      <Link href="/history" onClick={() => setFilterOpen(false)}>
                        <div className="mt-2 pt-2 border-t border-white/[0.06] text-sm text-emerald-400 hover:text-emerald-300">
                          Apply & go to History →
                        </div>
                      </Link>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {isConnected && (
                <div ref={createRef} className="relative">
                  <motion.button
                    onClick={() => setCreateOpen(!createOpen)}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-[12px] transition-colors ${
                      pathname === '/create' || pathname === '/auctions/create'
                        ? 'text-white bg-emerald-500/20 border border-emerald-500/30'
                        : 'text-white/60 hover:text-white hover:bg-white/5'
                    }`}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <Plus className="w-4 h-4" />
                    <span className="font-medium">Create</span>
                    <ChevronDown className={`w-4 h-4 transition-transform ${createOpen ? 'rotate-180' : ''}`} />
                  </motion.button>
                  <AnimatePresence>
                    {createOpen && (
                      <motion.div
                        initial={{ opacity: 0, y: -8, scale: 0.96 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -8, scale: 0.96 }}
                        transition={{ duration: 0.2 }}
                        className="absolute top-full right-0 mt-2 w-52 rounded-[12px] border border-white/[0.08] bg-[rgba(15,15,22,0.95)] backdrop-blur-[12px] shadow-xl overflow-hidden"
                      >
                        <Link href="/create" onClick={() => setCreateOpen(false)}>
                          <div className="flex items-center gap-3 px-4 py-3 text-white/80 hover:bg-white/5 hover:text-white transition-colors">
                            <Vote className="w-4 h-4 text-emerald-400" />
                            <span className="font-medium">Create Campaign</span>
                          </div>
                        </Link>
                        <Link href="/auctions/create" onClick={() => setCreateOpen(false)}>
                          <div className="flex items-center gap-3 px-4 py-3 text-white/80 hover:bg-white/5 hover:text-white transition-colors border-t border-white/[0.06]">
                            <Gavel className="w-4 h-4 text-emerald-400" />
                            <span className="font-medium">Create Auction</span>
                          </div>
                        </Link>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}
            </nav>

            <div className="hidden md:flex items-center gap-4">
              <motion.button
                onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
                className="p-2.5 rounded-[12px] bg-white/5 border border-white/10 hover:bg-white/10 transition-colors"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                aria-label="Toggle theme"
              >
                {resolvedTheme === 'dark' ? <Sun className="w-4 h-4 text-white/70" /> : <Moon className="w-4 h-4 text-gray-700" />}
              </motion.button>
              <WalletConnect />
            </div>

            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 rounded-[12px] hover:bg-white/5 transition-colors"
            >
              {mobileMenuOpen ? <X className="w-6 h-6 text-white" /> : <Menu className="w-6 h-6 text-white" />}
            </button>
          </div>
        </div>
      </motion.div>

      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden border-b border-white/[0.08] bg-[rgba(10,10,15,0.95)] backdrop-blur-[12px] overflow-hidden"
          >
            <div className="px-4 py-4 space-y-2">
              {navLinks.map((link) => {
                const isActive = pathname === link.href;
                const Icon = link.icon;
                return (
                  <Link key={link.href} href={link.href} onClick={() => setMobileMenuOpen(false)}>
                    <motion.div
                      className={`flex items-center gap-3 px-4 py-3 rounded-[12px] transition-colors ${
                        isActive ? 'bg-white/10 text-white' : 'text-white/60 hover:text-white hover:bg-white/5'
                      }`}
                      whileTap={{ scale: 0.98 }}
                    >
                      <Icon className="w-5 h-5" />
                      <span className="font-medium">{link.label}</span>
                    </motion.div>
                  </Link>
                );
              })}
              <div className="py-3 px-4 border-t border-white/10">
                <p className="text-xs font-medium text-white/50 mb-2">Filter</p>
                <label className="flex items-center gap-3 py-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={filterOptions.history}
                    onChange={(e) => setFilterOptions((p) => ({ ...p, history: e.target.checked }))}
                    className="rounded border-white/20 bg-white/5 text-emerald-500"
                  />
                  <span className="font-medium text-white/80">History</span>
                </label>
              </div>
              {isConnected && (
                <>
                  <Link href="/create" onClick={() => setMobileMenuOpen(false)}>
                    <motion.div
                      className="flex items-center gap-3 px-4 py-3 rounded-[12px] text-white/60 hover:text-white hover:bg-white/5 transition-colors"
                      whileTap={{ scale: 0.98 }}
                    >
                      <Vote className="w-5 h-5 text-emerald-400" />
                      <span className="font-medium">Create Campaign</span>
                    </motion.div>
                  </Link>
                  <Link href="/auctions/create" onClick={() => setMobileMenuOpen(false)}>
                    <motion.div
                      className="flex items-center gap-3 px-4 py-3 rounded-[12px] text-white/60 hover:text-white hover:bg-white/5 transition-colors"
                      whileTap={{ scale: 0.98 }}
                    >
                      <Gavel className="w-5 h-5 text-emerald-400" />
                      <span className="font-medium">Create Auction</span>
                    </motion.div>
                  </Link>
                </>
              )}
              <div className="pt-4 border-t border-white/10 flex items-center gap-3">
                <motion.button
                  onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
                  className="p-2.5 rounded-[12px] bg-white/5 border border-white/10"
                  whileTap={{ scale: 0.98 }}
                  aria-label="Toggle theme"
                >
                  {resolvedTheme === 'dark' ? <Sun className="w-4 h-4 text-white/70" /> : <Moon className="w-4 h-4 text-gray-700" />}
                </motion.button>
                <WalletConnect />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
