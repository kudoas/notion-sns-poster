import { Hono } from 'hono'
import { provideBlueskyConfig, provideNotionConfig, provideTwitterConfig } from './config'
import { NotionRepository } from './notion'
import { BlueskyPoster } from './sns/bluesky'
import { SnsPoster } from './sns/interface'
import { TwitterPoster } from './sns/twitter'

const app = new Hono()

app.get('/health-check', (c) => {
  return c.text('OK')
})

app.get('/run-scheduled', async (c) => {
  console.log('Manually triggering scheduled handler...')
  try {
    await scheduledHandler(null, c.env as any, c.executionCtx)
    return c.text('Scheduled handler triggered successfully!')
  } catch (error) {
    console.error('Error triggering scheduled handler:', error);
    return c.text(`Error triggering scheduled handler: ${error.message}`, 500);
  }
})

async function scheduledHandler(event: any, env: any, ctx: any) {
  const { NotionDatabaseId, NotionApiKey } = provideNotionConfig(env)
  const { BlueskyIdentifier, BlueskyPassword, BlueskyService } = provideBlueskyConfig(env)
  const { TwitterConsumerKey, TwitterConsumerSecret, TwitterAccessToken, TwitterAccessSecret } = provideTwitterConfig(env)

  const notion = new NotionRepository(NotionApiKey, NotionDatabaseId)
  const blueskyPoster = new BlueskyPoster(BlueskyIdentifier, BlueskyPassword, BlueskyService)
  const twitterPoster = new TwitterPoster(TwitterConsumerKey, TwitterConsumerSecret, TwitterAccessToken, TwitterAccessSecret)

  const posters: SnsPoster[] = [];
  posters.push(blueskyPoster);
  posters.push(twitterPoster);

  if (posters.length === 0) {
    throw new Error('No valid SNS posters found.');
  }

  try {
    const targetArticles = await notion.getUnpostedArticles();
    if (targetArticles.length === 0) {
      console.log('No articles to post.');
      return;
    }

    // 1回の実行につき1件だけ投稿する
    const article = targetArticles[0];
    const postPromises = posters.map(poster => poster.postArticle(article).catch(e => {
      console.error(`Error posting article ${article.id} to one SNS:`, e);
      return { status: 'rejected', reason: e };
    }));
    await Promise.allSettled(postPromises);
    await notion.markArticleAsPosted(article.id);
  } catch (error) {
    console.error('Error in scheduled handler:', error.message);
    throw error;
  }
}

export default {
  fetch: app.fetch,
  scheduled: async (event: any, env: any, ctx: any) => {
    ctx.waitUntil(scheduledHandler(event, env, ctx));
  },
}; 
