import { Client, iteratePaginatedAPI } from '@notionhq/client';
import { Article } from '../../domain/model/article';
import { NotionConfig } from '../config/config_service';
import { INotionRepository } from '../../domain/repository/notion_repository';

export class NotionApiRepository implements INotionRepository {
  private notion: Client;
  private databaseId: string;

  constructor(config: NotionConfig) {
    this.notion = new Client({ auth: config.apiKey, fetch: fetch.bind(globalThis) });
    this.databaseId = config.databaseId;
  }

  async getUnpostedArticles(): Promise<Article[]> {
    console.log('NotionApiRepository: Searching for unposted articles in Notion database: ' + this.databaseId);
    const articlesToPost: Article[] = [];
    for await (const page of iteratePaginatedAPI(this.notion.databases.query, {
      database_id: this.databaseId,
      filter: {
        property: 'Posted',
        checkbox: { equals: false },
      },
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
        articlesToPost.push({ id: pageId, title, url });
      } else {
        console.warn(`NotionApiRepository: Skipping article ${pageId} due to missing Title or URL.`);
      }
    }
    console.log(`NotionApiRepository: Found ${articlesToPost.length} unposted articles.`);
    return articlesToPost;
  }

  async markArticleAsPosted(articleId: string): Promise<void> {
    console.log(`NotionApiRepository: Updating Notion flag for article ${articleId}.`);
    try {
      await this.notion.pages.update({
        page_id: articleId,
        properties: {
          'Posted': {
            checkbox: true,
          },
        },
      });
      console.log(`NotionApiRepository: Notion flag updated for article ${articleId}.`);
    } catch (updateError) {
      console.error(`NotionApiRepository: Failed to update Notion flag for article ${articleId}:`, updateError);
      throw updateError;
    }
  }
} 
