import { apiClient } from './client';

export type ReferralStatus = 'PENDING' | 'CONVERTED' | 'PAID' | 'EXPIRED';
export type CreditType = 'REFERRAL_BONUS' | 'PROMOTIONAL' | 'REFUND' | 'ADJUSTMENT';

export interface ReferralEntry {
  id: string;
  status: ReferralStatus;
  rewardAmount: number;
  rewardPaid: boolean;
  convertedAt?: string | null;
  createdAt: string;
  referee: {
    id: string;
    name: string;
    createdAt: string;
    status: string;
  };
}

export interface CreditEntry {
  id: string;
  type: CreditType;
  amount: number;
  balanceAfter: number;
  reference?: string | null;
  note?: string | null;
  createdAt: string;
}

export interface ReferralDashboard {
  tenant: {
    id: string;
    name: string;
    referralCode: string;
    accountCredit: number;
  };
  stats: {
    totalReferrals: number;
    pendingCount: number;
    convertedCount: number;
    totalEarned: number;
    currentCredit: number;
    rewardAmount: number;
    rewardPercentage: number;
  };
  referrals: ReferralEntry[];
  credits: CreditEntry[];
}

const unwrap = <T>(res: { data: { data: T } }): T => res.data.data;

export const referralsApi = {
  myDashboard: () =>
    apiClient.get<{ data: ReferralDashboard }>('/referrals/me').then(unwrap),
  leaderboard: () =>
    apiClient.get<{ data: any[] }>('/referrals/leaderboard').then(unwrap),
};
