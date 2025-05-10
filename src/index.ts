import { Hono } from 'hono'
import { Client } from '@notionhq/client'
import { BlueskyPoster } from './sns/bluesky'
import { Article, SnsPoster } from './sns/interface'
import { TwitterPoster } from './sns/twitter'
import { iteratePaginatedAPI } from '@notionhq/client'
import { provideBlueskyConfig, provideNotionConfig, provideTwitterConfig } from './config'

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
  const { NotionDatabaseId, NotionApiKey } = provideNotionConfig(env)
  const { BlueskyIdentifier, BlueskyPassword, BlueskyService } = provideBlueskyConfig(env)
  const { TwitterConsumerKey, TwitterConsumerSecret, TwitterAccessToken, TwitterAccessSecret } = provideTwitterConfig(env)

  // ref. https://github.com/makenotion/notion-sdk-js/pull/506
  const notion = new Client({ auth: NotionApiKey, fetch: fetch.bind(globalThis) })
  const blueskyPoster = new BlueskyPoster(BlueskyIdentifier, BlueskyPassword, BlueskyService)
  const twitterPoster = new TwitterPoster(TwitterConsumerKey, TwitterConsumerSecret, TwitterAccessToken, TwitterAccessSecret)

  const posters: SnsPoster[] = [];
  posters.push(blueskyPoster);
  posters.push(twitterPoster);

  if (posters.length === 0) {
    console.error('No valid SNS posters found.');
    return;
  }

  try {
    const articlesToPost: Article[] = []
    for await (const page of iteratePaginatedAPI(notion.databases.query, {
      database_id: NotionDatabaseId,
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
