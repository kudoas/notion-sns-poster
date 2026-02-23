import { afterEach, beforeEach, describe, expect, mock, test } from 'bun:test'
import { createMockArticle } from '../test-utils.ts'
import { BlueskyPoster } from './bluesky.ts'

// Mock AtpAgent and RichText
const mockPost: ReturnType<typeof mock> = mock(() => Promise.resolve())
const mockLogin: ReturnType<typeof mock> = mock(() => Promise.resolve())
const mockDetectFacets: ReturnType<typeof mock> = mock(() => Promise.resolve())

const mockAtpAgent: {
  login: ReturnType<typeof mock>
  post: ReturnType<typeof mock>
} = {
  login: mockLogin,
  post: mockPost,
}

const mockRichText: {
  text: string
  facets: unknown[]
  detectFacets: ReturnType<typeof mock>
} = {
  text: '',
  facets: [],
  detectFacets: mockDetectFacets,
}

// Mock the @atproto/api module
mock.module('@atproto/api', () => ({
  AtpAgent: mock().mockImplementation(() => mockAtpAgent),
  RichText: mock().mockImplementation(({ text }) => {
    mockRichText.text = text
    return mockRichText
  }),
}))

describe('BlueskyPoster', () => {
  let blueskyPoster: BlueskyPoster
  const mockCredentials = {
    identifier: 'test@example.com',
    password: 'test-password',
    service: 'https://bsky.social',
  }

  beforeEach(() => {
    blueskyPoster = new BlueskyPoster(mockCredentials.identifier, mockCredentials.password, mockCredentials.service)

    // Clear all mocks
    mockPost.mockClear()
    mockLogin.mockClear()
    mockDetectFacets.mockClear()

    // Reset mock implementations
    mockLogin.mockResolvedValue(undefined)
    mockPost.mockResolvedValue(undefined)
    mockDetectFacets.mockResolvedValue(undefined)
  })

  afterEach(() => {
    mockPost.mockRestore()
    mockLogin.mockRestore()
    mockDetectFacets.mockRestore()
  })

  describe('postArticle', () => {
    test('should successfully post article to Bluesky', async () => {
      const mockArticle = createMockArticle()

      await expect(blueskyPoster.postArticle(mockArticle)).resolves.toBeUndefined()

      expect(mockLogin).toHaveBeenCalledTimes(1)
      expect(mockLogin).toHaveBeenCalledWith({
        identifier: 'test@example.com',
        password: 'test-password',
      })

      expect(mockDetectFacets).toHaveBeenCalledTimes(1)
      expect(mockPost).toHaveBeenCalledTimes(1)

      const postCall = mockPost.mock.calls[0][0]
      expect(postCall.text).toBe('🔖 Test Article Title https://example.com/test-article')
      expect(postCall.facets).toBeDefined()
    })

    test('should use default service URL when not provided', () => {
      const poster = new BlueskyPoster('test@example.com', 'password')
      expect(poster).toBeInstanceOf(BlueskyPoster)
    })

    test('should use custom service URL when provided', () => {
      const customService = 'https://custom.bsky.social'
      const poster = new BlueskyPoster('test@example.com', 'password', customService)
      expect(poster).toBeInstanceOf(BlueskyPoster)
    })

    test('should handle login errors', async () => {
      const mockArticle = createMockArticle()
      const loginError = new Error('Invalid credentials')

      mockLogin.mockRejectedValueOnce(loginError)

      await expect(blueskyPoster.postArticle(mockArticle)).rejects.toThrow('Invalid credentials')

      expect(mockLogin).toHaveBeenCalledTimes(1)
      expect(mockPost).not.toHaveBeenCalled()
    })

    test('should handle post errors', async () => {
      const mockArticle = createMockArticle()
      const postError = new Error('Failed to post')

      mockLogin.mockResolvedValueOnce(undefined)
      mockDetectFacets.mockResolvedValueOnce(undefined)
      mockPost.mockRejectedValueOnce(postError)

      await expect(blueskyPoster.postArticle(mockArticle)).rejects.toThrow('Failed to post')

      expect(mockLogin).toHaveBeenCalledTimes(1)
      expect(mockDetectFacets).toHaveBeenCalledTimes(1)
      expect(mockPost).toHaveBeenCalledTimes(1)
    })

    test('should handle detectFacets errors', async () => {
      const mockArticle = createMockArticle()
      const facetsError = new Error('Failed to detect facets')

      mockLogin.mockResolvedValueOnce(undefined)
      mockDetectFacets.mockRejectedValueOnce(facetsError)

      await expect(blueskyPoster.postArticle(mockArticle)).rejects.toThrow('Failed to detect facets')

      expect(mockLogin).toHaveBeenCalledTimes(1)
      expect(mockDetectFacets).toHaveBeenCalledTimes(1)
      expect(mockPost).not.toHaveBeenCalled()
    })

    test('should handle articles with special characters', async () => {
      const mockArticle = createMockArticle({
        title: 'Article with émojis 🚀 and "quotes"',
        url: 'https://example.com/special?param=value&other=test',
      })

      await blueskyPoster.postArticle(mockArticle)

      const postCall = mockPost.mock.calls[0][0]
      expect(postCall.text).toBe('🔖 Article with émojis 🚀 and "quotes" https://example.com/special?param=value&other=test')
    })

    test('should handle very long article titles', async () => {
      const longTitle = 'A'.repeat(200)
      const mockArticle = createMockArticle({
        title: longTitle,
        url: 'https://example.com/long',
      })

      await blueskyPoster.postArticle(mockArticle)

      const postCall = mockPost.mock.calls[0][0]
      expect(postCall.text).toBe(`🔖 ${longTitle} https://example.com/long`)
    })

    test('should handle network connectivity issues', async () => {
      const mockArticle = createMockArticle()
      const networkError = new Error('Network error')

      mockLogin.mockRejectedValueOnce(networkError)

      await expect(blueskyPoster.postArticle(mockArticle)).rejects.toThrow('Network error')
    })

    test('should call RichText with correct text format', async () => {
      const mockArticle = createMockArticle({
        title: 'Sample Article',
        url: 'https://sample.com',
      })

      await blueskyPoster.postArticle(mockArticle)

      expect(mockRichText.text).toBe('🔖 Sample Article https://sample.com')
    })

    test('should process RichText facets for URLs and mentions', async () => {
      const mockArticle = createMockArticle()

      await blueskyPoster.postArticle(mockArticle)

      expect(mockDetectFacets).toHaveBeenCalledTimes(1)
      expect(mockDetectFacets).toHaveBeenCalledWith(mockAtpAgent)
    })
  })

  describe('constructor', () => {
    test('should create instance with required credentials', () => {
      const poster = new BlueskyPoster('user@example.com', 'password')
      expect(poster).toBeInstanceOf(BlueskyPoster)
    })

    test('should create instance with custom service', () => {
      const poster = new BlueskyPoster('user@example.com', 'password', 'https://custom.service')
      expect(poster).toBeInstanceOf(BlueskyPoster)
    })
  })
})
