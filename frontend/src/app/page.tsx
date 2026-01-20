'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Vote,
  Shield,
  Zap,
  Eye,
  ChevronLeft,
  ChevronRight,
  ArrowRight,
  Lock,
  Users,
  BarChart3,
  Sparkles,
  Globe,
  Layers,
  Award,
  CheckCircle,
  Circle,
  Clock,
  Calendar,
  RefreshCw,
} from 'lucide-react';
import { GlassCard } from '@/components/ui/GlassCard';
import { GlassButton } from '@/components/ui/GlassButton';
import { SkeletonCard } from '@/components/ui/LoadingSpinner';
import { useWalletStore } from '@/stores/walletStore';
import { Campaign, CampaignMetadata } from '@/types';
import { aleoService } from '@/services/aleo';
import { pinataService } from '@/services/pinata';
import { formatDistanceToNow, isPast, isFuture } from 'date-fns';

// Phase data
const phases = [
  {
    id: 1,
    title: 'Phase 1: Core Features',
    subtitle: 'Foundation',
    status: 'current' as const,
    color: 'from-green-500 to-emerald-500',
    features: [
      { icon: Vote, label: 'Campaign Creation', description: 'Create voting campaigns with title, description, and time period' },
      { icon: Shield, label: 'Aleo Wallet Integration', description: 'Connect Leo or Puzzle wallet for anonymous authentication' },
      { icon: Zap, label: 'Gasless Voting', description: 'Vote without paying gas fees - relayer handles costs' },
      { icon: Lock, label: 'Anonymous Voting', description: 'zk-SNARKs ensure complete vote privacy' },
      { icon: BarChart3, label: 'Vote Tallying', description: 'Secure counting with hidden results until voting ends' },
    ],
  },
  {
    id: 2,
    title: 'Phase 2: Enhanced Features',
    subtitle: 'Intelligence',
    status: 'upcoming' as const,
    color: 'from-blue-500 to-indigo-500',
    features: [
      { icon: Sparkles, label: 'AI-Enhanced Options', description: 'AI-generated voting suggestions based on campaign topic' },
      { icon: BarChart3, label: 'Campaign Analytics', description: 'View voter insights while maintaining privacy' },
      { icon: Users, label: 'Whitelisted Voting', description: 'Restrict voting to verified participants' },
      { icon: Layers, label: 'Ranked-Choice Voting', description: 'Support for ranked preference voting' },
      { icon: Eye, label: 'Hidden Results', description: 'Results revealed only after voting ends' },
    ],
  },
  {
    id: 3,
    title: 'Phase 3: Advanced Features',
    subtitle: 'Expansion',
    status: 'upcoming' as const,
    color: 'from-purple-500 to-pink-500',
    features: [
      { icon: Globe, label: 'Multi-Language Support', description: 'Platform accessible to global audience' },
      { icon: Layers, label: 'Conditional Voting', description: 'Dynamic proposals based on vote outcomes' },
      { icon: Shield, label: 'Oracle Integration', description: 'Real-world data feeds for voting' },
      { icon: Users, label: 'DAO Governance', description: 'Automatic on-chain governance actions' },
      { icon: Lock, label: 'Private Campaigns', description: 'End-to-end encrypted invitation-only voting' },
    ],
  },
  {
    id: 4,
    title: 'Phase 4: Future Expansion',
    subtitle: 'Scale',
    status: 'upcoming' as const,
    color: 'from-orange-500 to-red-500',
    features: [
      { icon: Globe, label: 'Cross-Chain Voting', description: 'Vote from Ethereum, Solana, and more' },
      { icon: Shield, label: 'Fraud Detection', description: 'Enhanced anti-tampering mechanisms' },
      { icon: BarChart3, label: 'Comprehensive Reports', description: 'Detailed analytics and AI insights' },
      { icon: Award, label: 'Reputation System', description: 'Earn trust and governance rights' },
      { icon: Zap, label: 'Scalability', description: 'Optimized for large-scale elections' },
    ],
  },
];

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
  const [currentPhase, setCurrentPhase] = useState(0);
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
            const parsed = parseAleoStruct(entry.data);
            if (parsed) {
              let title = `Campaign #${id}`;
              let description = 'Campaign on VoteAleo';
              const imageUrl = '/images/default-campaign.svg';

              // Decode CID from on-chain and fetch metadata from IPFS
              const cidPart1 = parsed['metadata_cid.part1'];
              const cidPart2 = parsed['metadata_cid.part2'];

              if (cidPart1 && cidPart2) {
                try {
                  const cid = aleoService.decodeFieldsToCid(
                    cidPart1.includes('field') ? cidPart1 : cidPart1 + 'field',
                    cidPart2.includes('field') ? cidPart2 : cidPart2 + 'field'
                  );
                  if (cid) {
                    const metadata = await pinataService.fetchJSON<CampaignMetadata>(cid);
                    if (metadata) {
                      title = metadata.title || title;
                      description = metadata.description || description;
                    }
                  }
                } catch (e) {
                  console.warn('Could not fetch metadata from IPFS:', e);
                }
              }

              loadedCampaigns.push({
                id: String(id),
                title,
                description,
                imageUrl,
                creator: parsed.creator || '',
                startTime: new Date(Number(parsed.start_time || 0) * 1000),
                endTime: new Date(Number(parsed.end_time || 0) * 1000),
                options: [],
                totalVotes: Number(parsed.total_votes || 0),
                isActive: parsed.is_active === 'true',
                createdAt: new Date(),
                onChainId: id,
              });
            }
          }
        } catch (err) {
          console.warn('Error parsing campaign:', err);
        }
      }

      // Sort by most recent and limit to 6
      loadedCampaigns.sort((a, b) => b.endTime.getTime() - a.endTime.getTime());
      setCampaigns(loadedCampaigns.slice(0, 6));
    } catch (err) {
      console.error('Error loading campaigns:', err);
    } finally {
      setIsLoadingCampaigns(false);
    }
  };

  const parseAleoStruct = (str: string): Record<string, string> | null => {
    try {
      const content = str.replace(/^\s*\{|\}\s*$/g, '').trim();
      if (!content) return null;

      const result: Record<string, string> = {};
      const pairs = content.split(',').map(p => p.trim());

      for (const pair of pairs) {
        const colonIdx = pair.indexOf(':');
        if (colonIdx === -1) continue;

        const key = pair.substring(0, colonIdx).trim();
        let value = pair.substring(colonIdx + 1).trim();
        value = value.replace(/\s*(u\d+|i\d+|field|bool|address)$/i, '').trim();

        result[key] = value;
      }

      return result;
    } catch {
      return null;
    }
  };

  const getCampaignStatus = (campaign: Campaign) => {
    if (isPast(campaign.endTime)) return 'ended';
    if (isFuture(campaign.startTime)) return 'upcoming';
    return 'active';
  };

  const nextPhase = () => {
    setCurrentPhase((prev) => (prev + 1) % phases.length);
  };

  const prevPhase = () => {
    setCurrentPhase((prev) => (prev - 1 + phases.length) % phases.length);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'current':
        return <CheckCircle className="w-5 h-5 text-green-400" />;
      case 'completed':
        return <CheckCircle className="w-5 h-5 text-green-400" />;
      default:
        return <Clock className="w-5 h-5 text-white/40" />;
    }
  };

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative py-20 lg:py-32 overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-4xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-sm font-medium mb-6">
                <Sparkles className="w-4 h-4" />
                Phase 1 Now Live
              </span>

              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold mb-6">
                <span className="gradient-text">Private Voting</span>
                <br />
                <span className="text-white">for the Decentralized Era</span>
              </h1>

              <p className="text-lg sm:text-xl text-white/60 mb-10 max-w-2xl mx-auto">
                Create campaigns, cast anonymous votes, and participate in
                decentralized governance with complete privacy using Aleo's
                zero-knowledge proofs.
              </p>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                {isConnected ? (
                  <>
                    <Link href="/campaigns">
                      <GlassButton size="lg" icon={<Vote className="w-5 h-5" />}>
                        Browse Campaigns
                      </GlassButton>
                    </Link>
                    <Link href="/create">
                      <GlassButton size="lg" variant="secondary" icon={<ArrowRight className="w-5 h-5" />}>
                        Create Campaign
                      </GlassButton>
                    </Link>
                  </>
                ) : (
                  <>
                    <Link href="/campaigns">
                      <GlassButton size="lg" icon={<Vote className="w-5 h-5" />}>
                        Explore Campaigns
                      </GlassButton>
                    </Link>
                    <GlassButton size="lg" variant="secondary">
                      Connect Wallet to Create
                    </GlassButton>
                  </>
                )}
              </div>
            </motion.div>
          </div>

          {/* Hero Features */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-16"
          >
            {heroFeatures.map((feature, index) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.3 + index * 0.1 }}
              >
                <GlassCard hover className="text-center p-6">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 flex items-center justify-center mx-auto mb-4">
                    <feature.icon className="w-6 h-6 text-indigo-400" />
                  </div>
                  <h3 className="font-semibold text-white mb-2">{feature.title}</h3>
                  <p className="text-sm text-white/50">{feature.description}</p>
                </GlassCard>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Phase Roadmap Section */}
      <section className="py-20 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
              Development Roadmap
            </h2>
            <p className="text-white/60 max-w-2xl mx-auto">
              Our journey to building the most comprehensive privacy-preserving
              voting platform on Aleo.
            </p>
          </motion.div>

          {/* Phase Navigator */}
          <div className="flex items-center justify-center gap-4 mb-12">
            <motion.button
              onClick={prevPhase}
              className="p-3 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <ChevronLeft className="w-6 h-6 text-white" />
            </motion.button>

            {/* Phase Indicators */}
            <div className="flex items-center gap-3">
              {phases.map((phase, index) => (
                <motion.button
                  key={phase.id}
                  onClick={() => setCurrentPhase(index)}
                  className={`
                    relative w-10 h-10 rounded-full flex items-center justify-center
                    transition-all duration-300
                    ${index === currentPhase
                      ? 'bg-gradient-to-br ' + phase.color + ' scale-110'
                      : 'bg-white/10 hover:bg-white/20'
                    }
                  `}
                  whileHover={{ scale: index === currentPhase ? 1.1 : 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <span className="text-white font-semibold text-sm">{phase.id}</span>
                  {index === currentPhase && (
                    <motion.div
                      layoutId="phase-indicator"
                      className="absolute inset-0 rounded-full border-2 border-white/50"
                      transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                    />
                  )}
                </motion.button>
              ))}
            </div>

            <motion.button
              onClick={nextPhase}
              className="p-3 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <ChevronRight className="w-6 h-6 text-white" />
            </motion.button>
          </div>

          {/* Phase Content */}
          <AnimatePresence mode="wait">
            <motion.div
              key={currentPhase}
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -50 }}
              transition={{ duration: 0.3 }}
            >
              <GlassCard glow className="p-8 lg:p-12">
                <div className="flex flex-col lg:flex-row lg:items-start gap-8">
                  {/* Phase Info */}
                  <div className="lg:w-1/3">
                    <div className="flex items-center gap-3 mb-4">
                      <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${phases[currentPhase].color} flex items-center justify-center`}>
                        <span className="text-white font-bold text-xl">{phases[currentPhase].id}</span>
                      </div>
                      <div>
                        <span className={`
                          text-xs font-medium px-2 py-1 rounded-full
                          ${phases[currentPhase].status === 'current'
                            ? 'bg-green-500/20 text-green-400'
                            : 'bg-white/10 text-white/60'
                          }
                        `}>
                          {phases[currentPhase].status === 'current' ? 'In Progress' : 'Upcoming'}
                        </span>
                      </div>
                    </div>

                    <h3 className="text-2xl font-bold text-white mb-2">
                      {phases[currentPhase].title}
                    </h3>
                    <p className="text-white/60">
                      {phases[currentPhase].subtitle}
                    </p>
                  </div>

                  {/* Features Grid */}
                  <div className="lg:w-2/3">
                    <div className="grid sm:grid-cols-2 gap-4">
                      {phases[currentPhase].features.map((feature, index) => (
                        <motion.div
                          key={feature.label}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.3, delay: index * 0.1 }}
                          className="flex items-start gap-4 p-4 rounded-xl bg-white/5 hover:bg-white/10 transition-colors"
                        >
                          <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${phases[currentPhase].color} bg-opacity-20 flex items-center justify-center flex-shrink-0`}>
                            <feature.icon className="w-5 h-5 text-white" />
                          </div>
                          <div>
                            <h4 className="font-semibold text-white mb-1">{feature.label}</h4>
                            <p className="text-sm text-white/50">{feature.description}</p>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  </div>
                </div>
              </GlassCard>
            </motion.div>
          </AnimatePresence>

          {/* Vertical Timeline (Desktop) */}
          <div className="hidden lg:flex justify-center mt-12">
            <div className="flex items-center gap-4">
              {phases.map((phase, index) => (
                <div key={phase.id} className="flex items-center">
                  <motion.div
                    className={`
                      relative flex flex-col items-center cursor-pointer
                    `}
                    onClick={() => setCurrentPhase(index)}
                    whileHover={{ scale: 1.05 }}
                  >
                    <div className={`
                      w-4 h-4 rounded-full
                      ${index === currentPhase
                        ? 'bg-gradient-to-br ' + phase.color + ' phase-dot-active'
                        : index < currentPhase
                          ? 'bg-green-500'
                          : 'bg-white/20'
                      }
                    `} />
                    <span className={`
                      mt-2 text-xs font-medium
                      ${index === currentPhase ? 'text-white' : 'text-white/40'}
                    `}>
                      Phase {phase.id}
                    </span>
                  </motion.div>

                  {index < phases.length - 1 && (
                    <div className={`
                      w-20 h-0.5 mx-2
                      ${index < currentPhase ? 'bg-green-500' : 'bg-white/10'}
                    `} />
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Featured Campaigns Section */}
      <section className="py-20 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="flex items-center justify-between mb-12"
          >
            <div>
              <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
                Active Campaigns
              </h2>
              <p className="text-white/60 max-w-2xl">
                Participate in live voting campaigns on the Aleo blockchain
              </p>
            </div>
            <Link href="/campaigns">
              <GlassButton variant="secondary" icon={<ArrowRight className="w-5 h-5" />}>
                View All
              </GlassButton>
            </Link>
          </motion.div>

          {/* Campaigns Grid */}
          {isLoadingCampaigns ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(3)].map((_, i) => (
                <SkeletonCard key={i} />
              ))}
            </div>
          ) : campaigns.length === 0 ? (
            <GlassCard className="p-12 text-center">
              <Vote className="w-16 h-16 text-white/20 mx-auto mb-4" />
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
                    color: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
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
                  <motion.div
                    key={campaign.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, delay: index * 0.1 }}
                  >
                    <Link href={`/campaign/${campaign.id}`}>
                      <GlassCard hover className="h-full flex flex-col overflow-hidden p-0">
                        {/* Image */}
                        <div className="relative h-48 overflow-hidden bg-gradient-to-br from-indigo-500/20 to-purple-500/20">
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
                          <div className={`absolute top-4 right-4 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border ${config.color}`}>
                            <StatusIcon className="w-3.5 h-3.5" />
                            {config.label}
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
                                <span className="text-sm text-indigo-400">Cast your vote</span>
                                <ArrowRight className="w-4 h-4 text-indigo-400" />
                              </div>
                            </div>
                          )}
                        </div>
                      </GlassCard>
                    </Link>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <GlassCard className="p-12">
            <h2 className="text-3xl font-bold text-white mb-4">
              Ready to Get Started?
            </h2>
            <p className="text-white/60 mb-8 max-w-xl mx-auto">
              Join the future of private, decentralized voting. Connect your
              wallet and start participating in governance today.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link href="/campaigns">
                <GlassButton size="lg" icon={<Vote className="w-5 h-5" />}>
                  Browse Campaigns
                </GlassButton>
              </Link>
              <a
                href="https://aleo.org"
                target="_blank"
                rel="noopener noreferrer"
              >
                <GlassButton size="lg" variant="secondary">
                  Learn About Aleo
                </GlassButton>
              </a>
            </div>
          </GlassCard>
        </div>
      </section>
    </div>
  );
}
