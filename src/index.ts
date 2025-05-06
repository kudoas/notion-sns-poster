import { Hono } from 'hono'
import { Client } from '@notionhq/client'
import { BlueskyPoster } from './sns/bluesky'
import { Article } from './sns/interface'

const app = new Hono()

app.get('/health-check', (c) => {
  return c.text('OK')
})

app.get('/run-scheduled', async (c) => {
  console.log('Manually triggering scheduled handler...')
  try {
    await scheduledHandler(null, c.env as any, null)
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
  const blueskyIdentifier = env.BLUESKY_IDENTIFIER as string
  const blueskyPassword = env.BLUESKY_PASSWORD as string

  if (!notionApiKey || !notionDatabaseId || !blueskyIdentifier || !blueskyPassword) {
    console.error('Need to set environment variables.')
    throw new Error('Need to set environment variables.');
  }

  const notion = new Client({ auth: notionApiKey })
  const blueskyPoster = new BlueskyPoster()

  try {
    console.log('Logging in to Bluesky...')
    await blueskyPoster.login({
      identifier: blueskyIdentifier,
      password: blueskyPassword,
    })
    console.log('Bluesky login successful.')
    console.log(`Searching for unposted articles in Notion database: ${notionDatabaseId}`)

    const response = await notion.databases.query({
      database_id: notionDatabaseId,
      filter: {
        // Need to change the property name to "Posted" in Notion.
        property: 'Posted',
        checkbox: { equals: false },
      },
    })

    const articlesToPost: Article[] = []
    for (const page of response.results) {
      const titleProperty = (page as any).properties.Title
      const urlProperty = (page as any).properties.URL
      const pageId = page.id

      const title = titleProperty.title.map((t: any) => t.plain_text).join('');
      const url = urlProperty.url
      if (title && url) {
        articlesToPost.push({
          id: pageId,
          title: title,
          url: url,
        })
      } else {
        console.warn(`Skipping page ${pageId} due to missing or invalid title or URL property.`)
      }
    }

    for (const article of articlesToPost) {
      try {
        console.log(`Attempting to post article: ${article.title}`)
        await blueskyPoster.postArticle(article)
        console.log(`Successfully posted article: ${article.title}`)

        await notion.pages.update({
          page_id: article.id,
          properties: {
            Posted: { checkbox: true },
          },
        })
        console.log(`Notion flag updated for article: ${article.title}`)

      } catch (postError: any) {
        console.error(`Failed to process article ${article.title}: ${postError.message}`)
      }
    }

    console.log('Scheduler execution finished.')

  } catch (error: any) {
    console.error(`An error occurred during scheduled task: ${error.message}`)
    throw error;
  }
}

export default {
  fetch: app.fetch,
  scheduled: scheduledHandler,
}; 
