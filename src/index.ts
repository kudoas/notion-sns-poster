import { Hono } from 'hono'
import { Client } from '@notionhq/client'
import { BlueskyPoster } from './sns/bluesky'
import { Article, SnsPoster } from './sns/interface'
import { TwitterPoster } from './sns/twitter'
import { iteratePaginatedAPI } from '@notionhq/client'

const app = new Hono()

app.get('/health-check', (c) => {
  return c.text('OK')
})

app.get('/run-scheduled', async (c) => {
  console.log('Manually triggering scheduled handler...')
  try {
    await scheduledHandler(null, c.env as any, c.executionCtx)
    return c.text('Scheduled handler triggered successfully!')
  } catch (error: any) {
    console.error('Error triggering scheduled handler:', error);
    return c.text(`Error triggering scheduled handler: ${error.message}`, 500);
  }
})

async function scheduledHandler(event: any, env: any, ctx: any) {
  const notionApiKey = env.NOTION_API_KEY as string
  const notionDatabaseId = env.NOTION_DATABASE_ID as string
  if (!notionApiKey || !notionDatabaseId) {
    console.error('No environment variables set (Notion).');
    return;
  }

  const blueskyIdentifier = env.BLUESKY_IDENTIFIER as string
  const blueskyPassword = env.BLUESKY_PASSWORD as string
  const blueskyService = env.BLUESKY_SERVICE as string | undefined

  const twitterAppKey = env.TWITTER_CONSUMER_KEY as string
  const twitterAppSecret = env.TWITTER_CONSUMER_SECRET as string
  const twitterAccessToken = env.TWITTER_ACCESS_TOKEN as string
  const twitterAccessSecret = env.TWITTER_ACCESS_SECRET as string

  const hasBlueskyAuth = blueskyIdentifier && blueskyPassword;
  const hasTwitterAuth = twitterAppKey && twitterAppSecret && twitterAccessToken && twitterAccessSecret;
  if (!hasBlueskyAuth && !hasTwitterAuth) {
    console.error('No Bluesky or Twitter authentication credentials set.');
    return;
  }

  // ref. https://github.com/makenotion/notion-sdk-js/pull/506
  const notion = new Client({ auth: notionApiKey, fetch: fetch.bind(globalThis) })
  const posters: SnsPoster[] = [];

  const blueskyPoster = new BlueskyPoster(blueskyIdentifier, blueskyPassword, blueskyService);
  posters.push(blueskyPoster);

  const twitterPoster = new TwitterPoster(twitterAppKey, twitterAppSecret, twitterAccessToken, twitterAccessSecret);
  posters.push(twitterPoster);

  if (posters.length === 0) {
    console.error('No valid SNS posters found.');
    return;
  }

  try {
    const articlesToPost: Article[] = []
    for await (const page of iteratePaginatedAPI(notion.databases.query, {
      database_id: notionDatabaseId,
      filter: {
        property: 'Posted',
        checkbox: { equals: false },
      },
    })) {
      const { properties } = page as any
      const titleProperty = properties.Title
      const urlProperty = properties.URL
      const pageId = page.id

      let title = '';
      if (titleProperty?.type === 'title') {
        title = titleProperty.title.map((t: any) => t.plain_text).join('');
      } else if (titleProperty?.type === 'rich_text') {
        title = titleProperty.rich_text.map((t: any) => t.plain_text).join('');
      }
      let url = urlProperty?.type === 'url' ? urlProperty.url : null;

      if (title && url) {
        articlesToPost.push({ id: pageId, title, url })
      } else {
        console.warn(`Skipping article ${pageId} due to missing Title or URL.`)
      }
    }

    for (const article of articlesToPost) {
      let postSuccessfulInAtLeastOneSns = false;
      const postPromises = posters.map(poster => poster.postArticle(article).catch(e => {
        console.error(`Error posting article ${article.id} to one SNS:`, e);
        return { status: 'rejected', reason: e };
      }));

      const results = await Promise.allSettled(postPromises);

      postSuccessfulInAtLeastOneSns = results.some(result => result.status === 'fulfilled');
      if (postSuccessfulInAtLeastOneSns) {
        try {
          await notion.pages.update({
            page_id: article.id,
            properties: {
              'Posted': {
                checkbox: true,
              },
            },
          });
        } catch (updateError) {
          console.error(`Failed to update Notion flag for article ${article.id}:`, updateError);
        }
      } else {
        console.warn(`Article ${article.id} failed to post to all configured SNS. Skipping Notion flag update.`)
      }
    }
  } catch (error: any) {
    console.error('Error in scheduled handler:', error.message);
  }
}

export default {
  fetch: app.fetch,
  scheduled: async (event: any, env: any, ctx: any) => {
    ctx.waitUntil(scheduledHandler(event, env, ctx));
  },
}; 
