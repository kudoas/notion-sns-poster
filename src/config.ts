interface TwitterConfig {
  TwitterConsumerKey: string
  TwitterConsumerSecret: string
  TwitterAccessToken: string
  TwitterAccessSecret: string
}

interface NotionConfig {
  NotionDatabaseId: string
  NotionApiKey: string
  NotionVerificationToken: string
}

interface NotionWebhookConfig {
  NotionVerificationToken: string
}

interface BlueskyConfig {
  BlueskyIdentifier: string
  BlueskyPassword: string
  BlueskyService: string
}

interface GeminiConfig {
  GeminiApiKey: string
}

export function provideTwitterConfig(env: any): TwitterConfig {
  const TwitterConsumerKey = env.TWITTER_CONSUMER_KEY as string
  const TwitterConsumerSecret = env.TWITTER_CONSUMER_SECRET as string
  const TwitterAccessToken = env.TWITTER_ACCESS_TOKEN as string
  const TwitterAccessSecret = env.TWITTER_ACCESS_SECRET as string
  if (!TwitterConsumerKey || !TwitterConsumerSecret || !TwitterAccessToken || !TwitterAccessSecret) {
    const notSetKeys = [
      !TwitterConsumerKey && 'TWITTER_CONSUMER_KEY',
      !TwitterConsumerSecret && 'TWITTER_CONSUMER_SECRET',
      !TwitterAccessToken && 'TWITTER_ACCESS_TOKEN',
      !TwitterAccessSecret && 'TWITTER_ACCESS_SECRET',
    ]
      .filter(Boolean)
      .join(', ')
    throw new Error(`${notSetKeys} must be set`)
  }

  return { TwitterConsumerKey, TwitterConsumerSecret, TwitterAccessToken, TwitterAccessSecret }
}

export function provideNotionConfig(env: any): NotionConfig {
  const NotionDatabaseId = env.NOTION_DATABASE_ID
  const NotionApiKey = env.NOTION_API_KEY
  const NotionVerificationToken = env.NOTION_VERIFICATION_TOKEN
  if (!NotionDatabaseId || !NotionApiKey || !NotionVerificationToken) {
    const notSetKeys = [
      !NotionDatabaseId && 'NOTION_DATABASE_ID',
      !NotionApiKey && 'NOTION_API_KEY',
      !NotionVerificationToken && 'NOTION_VERIFICATION_TOKEN',
    ]
      .filter(Boolean)
      .join(', ')
    throw new Error(`${notSetKeys} must be set`)
  }

  return { NotionDatabaseId, NotionApiKey, NotionVerificationToken }
}

export function provideNotionWebhookConfig(env: any): NotionWebhookConfig {
  const NotionVerificationToken = env.NOTION_VERIFICATION_TOKEN
  if (!NotionVerificationToken) {
    throw new Error('NOTION_VERIFICATION_TOKEN must be set')
  }

  return { NotionVerificationToken }
}

export function provideBlueskyConfig(env: any): BlueskyConfig {
  const BlueskyIdentifier = env.BLUESKY_IDENTIFIER
  const BlueskyPassword = env.BLUESKY_PASSWORD
  const BlueskyService = env.BLUESKY_SERVICE || 'https://bsky.social'
  if (!BlueskyIdentifier || !BlueskyPassword || !BlueskyService) {
    const notSetKeys = [
      !BlueskyIdentifier && 'BLUESKY_IDENTIFIER',
      !BlueskyPassword && 'BLUESKY_PASSWORD',
      !BlueskyService && 'BLUESKY_SERVICE',
    ]
      .filter(Boolean)
      .join(', ')
    throw new Error(`${notSetKeys} must be set`)
  }

  return { BlueskyIdentifier, BlueskyPassword, BlueskyService }
}

export function provideGeminiConfig(env: any): GeminiConfig {
  const GeminiApiKey = env.GEMINI_API_KEY as string
  if (!GeminiApiKey) {
    throw new Error('GEMINI_API_KEY must be set')
  }
  return { GeminiApiKey }
}
