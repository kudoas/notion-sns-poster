interface TwitterConfig {
  TwitterConsumerKey: string
  TwitterConsumerSecret: string
  TwitterAccessToken: string
  TwitterAccessSecret: string
}

interface NotionConfig {
  NotionDatabaseId: string
  NotionApiKey: string
}

interface BlueskyConfig {
  BlueskyIdentifier: string
  BlueskyPassword: string
  BlueskyService: string
}

export function provideTwitterConfig(env: any): TwitterConfig {
  const TwitterConsumerKey = env.TWITTER_CONSUMER_KEY as string
  const TwitterConsumerSecret = env.TWITTER_CONSUMER_SECRET as string
  const TwitterAccessToken = env.TWITTER_ACCESS_TOKEN as string
  const TwitterAccessSecret = env.TWITTER_ACCESS_SECRET as string
  if (!TwitterConsumerKey || !TwitterConsumerSecret || !TwitterAccessToken || !TwitterAccessSecret) {
    throw new Error('TWITTER_CONSUMER_KEY, TWITTER_CONSUMER_SECRET, TWITTER_ACCESS_TOKEN, and TWITTER_ACCESS_TOKEN_SECRET must be set')
  }

  return { TwitterConsumerKey, TwitterConsumerSecret, TwitterAccessToken, TwitterAccessSecret }
}

export function provideNotionConfig(env: any): NotionConfig {
  const NotionDatabaseId = env.NOTION_DATABASE_ID
  const NotionApiKey = env.NOTION_API_KEY
  if (!NotionDatabaseId || !NotionApiKey) {
    throw new Error('NOTION_DATABASE_ID and NOTION_API_KEY must be set')
  }

  return { NotionDatabaseId, NotionApiKey }
}

export function provideBlueskyConfig(env: any): BlueskyConfig {
  const BlueskyIdentifier = env.BLUESKY_IDENTIFIER
  const BlueskyPassword = env.BLUESKY_PASSWORD
  const BlueskyService = env.BLUESKY_SERVICE || 'https://bsky.social'
  if (!BlueskyIdentifier || !BlueskyPassword || !BlueskyService) {
    throw new Error('BLUESKY_IDENTIFIER, BLUESKY_PASSWORD, and BLUESKY_SERVICE must be set')
  }

  return { BlueskyIdentifier, BlueskyPassword, BlueskyService }
}
