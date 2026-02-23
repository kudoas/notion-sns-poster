interface TwitterConfig {
  twitterConsumerKey: string
  twitterConsumerSecret: string
  twitterAccessToken: string
  twitterAccessSecret: string
}

interface NotionConfig {
  notionDatabaseId: string
  notionApiKey: string
  notionVerificationToken: string
}

interface NotionWebhookConfig {
  notionVerificationToken: string
}

interface BlueskyConfig {
  blueskyIdentifier: string
  blueskyPassword: string
  blueskyService: string
}

interface GeminiConfig {
  geminiApiKey: string
}

type EnvLike = Record<string, unknown>

function readEnv(env: unknown, key: string): string | undefined {
  if (typeof env !== 'object' || env === null) {
    return
  }

  const value = (env as EnvLike)[key]
  if (typeof value === 'string' && value.length > 0) {
    return value
  }
}

export function provideTwitterConfig(env: unknown): TwitterConfig {
  const twitterConsumerKey = readEnv(env, 'TWITTER_CONSUMER_KEY')
  const twitterConsumerSecret = readEnv(env, 'TWITTER_CONSUMER_SECRET')
  const twitterAccessToken = readEnv(env, 'TWITTER_ACCESS_TOKEN')
  const twitterAccessSecret = readEnv(env, 'TWITTER_ACCESS_SECRET')
  if (!(twitterConsumerKey && twitterConsumerSecret && twitterAccessToken && twitterAccessSecret)) {
    const notSetKeys = [
      !twitterConsumerKey && 'TWITTER_CONSUMER_KEY',
      !twitterConsumerSecret && 'TWITTER_CONSUMER_SECRET',
      !twitterAccessToken && 'TWITTER_ACCESS_TOKEN',
      !twitterAccessSecret && 'TWITTER_ACCESS_SECRET',
    ]
      .filter(Boolean)
      .join(', ')
    throw new Error(`${notSetKeys} must be set`)
  }

  return {
    twitterConsumerKey,
    twitterConsumerSecret,
    twitterAccessToken,
    twitterAccessSecret,
  }
}

export function provideNotionConfig(env: unknown): NotionConfig {
  const notionDatabaseId = readEnv(env, 'NOTION_DATABASE_ID')
  const notionApiKey = readEnv(env, 'NOTION_API_KEY')
  const notionVerificationToken = readEnv(env, 'NOTION_VERIFICATION_TOKEN')
  if (!(notionDatabaseId && notionApiKey && notionVerificationToken)) {
    const notSetKeys = [
      !notionDatabaseId && 'NOTION_DATABASE_ID',
      !notionApiKey && 'NOTION_API_KEY',
      !notionVerificationToken && 'NOTION_VERIFICATION_TOKEN',
    ]
      .filter(Boolean)
      .join(', ')
    throw new Error(`${notSetKeys} must be set`)
  }

  return { notionDatabaseId, notionApiKey, notionVerificationToken }
}

export function provideNotionWebhookConfig(env: unknown): NotionWebhookConfig {
  const notionVerificationToken = readEnv(env, 'NOTION_VERIFICATION_TOKEN')
  if (!notionVerificationToken) {
    throw new Error('NOTION_VERIFICATION_TOKEN must be set')
  }

  return { notionVerificationToken }
}

export function provideBlueskyConfig(env: unknown): BlueskyConfig {
  const blueskyIdentifier = readEnv(env, 'BLUESKY_IDENTIFIER')
  const blueskyPassword = readEnv(env, 'BLUESKY_PASSWORD')
  const blueskyService = readEnv(env, 'BLUESKY_SERVICE') ?? 'https://bsky.social'
  if (!(blueskyIdentifier && blueskyPassword && blueskyService)) {
    const notSetKeys = [
      !blueskyIdentifier && 'BLUESKY_IDENTIFIER',
      !blueskyPassword && 'BLUESKY_PASSWORD',
      !blueskyService && 'BLUESKY_SERVICE',
    ]
      .filter(Boolean)
      .join(', ')
    throw new Error(`${notSetKeys} must be set`)
  }

  return { blueskyIdentifier, blueskyPassword, blueskyService }
}

export function provideGeminiConfig(env: unknown): GeminiConfig {
  const geminiApiKey = readEnv(env, 'GEMINI_API_KEY')
  if (!geminiApiKey) {
    throw new Error('GEMINI_API_KEY must be set')
  }
  return { geminiApiKey }
}
