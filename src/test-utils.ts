import { mock } from 'bun:test';
import { Article } from './sns/interface';

export const createMockArticle = (overrides: Partial<Article> = {}): Article => ({
  id: 'test-id-123',
  title: 'Test Article Title',
  url: 'https://example.com/test-article',
  ...overrides
});

export const createMockFetch = (mockResponse: Partial<Response> = {}) => {
  const defaultResponse = {
    ok: true,
    status: 200,
    statusText: 'OK',
    text: async () => '{"data": {"id": "123"}}',
    json: async () => ({ data: { id: '123' } }),
    ...mockResponse
  };
  
  return mock(() => Promise.resolve(defaultResponse));
};

export const createMockFailedFetch = (status: number = 400, statusText: string = 'Bad Request', body: string = 'Error') => {
  return mock(() => Promise.resolve({
    ok: false,
    status,
    statusText,
    text: async () => body
  }));
};
