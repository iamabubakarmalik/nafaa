/**
 * Lead scoring engine
 * Scores 0-100 based on activity, engagement, and profile completeness
 */

export interface LeadScoringInput {
  source?: string;
  hasCompany?: boolean;
  hasPhone?: boolean;
  hasEmail?: boolean;
  companySize?: string;
  emailsOpened?: number;
  emailsSent?: number;
  meetingsHeld?: number;
  demosAttended?: number;
  budget?: string;
  timeline?: string;
  decisionMaker?: boolean;
}

export function calculateLeadScore(input: LeadScoringInput): number {
  let score = 0;

  // Profile completeness (max 25)
  if (input.hasEmail) score += 8;
  if (input.hasPhone) score += 8;
  if (input.hasCompany) score += 9;

  // Source quality (max 20)
  const sourceScores: Record<string, number> = {
    DEMO_REQUEST: 20,
    CONTACT_FORM: 15,
    REFERRAL: 18,
    ORGANIC_SEARCH: 12,
    PAID_ADS: 10,
    NEWSLETTER: 8,
    SOCIAL_MEDIA: 7,
    CHATBOT: 12,
    DIRECT: 15,
    OTHER: 5,
  };
  score += sourceScores[input.source ?? 'OTHER'] ?? 5;

  // Engagement (max 25)
  if (input.emailsSent && input.emailsSent > 0) {
    const openRate = (input.emailsOpened ?? 0) / input.emailsSent;
    score += Math.min(10, Math.round(openRate * 15));
  }
  if (input.meetingsHeld) score += Math.min(8, input.meetingsHeld * 4);
  if (input.demosAttended) score += Math.min(7, input.demosAttended * 4);

  // Intent signals (max 30)
  if (input.decisionMaker) score += 10;
  if (input.budget && input.budget !== 'NOT_SPECIFIED') score += 10;
  if (input.timeline === 'IMMEDIATELY') score += 10;
  else if (input.timeline === '1_MONTH') score += 7;
  else if (input.timeline === '3_MONTHS') score += 4;

  return Math.min(100, Math.max(0, score));
}

export function scoreToTemperature(
  score: number,
): 'COLD' | 'WARM' | 'HOT' | 'FIRE' {
  if (score >= 80) return 'FIRE';
  if (score >= 60) return 'HOT';
  if (score >= 40) return 'WARM';
  return 'COLD';
}
