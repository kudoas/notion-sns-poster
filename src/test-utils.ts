import type { Article } from './sns/interface.ts'

export const createMockArticle = (overrides: Partial<Article> = {}): Article => ({
  id: 'test-id-123',
  title: 'Test Article Title',
  url: 'https://example.com/test-article',
  ...overrides,
})
