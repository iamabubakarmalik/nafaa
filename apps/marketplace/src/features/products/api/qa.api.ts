import { marketplaceClient, unwrap } from '@/api/client';

export const qaApi = {
  list: (productId: string, limit = 20, offset = 0) =>
    marketplaceClient
      .get(`/products/${productId}/questions`, { params: { limit, offset } })
      .then(unwrap<{ items: any[]; total: number }>),

  ask: (productId: string, question: string) =>
    marketplaceClient.post(`/products/${productId}/questions`, { question }).then(unwrap<any>),

  voteQuestion: (questionId: string) =>
    marketplaceClient.post(`/questions/${questionId}/vote`).then(unwrap),

  voteAnswer: (answerId: string) =>
    marketplaceClient.post(`/answers/${answerId}/vote`).then(unwrap),

  reportQuestion: (questionId: string, reason: string) =>
    marketplaceClient.post(`/questions/${questionId}/report`, { reason }).then(unwrap),
};
