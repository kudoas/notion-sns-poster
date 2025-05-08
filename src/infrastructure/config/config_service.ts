// import { Article } from './sns/interface'; // 不要なため削除

export interface NotionConfig {
  apiKey: string;
  databaseId: string;
}

export interface BlueskyConfig {
  identifier: string;
  password: string;
  service?: string;
}

export interface TwitterConfig {
  appKey: string;
  appSecret: string;
  accessToken: string;
  accessSecret: string;
}

export interface AppConfig {
  notion: NotionConfig;
  bluesky?: BlueskyConfig;
  twitter?: TwitterConfig;
}

export function loadAppConfig(env: any): AppConfig {
  const notionApiKey = env.NOTION_API_KEY as string;
  const notionDatabaseId = env.NOTION_DATABASE_ID as string;
  if (!notionApiKey || !notionDatabaseId) {
    throw new Error('Missing Notion API Key or Database ID in environment variables.');
  }

  const blueskyIdentifier = env.BLUESKY_IDENTIFIER as string;
  const blueskyPassword = env.BLUESKY_PASSWORD as string;
  const blueskyService = env.BLUESKY_SERVICE as string | undefined;

  const twitterAppKey = env.TWITTER_CONSUMER_KEY as string;
  const twitterAppSecret = env.TWITTER_CONSUMER_SECRET as string;
  const twitterAccessToken = env.TWITTER_ACCESS_TOKEN as string;
  const twitterAccessSecret = env.TWITTER_ACCESS_SECRET as string;

  const notionConfig: NotionConfig = { apiKey: notionApiKey, databaseId: notionDatabaseId };
  let blueskyConfig: BlueskyConfig | undefined;
  let twitterConfig: TwitterConfig | undefined;

  if (blueskyIdentifier && blueskyPassword) {
    blueskyConfig = { identifier: blueskyIdentifier, password: blueskyPassword, service: blueskyService };
  }

  if (twitterAppKey && twitterAppSecret && twitterAccessToken && twitterAccessSecret) {
    twitterConfig = { appKey: twitterAppKey, appSecret: twitterAppSecret, accessToken: twitterAccessToken, accessSecret: twitterAccessSecret };
  }

  if (!blueskyConfig && !twitterConfig) {
    throw new Error('No Bluesky or Twitter authentication credentials set.');
  }

  return {
    notion: notionConfig,
    bluesky: blueskyConfig,
    twitter: twitterConfig,
  };
} 
