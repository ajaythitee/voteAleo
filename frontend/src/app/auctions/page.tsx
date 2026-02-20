'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Gavel, ArrowRight, RefreshCw, PlusCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import { GlassCard } from '@/components/ui/GlassCard';
import { GlassButton } from '@/components/ui/GlassButton';
import { Badge } from '@/components/ui/Badge';
import { SkeletonCard } from '@/components/ui/LoadingSpinner';
import { useWalletStore } from '@/stores/walletStore';
import { auctionService } from '@/services/auction';

type AuctionRow = { auctionId: string; index: number; data: unknown };

function parseAuctionData(data: unknown): { name: string; startingBid: number } {
  if (data && typeof data === 'object' && 'starting_bid' in (data as object)) {
    const d = data as { starting_bid?: number; name?: string };
    return {
      name: d.name != null ? String(d.name) : 'Untitled',
      startingBid: Number(d.starting_bid) || 0,
    };
  }
  return { name: 'Untitled', startingBid: 0 };
}

export default function AuctionsPage() {
  const [list, setList] = useState<AuctionRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { isConnected } = useWalletStore();

  const load = async () => {
    setIsLoading(true);
    try {
      const items = await auctionService.listPublicAuctions();
      setList(items);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  return (
    <div className="min-h-screen pb-20">
      <section className="pt-8 pb-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-10">
            <div>
              <h1 className="text-3xl font-bold text-white mb-2">Public Auctions</h1>
              <p className="text-white/60">
                First-price sealed-bid auctions. Place public or private bids on Aleo.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <GlassButton variant="secondary" icon={<RefreshCw className="w-4 h-4" />} onClick={load} disabled={isLoading}>
                Refresh
              </GlassButton>
              {isConnected && (
                <Link href="/auctions/create">
                  <GlassButton icon={<PlusCircle className="w-4 h-4" />}>Create Auction</GlassButton>
                </Link>
              )}
            </div>
          </div>

          {isLoading ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <SkeletonCard key={i} />
              ))}
            </div>
          ) : list.length === 0 ? (
            <GlassCard className="p-12 text-center">
              <Gavel className="w-16 h-16 text-white/20 mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-white mb-2">No auctions yet</h2>
              <p className="text-white/60 mb-6">Create the first public auction.</p>
              {isConnected && (
                <Link href="/auctions/create">
                  <GlassButton icon={<Gavel className="w-5 h-5" />}>Create Auction</GlassButton>
                </Link>
              )}
            </GlassCard>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {list.map((a, i) => {
                const { name, startingBid } = parseAuctionData(a.data);
                return (
                  <Link key={a.auctionId} href={`/auctions/${encodeURIComponent(a.auctionId)}`}>
                    <motion.div
                      initial={{ opacity: 0, y: 16 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.04 }}
                    >
                      <GlassCard hover className="h-full p-6 flex flex-col">
                        <div className="flex items-start justify-between mb-3">
                          <span className="text-xs text-white/50">#{a.index}</span>
                          <Badge variant="active">Open</Badge>
                        </div>
                        <h3 className="text-lg font-semibold text-white mb-2 line-clamp-2">{name}</h3>
                        <p className="text-sm text-white/60 mb-4">
                          Starting bid: <span className="text-emerald-400">{startingBid} credits</span>
                        </p>
                        <div className="mt-auto flex items-center text-emerald-400 text-sm">
                          <span>View & place bid</span>
                          <ArrowRight className="w-4 h-4 ml-1" />
                        </div>
                      </GlassCard>
                    </motion.div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
