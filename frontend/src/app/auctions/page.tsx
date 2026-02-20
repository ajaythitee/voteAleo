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
import { aleoService } from '@/services/aleo';
import { pinataService } from '@/services/pinata';

type AuctionRow = { auctionId: string; index: number; data: unknown };
type AuctionMeta = { name?: string; description?: string; imageUrl?: string };

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
  const [metaById, setMetaById] = useState<Record<string, AuctionMeta>>({});
  const { isConnected } = useWalletStore();

  const load = async () => {
    setIsLoading(true);
    try {
      const items = await auctionService.listPublicAuctions();
      setList(items);

      // Best-effort: hydrate metadata (image/description) from offchain CID fields
      const next: Record<string, AuctionMeta> = {};
      await Promise.all(
        items.slice(0, 24).map(async (a) => {
          const raw = a.data as any;
          const off = raw?.item?.offchain_data;
          if (!off || off.length < 2) return;
          const cid = aleoService.decodeFieldsToCid(String(off[0]), String(off[1]));
          if (!cid) return;
          try {
            const json = await pinataService.fetchJSON<Record<string, unknown>>(cid);
            const imageCid = typeof json.imageCid === 'string' ? json.imageCid : '';
            next[a.auctionId] = {
              name: typeof json.name === 'string' ? json.name : undefined,
              description: typeof json.description === 'string' ? json.description : undefined,
              imageUrl: imageCid ? pinataService.getGatewayUrl(imageCid) : undefined,
            };
          } catch {
            // ignore metadata failures
          }
        })
      );
      if (Object.keys(next).length) setMetaById((prev) => ({ ...prev, ...next }));
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
                const chain = parseAuctionData(a.data);
                const meta = metaById[a.auctionId];
                const name = meta?.name || chain.name;
                const startingBid = chain.startingBid;
                return (
                  <Link key={a.auctionId} href={`/auctions/${encodeURIComponent(a.auctionId)}`}>
                    <motion.div
                      initial={{ opacity: 0, y: 16 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.04 }}
                    >
                      <GlassCard hover className="h-full p-0 overflow-hidden flex flex-col">
                        {meta?.imageUrl ? (
                          <div className="relative h-36 w-full bg-white/[0.06]">
                            <img src={meta.imageUrl} alt={name} className="h-full w-full object-cover" />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                          </div>
                        ) : null}
                        <div className="p-6 flex flex-col flex-1">
                        <div className="flex items-start justify-between mb-3">
                          <span className="text-xs text-white/50">#{a.index}</span>
                          <Badge variant="active">Open</Badge>
                        </div>
                        <h3 className="text-lg font-semibold text-white mb-2 line-clamp-2">{name}</h3>
                        {meta?.description ? (
                          <p className="text-sm text-white/60 mb-3 line-clamp-2">{meta.description}</p>
                        ) : null}
                        <p className="text-sm text-white/60 mb-4">
                          Starting bid: <span className="text-emerald-400">{startingBid} credits</span>
                        </p>
                        <div className="mt-auto flex items-center text-emerald-400 text-sm">
                          <span>View & place bid</span>
                          <ArrowRight className="w-4 h-4 ml-1" />
                        </div>
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
