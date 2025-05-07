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
  console.log('Scheduler triggered!')

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

  const notion = new Client({ auth: notionApiKey })
  const posters: SnsPoster[] = [];

  if (hasBlueskyAuth) {
    const blueskyPoster = new BlueskyPoster();
    try {
      await blueskyPoster.login({ identifier: blueskyIdentifier, password: blueskyPassword, service: blueskyService });
      posters.push(blueskyPoster);
    } catch (error) {
      console.error('Failed to initialize Bluesky poster:', error);
    }
  }

  if (hasTwitterAuth) {
    const twitterPoster = new TwitterPoster(twitterAppKey, twitterAppSecret, twitterAccessToken, twitterAccessSecret);
    posters.push(twitterPoster);
  }

  if (posters.length === 0) {
    console.error('No valid SNS posters found.');
    return;
  }

  console.log(`Using ${posters.length} SNS poster(s).`);

  try {
    console.log('Searching for unposted articles in Notion database: ' + notionDatabaseId)

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

      console.log('page', page)

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

    console.log(`Prepared ${articlesToPost.length} articles for posting.`)

    for (const article of articlesToPost) {
      let postSuccessfulInAtLeastOneSns = false;
      const postPromises = posters.map(poster => poster.postArticle(article).catch(e => {
        console.error(`Error posting article ${article.id} to one SNS:`, e);
        return { status: 'rejected', reason: e };
      }));

      const results = await Promise.allSettled(postPromises);

      postSuccessfulInAtLeastOneSns = results.some(result => result.status === 'fulfilled');

      if (postSuccessfulInAtLeastOneSns) {
        console.log(`Article ${article.id} posted successfully to at least one SNS. Updating Notion flag.`)
        try {
          await notion.pages.update({
            page_id: article.id,
            properties: {
              'Posted': {
                checkbox: true,
              },
            },
          });
          console.log(`Notion flag updated for article ${article.id}.`);
        } catch (updateError) {
          console.error(`Failed to update Notion flag for article ${article.id}:`, updateError);
        }
      } else {
        console.warn(`Article ${article.id} failed to post to all configured SNS. Skipping Notion flag update.`)
      }
    }

    console.log('Scheduler execution finished.')

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
