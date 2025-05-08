import { AtpAgent, RichText } from '@atproto/api'
import { Article } from '../../domain/model/article';
import { SnsPoster } from '../../domain/model/sns_poster';
import { buildText } from './utils';

export class BlueskyPoster implements SnsPoster {
  #agent: AtpAgent;

  constructor(serviceUrl: string = 'https://bsky.social') {
    this.#agent = new AtpAgent({ service: serviceUrl });
  }

  async postArticle(article: Article): Promise<void> {
    console.log(`BlueskyPoster: Posting article to Bluesky: ${article.title}`);

    const text = buildText(article);
    const rt = new RichText({ text });
    try {
      await rt.detectFacets(this.#agent);
    } catch (e) {
      console.warn('BlueskyPoster: Failed to detect facets. This might happen if agent is not logged in yet or due to text content:', e);
    }

    try {
      await this.#agent.post({ text: rt.text, facets: rt.facets });
      console.log('BlueskyPoster: Bluesky post successful.');
    } catch (e: any) {
      console.error('BlueskyPoster: Failed to post to Bluesky:', e.message);
      throw e;
    }
  }

  async login(params: { identifier: string; password: string; service?: string }): Promise<void> {
    console.log(`BlueskyPoster: Attempting to log in for ${params.identifier}`);
    if (params.service && params.service !== this.#agent.service.toString()) {
      console.log(`BlueskyPoster: Service URL changed. Re-initializing agent to ${params.service}`);
      this.#agent = new AtpAgent({ service: params.service });
    }
    try {
      await this.#agent.login({ identifier: params.identifier, password: params.password });
      console.log('BlueskyPoster: Login successful.');
    } catch (e: any) {
      console.error('BlueskyPoster: Login failed:', e.message);
      throw e;
    }
  }
} 
