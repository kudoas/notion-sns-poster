import { describe, test, expect } from 'bun:test';
import { buildText } from './utils';
import { Article } from './interface';

describe('buildText', () => {
  test('should format article with title and URL', () => {
    const article: Article = {
      id: '1',
      title: 'Test Article',
      url: 'https://example.com/test'
    };

    const result = buildText(article);
    expect(result).toBe('🔖 Test Article https://example.com/test');
  });

  test('should handle articles with special characters in title', () => {
    const article: Article = {
      id: '2',
      title: 'Test & Article with "quotes" and émojis 🚀',
      url: 'https://example.com/special'
    };

    const result = buildText(article);
    expect(result).toBe('🔖 Test & Article with "quotes" and émojis 🚀 https://example.com/special');
  });

  test('should handle empty title', () => {
    const article: Article = {
      id: '3',
      title: '',
      url: 'https://example.com/empty'
    };

    const result = buildText(article);
    expect(result).toBe('🔖  https://example.com/empty');
  });

  test('should handle very long titles', () => {
    const longTitle = 'A'.repeat(500);
    const article: Article = {
      id: '4',
      title: longTitle,
      url: 'https://example.com/long'
    };

    const result = buildText(article);
    expect(result).toBe(`🔖 ${longTitle} https://example.com/long`);
  });

  test('should handle URLs with query parameters', () => {
    const article: Article = {
      id: '5',
      title: 'Article with Query',
      url: 'https://example.com/article?utm_source=test&utm_medium=email'
    };

    const result = buildText(article);
    expect(result).toBe('🔖 Article with Query https://example.com/article?utm_source=test&utm_medium=email');
  });
});