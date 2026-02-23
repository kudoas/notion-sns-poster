import * as notionClient from '@notionhq/client'
import hmacSha256 from 'crypto-js/hmac-sha256'
import type { Article } from './sns/interface.ts'

interface NotionTextFragment {
  plain_text: string
}
interface NotionTitleProperty {
  type: 'title'
  title: NotionTextFragment[]
}
interface NotionRichTextProperty {
  type: 'rich_text'
  rich_text: NotionTextFragment[]
}
interface NotionUrlProperty {
  type: 'url'
  url: string | null
}
interface NotionPageProperties {
  Title?: NotionTitleProperty | NotionRichTextProperty
  URL?: NotionUrlProperty
}

function _maskSignature(signature: string): string {
  if (signature.length <= 24) {
    return signature
  }

  return `${signature.slice(0, 12)}...${signature.slice(-12)}`
}

function timingSafeEqualString(left: string, right: string): boolean {
  if (left.length !== right.length) {
    return false
  }

  let diff = 0
  for (let index = 0; index < left.length; index += 1) {
    diff |= left.charCodeAt(index) ^ right.charCodeAt(index)
  }

  return diff === 0
}

export function verifyNotionWebhookSignature(verificationToken: string, request: Request, rawBody: string): boolean {
  const signature = request.headers.get('X-Notion-Signature')
  if (!signature) {
    return false
  }

  try {
    const calculatedSignature = `sha256=${hmacSha256(rawBody, verificationToken).toString()}`
    if (signature.length !== calculatedSignature.length) {
      return false
    }

    return timingSafeEqualString(signature, calculatedSignature)
  } catch {
    return false
  }
}

export class NotionRepository {
  private readonly notion: notionClient.Client

  constructor(
    private readonly notionApiKey: string,
    private readonly databaseId: string,
    private readonly verificationToken: string,
  ) {
    this.notion = new notionClient.Client({
      auth: this.notionApiKey,
      fetch: fetch.bind(globalThis),
    })
  }

  /**
   * @see https://developers.notion.com/reference/webhooks#step-3-validating-event-payloads-recommended
   */
  async verifyWebhookSignature(request: Request, rawBody: string): Promise<boolean> {
    return verifyNotionWebhookSignature(this.verificationToken, request, rawBody)
  }

  private async getPrimaryDataSourceId(): Promise<string> {
    const database = await this.notion.databases.retrieve({
      database_id: this.databaseId,
    })
    if (!notionClient.isFullDatabase(database)) {
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

    for await (const page of notionClient.iteratePaginatedAPI(this.notion.dataSources.query, {
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

      const { properties } = page as { properties: NotionPageProperties }
      const titleProperty = properties.Title
      const urlProperty = properties.URL
      const pageId = page.id

      let title = ''
      if (titleProperty?.type === 'title') {
        title = titleProperty.title.map((t) => t.plain_text).join('')
      } else if (titleProperty?.type === 'rich_text') {
        title = titleProperty.rich_text.map((t) => t.plain_text).join('')
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
