'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Vote,
  Shield,
  Zap,
  Eye,
  ArrowRight,
  Lock,
  Users,
  CheckCircle,
  Circle,
  Clock,
  Calendar,
} from 'lucide-react';
import { GlassCard } from '@/components/ui/GlassCard';
import { GlassButton } from '@/components/ui/GlassButton';
import { Badge } from '@/components/ui/Badge';
import { SkeletonCard } from '@/components/ui/LoadingSpinner';
import { useWalletStore } from '@/stores/walletStore';
import { Campaign } from '@/types';
import { aleoService } from '@/services/aleo';
import { parseOnChainCampaign } from '@/services/campaignParser';
import { formatDistanceToNow, isPast, isFuture } from 'date-fns';

// Hero section features
const heroFeatures = [
  {
    icon: Shield,
    title: 'Privacy First',
    description: 'Your vote is protected by zero-knowledge proofs',
  },
  {
    icon: Zap,
    title: 'Gasless Voting',
    description: 'Vote freely without transaction fees',
  },
  {
    icon: Eye,
    title: 'Anonymous',
    description: 'No one can trace your vote back to you',
  },
  {
    icon: Lock,
    title: 'Tamper-Proof',
    description: 'Blockchain-secured and immutable',
  },
];

export default function Home() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [isLoadingCampaigns, setIsLoadingCampaigns] = useState(true);
  const { isConnected } = useWalletStore();

  // Load campaigns from blockchain
  useEffect(() => {
    loadCampaigns();
  }, []);

  const loadCampaigns = async () => {
    setIsLoadingCampaigns(true);
    try {
      const allCampaigns = await aleoService.fetchAllCampaigns();
      const loadedCampaigns: Campaign[] = [];

      for (const entry of allCampaigns) {
        try {
          const idMatch = entry.id.match(/(\d+)/);
          const id = idMatch ? parseInt(idMatch[1]) : 0;

          if (id > 0 && typeof entry.data === 'string') {
            const campaignData = await parseOnChainCampaign(entry.data, id);
            if (campaignData) loadedCampaigns.push(campaignData);
          }
        } catch (err) {
          console.warn('Error parsing campaign:', err);
        }
      }

      loadedCampaigns.sort((a, b) => b.endTime.getTime() - a.endTime.getTime());
      setCampaigns(loadedCampaigns.slice(0, 6));
    } catch (err) {
      console.error('Error loading campaigns:', err);
    } finally {
      setIsLoadingCampaigns(false);
    }
  };

  const getCampaignStatus = (campaign: Campaign) => {
    if (isPast(campaign.endTime)) return 'ended';
    if (isFuture(campaign.startTime)) return 'upcoming';
    return 'active';
  };

  return (
    <div className="min-h-screen">
      {/* Hero */}
      <section className="relative py-24 lg:py-32" aria-labelledby="hero-heading">
        <div className="absolute top-12 right-4 md:right-12 opacity-80">
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 shadow-sm">
            zk-powered
          </span>
        </div>
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 id="hero-heading" className="text-4xl sm:text-5xl font-bold text-white mb-5">
            Private voting for the decentralized era
          </h1>
          <p className="text-lg text-white/60 mb-10">
            Create campaigns, cast anonymous votes, and participate in governance with complete privacy on Aleo.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link href="/campaigns">
              <GlassButton size="lg" icon={<Vote className="w-5 h-5" />}>
                {isConnected ? 'Browse Campaigns' : 'Explore Campaigns'}
              </GlassButton>
            </Link>
            {isConnected && (
              <Link href="/create">
                <GlassButton size="lg" variant="secondary" icon={<ArrowRight className="w-5 h-5" />}>
                  Create Campaign
                </GlassButton>
              </Link>
            )}
          </div>
          <div className="flex flex-wrap items-center justify-center gap-8 mt-16 text-white/50 text-sm">
            {heroFeatures.map((f) => (
              <span key={f.title} className="flex items-center gap-2">
                <f.icon className="w-4 h-4 text-emerald-400" />
                {f.title}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* What's next */}
      <section className="py-16">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold text-white mb-6">What&apos;s next</h2>
          <GlassCard className="p-6">
            <ul className="space-y-3 text-white/80">
              <li className="flex items-center gap-3">
                <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
                Core voting: campaigns, Leo/Puzzle wallets, gasless voting, private tally
              </li>
              <li className="flex items-center gap-3">
                <Circle className="w-5 h-5 text-white/40 flex-shrink-0" />
                Campaign analytics and ranked-choice voting
              </li>
              <li className="flex items-center gap-3">
                <Circle className="w-5 h-5 text-white/40 flex-shrink-0" />
                Multi-language support and DAO governance
              </li>
              <li className="flex items-center gap-3">
                <Circle className="w-5 h-5 text-white/40 flex-shrink-0" />
                Cross-chain and reputation features
              </li>
            </ul>
          </GlassCard>
        </div>
      </section>

      {/* Featured Campaigns */}
      <section className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-10">
            <div>
              <h2 className="text-2xl font-bold text-white mb-2">Active Campaigns</h2>
              <p className="text-white/60">
                Participate in live voting campaigns on the Aleo blockchain
              </p>
            </div>
            <Link href="/campaigns">
              <GlassButton variant="secondary" icon={<ArrowRight className="w-5 h-5" />}>
                View All
              </GlassButton>
            </Link>
          </div>

          {/* Campaigns Grid */}
          {isLoadingCampaigns ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(3)].map((_, i) => (
                <SkeletonCard key={i} />
              ))}
            </div>
          ) : campaigns.length === 0 ? (
            <GlassCard className="p-12 text-center relative overflow-hidden">
              <div className="absolute top-6 right-6 w-20 h-20 rounded-full bg-emerald-500/5 border border-emerald-500/10" aria-hidden />
              <div className="absolute bottom-8 left-8 w-12 h-12 rounded-full bg-white/5" aria-hidden />
              <Vote className="w-16 h-16 text-white/20 mx-auto mb-4 relative" />
              <h3 className="text-xl font-semibold text-white mb-2">
                No campaigns yet
              </h3>
              <p className="text-white/60 mb-6">
                Be the first to create a voting campaign!
              </p>
              {isConnected && (
                <Link href="/create">
                  <GlassButton icon={<Vote className="w-5 h-5" />}>
                    Create Campaign
                  </GlassButton>
                </Link>
              )}
            </GlassCard>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {campaigns.map((campaign, index) => {
                const status = getCampaignStatus(campaign);
                const statusConfig = {
                  active: {
                    label: 'Active',
                    color: 'bg-green-500/20 text-green-400 border-green-500/30',
                    icon: Clock,
                  },
                  upcoming: {
                    label: 'Upcoming',
                    color: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
                    icon: Calendar,
                  },
                  ended: {
                    label: 'Ended',
                    color: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
                    icon: CheckCircle,
                  },
                };
                const config = statusConfig[status];
                const StatusIcon = config.icon;

                return (
                  <Link key={campaign.id} href={`/campaign/${campaign.id}`}>
                    <GlassCard hover className="h-full flex flex-col overflow-hidden p-0">
                        {/* Image */}
                        <div className="relative h-48 overflow-hidden bg-emerald-500/10">
                          <img
                            src={campaign.imageUrl || '/images/default-campaign.svg'}
                            alt={campaign.title}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              e.currentTarget.src = '/images/default-campaign.svg';
                            }}
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />

                          {/* Status Badge */}
                          <div className="absolute top-4 right-4">
                            <Badge variant={status} icon={<StatusIcon className="w-3.5 h-3.5" />}>
                              {config.label}
                            </Badge>
                          </div>
                        </div>

                        {/* Content */}
                        <div className="p-6 flex flex-col flex-1">
                          <h3 className="text-lg font-semibold text-white mb-2 line-clamp-2">
                            {campaign.title}
                          </h3>
                          <p className="text-sm text-white/60 mb-4 line-clamp-2 flex-1">
                            {campaign.description}
                          </p>

                          {/* Stats */}
                          <div className="flex items-center justify-between text-sm">
                            <div className="flex items-center gap-2 text-white/50">
                              <Users className="w-4 h-4" />
                              <span>{campaign.totalVotes} votes</span>
                            </div>

                            <div className="flex items-center gap-2 text-white/50">
                              <Clock className="w-4 h-4" />
                              <span>
                                {status === 'ended'
                                  ? `Ended ${formatDistanceToNow(campaign.endTime, { addSuffix: true })}`
                                  : status === 'upcoming'
                                    ? `Starts ${formatDistanceToNow(campaign.startTime, { addSuffix: true })}`
                                    : `Ends ${formatDistanceToNow(campaign.endTime, { addSuffix: true })}`
                                }
                              </span>
                            </div>
                          </div>

                          {/* Vote CTA */}
                          {status === 'active' && (
                            <div className="mt-4 pt-4 border-t border-white/10">
                              <div className="flex items-center justify-between">
                                <span className="text-sm text-emerald-400">Cast your vote</span>
                                <ArrowRight className="w-4 h-4 text-emerald-400" />
                              </div>
                            </div>
                          )}
                        </div>
                    </GlassCard>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* CTA */}
      <section className="py-16">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <GlassCard className="p-10">
            <h2 className="text-2xl font-bold text-white mb-3">Ready to get started?</h2>
            <p className="text-white/60 mb-6">
              Connect your wallet and start participating in private, decentralized voting.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link href="/campaigns">
                <GlassButton size="lg" icon={<Vote className="w-5 h-5" />}>
                  Browse Campaigns
                </GlassButton>
              </Link>
              <a href="https://aleo.org" target="_blank" rel="noopener noreferrer">
                <GlassButton size="lg" variant="secondary">Learn about Aleo</GlassButton>
              </a>
            </div>
          </GlassCard>
        </div>
      </section>
    </div>
  );
}
