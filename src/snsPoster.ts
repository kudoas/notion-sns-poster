import { AtpAgent, RichText } from '@atproto/api'

export type Article = {
  id: string;
  title: string;
  url: string;
}

export interface SnsPoster {
  postArticle(article: Article): Promise<void>;
}

export class BlueskyPoster implements SnsPoster {
  #agent: AtpAgent;

  constructor() {
    this.#agent = new AtpAgent({ service: 'https://bsky.social' })
  }

  async postArticle(article: Article): Promise<void> {
    console.log(`Posting article to Bluesky: ${article.title}`)

    const text = `🔖 ${article.title} ${article.url}`;
    const rt = new RichText({ text });
    await rt.detectFacets(this.#agent);

    try {
      await this.#agent.post({ text: rt.text, facets: rt.facets });
      console.log('Bluesky post successful.');
    } catch (e) {
      console.error('Failed to post to Bluesky:', e.message);
      throw e;
    }
  }

  async login(params: { identifier: string; password: string; service?: string }): Promise<void> {
    await this.#agent.login(params);
  }
} 
