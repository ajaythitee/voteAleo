// VoteAleo Type Definitions

export interface Campaign {
  id: string;
  title: string;
  description: string;
  imageUrl: string;
  imageCid?: string;
  creator: string;
  startTime: Date;
  endTime: Date;
  options: VotingOption[];
  totalVotes: number;
  isActive: boolean;
  createdAt: Date;
  onChainId?: number;
  metadataHash?: string;
}

export interface VotingOption {
  id: string;
  label: string;
  voteCount: number;
  percentage?: number;
}

export interface Vote {
  campaignId: string;
  optionIndex: number;
  voterAddress: string;
  timestamp: Date;
  transactionId?: string;
}

export interface VoteReceipt {
  campaignId: string;
  optionIndex: number;
  timestamp: Date;
  proof?: string;
}

export interface WalletState {
  isConnected: boolean;
  address: string | null;
  network: string | null;
  walletType: 'leo' | 'puzzle' | null;
  isConnecting: boolean;
  error: string | null;
}

export interface CampaignFormData {
  title: string;
  description: string;
  image: File | null;
  startTime: Date;
  endTime: Date;
  options: string[];
}

export interface Phase {
  id: number;
  title: string;
  description: string;
  features: string[];
  status: 'completed' | 'current' | 'upcoming';
}

export interface ToastNotification {
  id: string;
  type: 'success' | 'error' | 'info' | 'warning';
  title: string;
  message: string;
  duration?: number;
}

// Aleo specific types
export interface AleoTransaction {
  programId: string;
  functionId: string;
  inputs: string[];
  fee: number;
}

export interface AleoConfig {
  network: 'testnet' | 'mainnet';
  rpcUrl: string;
  votingProgramId: string;
}

// Pinata/IPFS types
export interface IPFSUploadResult {
  cid: string;
  url: string;
  size: number;
}

export interface CampaignMetadata {
  title: string;
  description: string;
  options: string[];
  creator: string;
  createdAt: string;
  imageCid?: string;
}
