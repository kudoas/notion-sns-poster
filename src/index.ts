import { Hono, Context } from 'hono'
import { provideBlueskyConfig, provideNotionConfig, provideTwitterConfig } from './config'
import { NotionRepository } from './notion'
import { BlueskyPoster } from './sns/bluesky'
import { SnsPoster } from './sns/interface'
import { TwitterPoster } from './sns/twitter'

const app = new Hono()

app.get('/health-check', (c) => {
  return c.text('OK')
})

app.post('/notion-webhook', async (c: Context) => {
  try {
    await webhookHandler(c);
    return c.text('Webhook received successfully!')
  } catch (error) {
    console.error('Error in webhook handler:', error);
    const message = error instanceof Error ? error.message : String(error);
    return c.text(`Error in webhook handler: ${message}`, 500);
  }
})

async function webhookHandler(
  c: Context
) {
  const env = c.env;
  const request = c.req.raw;
  const rawBody = await c.req.text();

  const { NotionDatabaseId, NotionApiKey, NotionVerificationToken } = provideNotionConfig(env)
  const { BlueskyIdentifier, BlueskyPassword, BlueskyService } = provideBlueskyConfig(env)
  const { TwitterConsumerKey, TwitterConsumerSecret, TwitterAccessToken, TwitterAccessSecret } = provideTwitterConfig(env)

  const notion = new NotionRepository(NotionApiKey, NotionDatabaseId, NotionVerificationToken)
  const blueskyPoster = new BlueskyPoster(BlueskyIdentifier, BlueskyPassword, BlueskyService)
  const twitterPoster = new TwitterPoster(TwitterConsumerKey, TwitterConsumerSecret, TwitterAccessToken, TwitterAccessSecret)

  const verified = await notion.verifyWebhookSignature(request, rawBody);
  if (!verified) {
    throw new Error('Invalid webhook signature');
  }

  const posters: SnsPoster[] = [];
  posters.push(blueskyPoster);
  posters.push(twitterPoster);

  if (posters.length === 0) {
    throw new Error('No valid SNS posters found.');
  }

  try {
    const targetArticles = await notion.getUnpostedArticles();
    if (targetArticles.length === 0) {
      console.log('No articles to post based on current logic.');
      return;
    }

    for (const article of targetArticles) {
      const postPromises = posters.map(poster => poster.postArticle(article).catch(e => {
        console.error(`Error posting article ${article.id} to one SNS:`, e);
        return { status: 'rejected', reason: e };
      }));
      await Promise.allSettled(postPromises);
      await notion.markArticleAsPosted(article.id);
    }
  } catch (error) {
    console.error('Error in scheduled handler:', error.message);
    throw error;
  }
}

export default {
  fetch: app.fetch,
};
