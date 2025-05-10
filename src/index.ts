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

app.post('/notion-webhook', async (c) => {
  try {
    const body = await c.req.json()
    if (body.verification_token) {
      console.log('Received verification_token:', body.verification_token)
      // TODO: 将来的にはこのトークンを安全に保存し、ペイロード検証に使用します。
      // https://developers.notion.com/reference/webhooks#step-3-validating-event-payloads-recommended
      return c.json({ message: 'Verification token received. Please check your server logs.' })
    } else {
      console.warn('Verification token not found in request body:', body)
      return c.json({ error: 'Verification token not found' }, 400)
    }
  } catch (error) {
    console.error('Error handling Notion webhook:', error)
    return c.json({ error: 'Failed to process webhook' }, 500)
  }
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

type Env = { SKIP_HOURS: string };

function shouldSkip(now: Date, env: Env): boolean {
  const currentHour = now.getUTCHours();
  const skipHours = (env.SKIP_HOURS || "").split(",").map(Number);
  return skipHours.includes(currentHour);
}

export default {
  fetch: app.fetch,
  scheduled: async (event: any, env: any, ctx: any) => {
    const now = new Date();
    if (shouldSkip(now, env)) {
      console.log("Skipping scheduled task at " + now.toISOString());
      return;
    }
    ctx.waitUntil(scheduledHandler(event, env, ctx));
  },
};
