import { Client, isFullDatabase, iteratePaginatedAPI } from '@notionhq/client'
import { createHmac, timingSafeEqual } from 'node:crypto'
import { Article } from './sns/interface'

function maskSignature(signature: string): string {
  if (signature.length <= 24) {
    return signature
  }

  return `${signature.slice(0, 12)}...${signature.slice(-12)}`
}

export function verifyNotionWebhookSignature(verificationToken: string, request: Request, rawBody: string): boolean {
  const signature = request.headers.get('X-Notion-Signature')
  if (!signature) {
    console.error('Missing X-Notion-Signature header in received request')
    return false
  }

  try {
    const calculatedSignature = `sha256=${createHmac('sha256', verificationToken).update(rawBody).digest('hex')}`

    const sigBuffer = Buffer.from(signature)
    const calculatedSigBuffer = Buffer.from(calculatedSignature)

    if (sigBuffer.length !== calculatedSigBuffer.length) {
      console.error(
        `Signature length mismatch. receivedLength=${sigBuffer.length}, expectedLength=${calculatedSigBuffer.length}, received=${maskSignature(signature)}, expected=${maskSignature(calculatedSignature)}`
      )
      return false
    }

    const isValid = timingSafeEqual(sigBuffer, calculatedSigBuffer)
    if (!isValid) {
      console.error(`Signature mismatch. received=${maskSignature(signature)}, expected=${maskSignature(calculatedSignature)}`)
    }

    return isValid
  } catch (error) {
    console.error('Error during signature calculation or comparison:', error)
    return false
  }
}

export class NotionRepository {
  private notion: Client

  constructor(
    private readonly notionApiKey: string,
    private readonly databaseId: string,
    private readonly verificationToken: string
  ) {
    this.notion = new Client({ auth: this.notionApiKey, fetch: fetch.bind(globalThis) })
  }

  /**
   * @see https://developers.notion.com/reference/webhooks#step-3-validating-event-payloads-recommended
   */
  async verifyWebhookSignature(request: Request, rawBody: string): Promise<boolean> {
    return verifyNotionWebhookSignature(this.verificationToken, request, rawBody)
  }

  private async getPrimaryDataSourceId(): Promise<string> {
    const database = await this.notion.databases.retrieve({ database_id: this.databaseId })
    if (!isFullDatabase(database)) {
      throw new Error(`Failed to retrieve full database schema for database: ${this.databaseId}`)
    }

    const primaryDataSource = database.data_sources[0]
    if (!primaryDataSource?.id) {
      throw new Error(`No data source found in database: ${this.databaseId}`)
    }

    return primaryDataSource.id
  }

  async getUnpostedArticles(): Promise<Article[]> {
    const articles: Article[] = []
    const dataSourceId = await this.getPrimaryDataSourceId()

    for await (const page of iteratePaginatedAPI(this.notion.dataSources.query, {
      data_source_id: dataSourceId,
      filter: {
        property: 'Posted',
        checkbox: { equals: false },
      },
      sorts: [
        {
          timestamp: 'created_time',
          direction: 'ascending',
        },
      ],
      result_type: 'page',
    })) {
      if (page.object !== 'page' || !('properties' in page)) {
        continue
      }

      const { properties } = page as any
      const titleProperty = properties.Title
      const urlProperty = properties.URL
      const pageId = page.id

      let title = ''
      if (titleProperty?.type === 'title') {
        title = titleProperty.title.map((t: any) => t.plain_text).join('')
      } else if (titleProperty?.type === 'rich_text') {
        title = titleProperty.rich_text.map((t: any) => t.plain_text).join('')
      }
      const url = urlProperty?.type === 'url' ? urlProperty.url : null

      if (title && url) {
        articles.push({ id: pageId, title, url })
      }
    }
    return articles
  }

  async markArticleAsPosted(id: string): Promise<void> {
    await this.notion.pages.update({
      page_id: id,
      properties: {
        Posted: {
          checkbox: true,
        },
      },
    })
  }

  async updateArticleSummary(articleId: string, summary: string): Promise<void> {
    await this.notion.pages.update({
      page_id: articleId,
      properties: {
        AISummary: {
          rich_text: [
            {
              text: {
                content: summary,
              },
            },
          ],
        },
      },
    })
  }
}
