import { marketplaceClient, unwrap } from '@/api/client';

export interface AiStartResponse {
  conversation: any;
  response: string;
  products: any[];
}

export const aiAssistantApi = {
  start: (query: string, language = 'ur') =>
    marketplaceClient.post('/ai-assistant/start', { query, language }).then(unwrap<AiStartResponse>),

  continue: (sessionId: string, message: string) =>
    marketplaceClient.post('/ai-assistant/continue', { sessionId, message }).then(unwrap<{
      response: string; products: any[];
    }>),

  getConversation: (sessionId: string) =>
    marketplaceClient.get(`/ai-assistant/conversation/${sessionId}`).then(unwrap<any>),

  generateRecommendations: () =>
    marketplaceClient.post('/ai-assistant/recommendations/generate').then(unwrap<any[]>),

  getRecommendations: (limit = 20) =>
    marketplaceClient.get('/ai-assistant/recommendations', { params: { limit } }).then(unwrap<any[]>),

  trackAction: (productId: string, action: 'viewed' | 'clicked' | 'purchased') =>
    marketplaceClient.post('/ai-assistant/track', { productId, action }).then(unwrap),
};
