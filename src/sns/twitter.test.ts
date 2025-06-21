import { describe, test, expect, mock, beforeEach, afterEach } from 'bun:test';
import { TwitterPoster } from './twitter';
import { createMockArticle } from '../test-utils';

// Mock global fetch
const mockFetch = mock(() => Promise.resolve());
global.fetch = mockFetch;

describe('TwitterPoster', () => {
  let twitterPoster: TwitterPoster;
  const mockCredentials = {
    consumerKey: 'test-consumer-key',
    consumerSecret: 'test-consumer-secret',
    accessToken: 'test-access-token',
    accessSecret: 'test-access-secret'
  };

  beforeEach(() => {
    twitterPoster = new TwitterPoster(
      mockCredentials.consumerKey,
      mockCredentials.consumerSecret,
      mockCredentials.accessToken,
      mockCredentials.accessSecret
    );
    mockFetch.mockClear();
  });

  afterEach(() => {
    mockFetch.mockRestore();
  });

  describe('postArticle', () => {
    test('should successfully post article to Twitter', async () => {
      const mockArticle = createMockArticle();
      
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 201,
        statusText: 'Created',
        text: async () => '{"data": {"id": "1234567890"}}',
        json: async () => ({ data: { id: '1234567890' } })
      });

      await expect(twitterPoster.postArticle(mockArticle)).resolves.toBeUndefined();
      
      expect(mockFetch).toHaveBeenCalledTimes(1);
      const fetchCall = mockFetch.mock.calls[0];
      expect(fetchCall[0]).toBe('https://api.twitter.com/2/tweets');
      expect(fetchCall[1].method).toBe('POST');
      expect(fetchCall[1].headers['Content-Type']).toBe('application/json');
      
      const body = JSON.parse(fetchCall[1].body);
      expect(body.text).toBe('🔖 Test Article Title https://example.com/test-article');
    });

    test('should include OAuth authorization headers', async () => {
      const mockArticle = createMockArticle();
      
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 201,
        statusText: 'Created',
        text: async () => '{"data": {"id": "1234567890"}}',
        json: async () => ({ data: { id: '1234567890' } })
      });

      await twitterPoster.postArticle(mockArticle);
      
      const fetchCall = mockFetch.mock.calls[0];
      const headers = fetchCall[1].headers;
      expect(headers.Authorization).toBeDefined();
      expect(headers.Authorization).toContain('OAuth');
      expect(headers.Authorization).toContain('oauth_consumer_key');
      expect(headers.Authorization).toContain('oauth_signature');
    });

    test('should throw error when Twitter API returns error status', async () => {
      const mockArticle = createMockArticle({ id: 'error-article' });
      
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 403,
        statusText: 'Forbidden',
        text: async () => '{"errors": [{"message": "Forbidden"}]}'
      });

      await expect(twitterPoster.postArticle(mockArticle)).rejects.toThrow(
        'Failed to post article error-article to Twitter: 403 Forbidden'
      );
    });

    test('should handle network errors', async () => {
      const mockArticle = createMockArticle();
      
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      await expect(twitterPoster.postArticle(mockArticle)).rejects.toThrow('Network error');
    });

    test('should handle API rate limit errors', async () => {
      const mockArticle = createMockArticle({ id: 'rate-limited' });
      
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 429,
        statusText: 'Too Many Requests',
        text: async () => '{"errors": [{"message": "Rate limit exceeded"}]}'
      });

      await expect(twitterPoster.postArticle(mockArticle)).rejects.toThrow(
        'Failed to post article rate-limited to Twitter: 429 Too Many Requests'
      );
    });

    test('should handle articles with special characters', async () => {
      const mockArticle = createMockArticle({
        title: 'Article with émojis 🚀 and "quotes"',
        url: 'https://example.com/special?param=value&other=test'
      });
      
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 201,
        statusText: 'Created',
        text: async () => '{"data": {"id": "1234567890"}}'
      });

      await twitterPoster.postArticle(mockArticle);
      
      const fetchCall = mockFetch.mock.calls[0];
      const body = JSON.parse(fetchCall[1].body);
      expect(body.text).toBe('🔖 Article with émojis 🚀 and "quotes" https://example.com/special?param=value&other=test');
    });

    test('should handle very long article titles', async () => {
      const longTitle = 'A'.repeat(200);
      const mockArticle = createMockArticle({
        title: longTitle,
        url: 'https://example.com/long'
      });
      
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 201,
        statusText: 'Created',
        text: async () => '{"data": {"id": "1234567890"}}'
      });

      await twitterPoster.postArticle(mockArticle);
      
      const fetchCall = mockFetch.mock.calls[0];
      const body = JSON.parse(fetchCall[1].body);
      expect(body.text).toBe(`🔖 ${longTitle} https://example.com/long`);
    });
  });

  describe('constructor', () => {
    test('should create instance with valid credentials', () => {
      const poster = new TwitterPoster('key', 'secret', 'token', 'tokenSecret');
      expect(poster).toBeInstanceOf(TwitterPoster);
    });
  });
});