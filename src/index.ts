import { GoogleGenerativeAI } from '@google/generative-ai'
import { type Context, Hono } from 'hono'
import {
  provideBlueskyConfig,
  provideGeminiConfig,
  provideNotionConfig,
  provideNotionWebhookConfig,
  provideTwitterConfig,
} from './config.ts'
import { NotionRepository, verifyNotionWebhookSignature } from './notion.ts'
import { BlueskyPoster } from './sns/bluesky.ts'
import type { SnsPoster } from './sns/interface.ts'
import { TwitterPoster } from './sns/twitter.ts'

const app: Hono = new Hono()

app.get('/health-check', (c) => c.text('OK'))

app.post('/notion-webhook', async (c: Context) => {
  try {
    const { message, status } = await webhookHandler(c)
    return c.text(message, status)
  } catch (error) {
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
    return {
      message: 'Verification token received. Check Worker logs for the token value.',
      status: 200,
    }
  }

  const { notionVerificationToken: webhookVerificationToken } = provideNotionWebhookConfig(env)
  const verified = verifyNotionWebhookSignature(webhookVerificationToken, request, rawBody)
  if (!verified) {
    return { message: 'Invalid webhook signature', status: 401 }
  }

  const { notionDatabaseId, notionApiKey, notionVerificationToken } = provideNotionConfig(env)
  const { blueskyIdentifier, blueskyPassword, blueskyService } = provideBlueskyConfig(env)
  const { twitterConsumerKey, twitterConsumerSecret, twitterAccessToken, twitterAccessSecret } = provideTwitterConfig(env)
  const { geminiApiKey } = provideGeminiConfig(env)

  const notion = new NotionRepository(notionApiKey, notionDatabaseId, notionVerificationToken)
  const blueskyPoster = new BlueskyPoster(blueskyIdentifier, blueskyPassword, blueskyService)
  const twitterPoster = new TwitterPoster(twitterConsumerKey, twitterConsumerSecret, twitterAccessToken, twitterAccessSecret)

  const genAi = new GoogleGenerativeAI(geminiApiKey)
  const model = genAi.getGenerativeModel({ model: 'gemini-1.5-flash-latest' })

  const posters: SnsPoster[] = []
  posters.push(blueskyPoster)
  posters.push(twitterPoster)

  if (posters.length === 0) {
    throw new Error('No valid SNS posters found.')
  }

  try {
    const targetArticles = await notion.getUnpostedArticles()
    if (targetArticles.length === 0) {
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
          }
        } catch (error) {
          const _message = error instanceof Error ? error.message : String(error)
        }
      } else {
      }

      const postPromises = posters.map((poster) =>
        poster.postArticle(article).catch((e: unknown) => {
          return { status: 'rejected', reason: e }
        }),
      )
      await Promise.allSettled(postPromises)
      await notion.markArticleAsPosted(article.id)
    }
    return { message: 'Webhook received successfully!', status: 200 }
  } catch (error) {
    const _message = error instanceof Error ? error.message : String(error)

    throw error
  }
}

export default {
  fetch: app.fetch,
}
