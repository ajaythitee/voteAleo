import { create } from 'zustand';
import { Campaign, Vote } from '@/types';

interface CampaignState {
  campaigns: Campaign[];
  currentCampaign: Campaign | null;
  userVotes: Vote[];
  isLoading: boolean;
  error: string | null;
}

interface CampaignActions {
  setCampaigns: (campaigns: Campaign[]) => void;
  addCampaign: (campaign: Campaign) => void;
  updateCampaign: (id: string, updates: Partial<Campaign>) => void;
  setCurrentCampaign: (campaign: Campaign | null) => void;
  addUserVote: (vote: Vote) => void;
  setLoading: (isLoading: boolean) => void;
  setError: (error: string | null) => void;
  getCampaignById: (id: string) => Campaign | undefined;
  getActiveCampaigns: () => Campaign[];
  getEndedCampaigns: () => Campaign[];
  hasUserVoted: (campaignId: string, address: string) => boolean;
}

export const useCampaignStore = create<CampaignState & CampaignActions>((set, get) => ({
  campaigns: [],
  currentCampaign: null,
  userVotes: [],
  isLoading: false,
  error: null,

  setCampaigns: (campaigns) => set({ campaigns }),

  addCampaign: (campaign) =>
    set((state) => ({
      campaigns: [campaign, ...state.campaigns],
    })),

  updateCampaign: (id, updates) =>
    set((state) => ({
      campaigns: state.campaigns.map((c) =>
        c.id === id ? { ...c, ...updates } : c
      ),
    })),

  setCurrentCampaign: (campaign) => set({ currentCampaign: campaign }),

  addUserVote: (vote) =>
    set((state) => ({
      userVotes: [...state.userVotes, vote],
    })),

  setLoading: (isLoading) => set({ isLoading }),

  setError: (error) => set({ error }),

  getCampaignById: (id) => get().campaigns.find((c) => c.id === id),

  getActiveCampaigns: () => {
    const now = new Date();
    return get().campaigns.filter(
      (c) => c.isActive && new Date(c.endTime) > now
    );
  },

  getEndedCampaigns: () => {
    const now = new Date();
    return get().campaigns.filter(
      (c) => !c.isActive || new Date(c.endTime) <= now
    );
  },

  hasUserVoted: (campaignId, address) =>
    get().userVotes.some(
      (v) => v.campaignId === campaignId && v.voterAddress === address
    ),
}));
