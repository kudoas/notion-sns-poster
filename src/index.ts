import { Hono, Context } from 'hono'
import { provideBlueskyConfig, provideNotionConfig, provideTwitterConfig, provideGeminiConfig, provideNotionWebhookConfig } from './config'
import { NotionRepository, verifyNotionWebhookSignature } from './notion'
import { BlueskyPoster } from './sns/bluesky'
import { SnsPoster } from './sns/interface'
import { TwitterPoster } from './sns/twitter'
import { GoogleGenerativeAI } from '@google/generative-ai'

const app = new Hono()

app.get('/health-check', (c) => {
  return c.text('OK')
})

app.post('/notion-webhook', async (c: Context) => {
  try {
    const { message, status } = await webhookHandler(c)
    return c.text(message, status)
  } catch (error) {
    console.error('Error in webhook handler:', error)
    const message = error instanceof Error ? error.message : String(error)
    return c.text(`Error in webhook handler: ${message}`, 500)
  }
})

function extractVerificationToken(rawBody: string): string | null {
  try {
    const parsed = JSON.parse(rawBody) as { verification_token?: unknown }
    return typeof parsed.verification_token === 'string' ? parsed.verification_token : null
  } catch {
    return null
  }
}

async function webhookHandler(c: Context): Promise<{ message: string; status: 200 | 401 }> {
  const env = c.env
  const request = c.req.raw
  const rawBody = await c.req.text()
  const verificationTokenFromPayload = extractVerificationToken(rawBody)

  // Notion subscription verification flow sends a one-time verification_token.
  // It should be acknowledged with 200 and captured from Worker logs.
  if (verificationTokenFromPayload) {
    console.log(`Received Notion verification token: ${verificationTokenFromPayload}`)
    return {
      message: 'Verification token received. Check Worker logs for the token value.',
      status: 200,
    }
  }

  const { NotionVerificationToken: webhookVerificationToken } = provideNotionWebhookConfig(env)
  const verified = verifyNotionWebhookSignature(webhookVerificationToken, request, rawBody)
  if (!verified) {
    return { message: 'Invalid webhook signature', status: 401 }
  }

  const { NotionDatabaseId, NotionApiKey, NotionVerificationToken } = provideNotionConfig(env)
  const { BlueskyIdentifier, BlueskyPassword, BlueskyService } = provideBlueskyConfig(env)
  const { TwitterConsumerKey, TwitterConsumerSecret, TwitterAccessToken, TwitterAccessSecret } = provideTwitterConfig(env)
  const { GeminiApiKey } = provideGeminiConfig(env)

  const notion = new NotionRepository(NotionApiKey, NotionDatabaseId, NotionVerificationToken)
  const blueskyPoster = new BlueskyPoster(BlueskyIdentifier, BlueskyPassword, BlueskyService)
  const twitterPoster = new TwitterPoster(TwitterConsumerKey, TwitterConsumerSecret, TwitterAccessToken, TwitterAccessSecret)

  const genAI = new GoogleGenerativeAI(GeminiApiKey)
  const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash-latest' })

  const posters: SnsPoster[] = []
  posters.push(blueskyPoster)
  posters.push(twitterPoster)

  if (posters.length === 0) {
    throw new Error('No valid SNS posters found.')
  }

  try {
    const targetArticles = await notion.getUnpostedArticles()
    if (targetArticles.length === 0) {
      console.log('No articles to post based on current logic.')
      return { message: 'Webhook received successfully!', status: 200 }
    }

    for (const article of targetArticles) {
      if (article.url && article.url.trim().length > 0) {
        try {
          const prompt = `以下のURLの記事を日本語で3行以内で要約してください。要約結果だけを返してください。:\n\n${article.url}`
          const result = await model.generateContent(prompt)
          const response = result.response
          const summary = response.text()

          if (summary) {
            await notion.updateArticleSummary(article.id, summary.trim())
            console.log(`Summary generated and updated for article ${article.id} using URL: ${article.url}`)
          }
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error)
          console.error(`Error generating summary for article ${article.id} (URL: ${article.url}):`, message)
        }
      } else {
        console.log(`Article ${article.id} has no URL or URL is empty. Skipping summary generation.`)
      }

      const postPromises = posters.map((poster) =>
        poster.postArticle(article).catch((e: unknown) => {
          console.error(`Error posting article ${article.id} to one SNS:`, e)
          return { status: 'rejected', reason: e }
        })
      )
      await Promise.allSettled(postPromises)
      await notion.markArticleAsPosted(article.id)
    }
    return { message: 'Webhook received successfully!', status: 200 }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error('Error in scheduled handler:', message)
    throw error
  }
}

export default {
  fetch: app.fetch,
}
