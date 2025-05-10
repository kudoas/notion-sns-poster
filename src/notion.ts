import { Client, iteratePaginatedAPI } from '@notionhq/client';
import { Article } from './sns/interface';

export class NotionRepository {
  private notion: Client;

  constructor(
    private readonly notionApiKey: string,
    private readonly databaseId: string,
  ) {
    this.notion = new Client({ auth: this.notionApiKey, fetch: fetch.bind(globalThis) });
  }

  async getUnpostedArticles(): Promise<Article[]> {
    const articles: Article[] = [];
    for await (const page of iteratePaginatedAPI(this.notion.databases.query, {
      database_id: this.databaseId,
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
    })) {
      const { properties } = page as any;
      const titleProperty = properties.Title;
      const urlProperty = properties.URL;
      const pageId = page.id;

      let title = '';
      if (titleProperty?.type === 'title') {
        title = titleProperty.title.map((t: any) => t.plain_text).join('');
      } else if (titleProperty?.type === 'rich_text') {
        title = titleProperty.rich_text.map((t: any) => t.plain_text).join('');
      }
      let url = urlProperty?.type === 'url' ? urlProperty.url : null;

      if (title && url) {
        articles.push({ id: pageId, title, url });
      }
    }
    return articles;
  }

  async markArticleAsPosted(id: string): Promise<void> {
    await this.notion.pages.update({
      page_id: id,
      properties: {
        'Posted': {
          checkbox: true,
        },
      },
    });
  }
}
